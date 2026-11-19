import compression from 'compression';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  CuotaAgotadaError,
  ESTADOS_LICITACION,
  ESTADOS_OC,
  MercadoPublicoError,
  hoyEnChile,
  validarRut,
} from '@mp/sdk';
import { openapi } from './openapi.js';
import { ServicioMercadoPublico, fechaValida } from './servicio.js';

export interface OpcionesApp {
  servicio: ServicioMercadoPublico;
  corsOrigins?: string[];
  rateLimitPorMinuto?: number;
  /** Consultas que NO salen de caché permitidas por IP y hora (protege la cuota diaria del ticket). */
  limiteConsultasNuevasPorHora?: number;
  webDist?: string;
  trustProxy?: string;
  modoMock?: boolean;
}

// ─── Esquemas de validación ───────────────────────────────────────

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato YYYY-MM-DD')
  .refine(fechaValida, 'Fecha inexistente')
  .refine((f) => f <= hoyEnChile(), 'La fecha no puede ser futura')
  .optional();
const codigoNum = z.string().regex(/^\d{1,10}$/, 'Debe ser un código numérico').optional();
const paginacion = {
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(200).default(25),
  q: z.string().trim().max(120).optional(),
};

const QueryLicitaciones = z.object({
  fecha,
  estado: z.enum(ESTADOS_LICITACION).optional(),
  organismo: codigoNum,
  proveedor: codigoNum,
  orden: z.enum(['cierre_asc', 'cierre_desc', 'nombre']).optional(),
  ...paginacion,
});

const QueryOrdenes = z.object({
  fecha,
  estado: z.enum(ESTADOS_OC).optional(),
  organismo: codigoNum,
  proveedor: codigoNum,
  orden: z.enum(['nombre']).optional(),
  ...paginacion,
});

const QueryCompradores = z.object(paginacion);

// Códigos tipo '1509-5-L114', '2097-241-SE14', '1057480-12-LE25'
const CodigoParam = z.string().regex(/^[A-Za-z0-9-]{3,40}$/, 'Código con formato inválido');

class ErrorHttp extends Error {
  constructor(readonly status: number, mensaje: string, readonly detalles?: unknown) {
    super(mensaje);
  }
}

function parsear<S extends z.ZodTypeAny>(esquema: S, datos: unknown): z.output<S> {
  const r = esquema.safeParse(datos);
  if (!r.success) {
    throw new ErrorHttp(400, 'Parámetros inválidos', r.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })));
  }
  return r.data;
}

/** Cabeceras de caché HTTP para que el navegador/CDN también ayuden a ahorrar cuota. */
function cacheHttp(res: Response, segundos: number, desdeCache: boolean, actualizado: Date | string) {
  res.set('Cache-Control', `public, max-age=${segundos}, stale-while-revalidate=${segundos * 2}`);
  res.set('X-Cache', desdeCache ? 'HIT' : 'MISS');
  res.set('X-Datos-Actualizados', new Date(actualizado).toISOString());
}

export function crearApp(o: OpcionesApp) {
  const { servicio } = o;
  const app = express();

  if (o.trustProxy) app.set('trust proxy', /^\d+$/.test(o.trustProxy) ? Number(o.trustProxy) : o.trustProxy);
  app.disable('x-powered-by');
  app.use(
    helmet({
      // CSP estricta para el frontend servido desde este mismo backend (mitiga XSS e inyección de scripts)
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // React usa style="..." en algunos componentes (barra de cuota)
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());

  const api = express.Router();
  api.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || !o.corsOrigins?.length || o.corsOrigins.includes(origin) || o.corsOrigins.includes('*')),
      methods: ['GET'],
      exposedHeaders: ['X-Cache', 'X-Datos-Actualizados'],
    }),
  );
  api.use(
    rateLimit({
      windowMs: 60_000,
      limit: o.rateLimitPorMinuto ?? 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Demasiadas peticiones. Espera un momento e intenta de nuevo.' },
    }),
  );

  /**
   * Límite por COSTO: solo cuentan las respuestas que no salieron de caché (las que gastan cuota
   * del ticket). Evita que un cliente agote las 10.000 peticiones diarias variando fecha/organismo/código.
   */
  const limiteCosto = rateLimit({
    windowMs: 60 * 60_000,
    limit: o.limiteConsultasNuevasPorHora ?? 150,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    // "exitosa" = no costó cuota (hit de caché o rechazada por validación antes de llegar a la API)
    requestWasSuccessful: (_req, res) => res.getHeader('X-Cache') === 'HIT' || res.statusCode === 400,
    message: { error: 'Has hecho demasiadas consultas nuevas en la última hora. Intenta más tarde.' },
  });

  // ─── Rutas ───────────────────────────────────────────────────────

  api.get('/salud', (_req, res) => {
    res.json({ ok: true, modo: o.modoMock ? 'mock' : 'real', hoy: hoyEnChile() });
  });

  api.get('/estado', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ modo: o.modoMock ? 'mock' : 'real', ...servicio.estado() });
  });

  api.use(['/licitaciones', '/ordenes-compra', '/proveedores'], limiteCosto);

  api.get('/licitaciones', async (req, res) => {
    const q = parsear(QueryLicitaciones, req.query);
    const r = await servicio.buscarLicitaciones(q);
    cacheHttp(res, 120, r.meta.desdeCache, r.meta.actualizado);
    res.json(r);
  });

  api.get('/licitaciones/:codigo', async (req, res) => {
    const codigo = parsear(CodigoParam, req.params.codigo);
    const { valor, desdeCache, actualizado } = await servicio.licitacion(codigo);
    if (!valor) throw new ErrorHttp(404, `No se encontró la licitación ${codigo}`);
    cacheHttp(res, 300, desdeCache, actualizado);
    res.json(valor);
  });

  api.get('/ordenes-compra', async (req, res) => {
    const q = parsear(QueryOrdenes, req.query);
    const r = await servicio.buscarOrdenes(q);
    cacheHttp(res, 120, r.meta.desdeCache, r.meta.actualizado);
    res.json(r);
  });

  api.get('/ordenes-compra/:codigo', async (req, res) => {
    const codigo = parsear(CodigoParam, req.params.codigo);
    const { valor, desdeCache, actualizado } = await servicio.ordenCompra(codigo);
    if (!valor) throw new ErrorHttp(404, `No se encontró la orden de compra ${codigo}`);
    cacheHttp(res, 300, desdeCache, actualizado);
    res.json(valor);
  });

  api.get('/proveedores/:rut', async (req, res) => {
    const rut = String(req.params.rut);
    if (!validarRut(rut)) throw new ErrorHttp(400, 'RUT inválido. Revisa el dígito verificador.');
    const { valor, desdeCache, actualizado } = await servicio.proveedor(rut);
    if (!valor) throw new ErrorHttp(404, 'El RUT no está registrado como proveedor en Mercado Público');
    cacheHttp(res, 3600, desdeCache, actualizado);
    res.json(valor);
  });

  api.get('/compradores', async (req, res) => {
    const q = parsear(QueryCompradores, req.query);
    const r = await servicio.compradores(q.q, q.pagina, q.porPagina);
    cacheHttp(res, 3600, r.meta.desdeCache, r.meta.actualizado);
    res.json(r);
  });

  api.get('/openapi.json', (_req, res) => {
    res.json(openapi);
  });

  api.use((_req, _res, next) => next(new ErrorHttp(404, 'Ruta no encontrada')));

  app.use('/api/v1', api);

  // Servir el frontend compilado desde el mismo backend (opcional, para despliegue en un solo servicio)
  if (o.webDist && existsSync(o.webDist)) {
    const dist = path.resolve(o.webDist);
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  // ─── Manejo de errores ───────────────────────────────────────────

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ErrorHttp) {
      res.status(err.status).json({ error: err.message, detalles: err.detalles });
      return;
    }
    if (err instanceof CuotaAgotadaError) {
      res.status(429).json({ error: 'Se agotó la cuota diaria de consultas a Mercado Público. Vuelve mañana.' });
      return;
    }
    if (err instanceof MercadoPublicoError) {
      // No reenviar el texto crudo de la API oficial: puede revelar el estado del ticket o datos internos.
      console.error(`[MP] error status=${err.status ?? '-'} codigo=${err.codigo ?? '-'}: ${err.message}`);
      const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 502;
      res.status(status).json({
        error: status === 502 ? 'Mercado Público no respondió correctamente. Intenta nuevamente en unos minutos.' : 'La consulta no pudo procesarse.',
      });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
