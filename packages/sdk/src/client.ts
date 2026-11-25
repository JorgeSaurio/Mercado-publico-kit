import { MP_BASE_URL, MP_DAILY_LIMIT } from './constants.js';
import type { EstadoLicitacion, EstadoOrdenCompra } from './constants.js';
import { CuotaAgotadaError, MercadoPublicoError, esErrorTransitorio } from './errors.js';
import type {
  Empresa,
  FiltrosListado,
  Licitacion,
  OrdenCompra,
  RespuestaEmpresas,
  RespuestaListado,
} from './types.js';
import { esperar, formatearFechaMP, formatearRut, hoyEnChile, validarRut } from './utils.js';

export interface OpcionesCliente {
  /** Ticket personal entregado por ChileCompra. Mantenlo siempre en el servidor. */
  ticket: string;
  baseUrl?: string;
  /** Pausa mínima entre peticiones consecutivas (ms). Por defecto 250. */
  intervaloMinimoMs?: number;
  /** Tiempo máximo por petición (ms). Por defecto 30 s (las listas grandes tardan). */
  timeoutMs?: number;
  /** Reintentos ante errores transitorios. Por defecto 3. */
  reintentos?: number;
  /** Límite diario de peticiones que el cliente se permite hacer. Por defecto 10.000. */
  limiteDiario?: number;
  /** Implementación de fetch (útil para tests o entornos sin fetch global). */
  fetch?: typeof fetch;
  /** Se llama después de cada petición real a la API (para métricas/logs). */
  onPeticion?: (info: { url: string; ms: number; ok: boolean; intento: number }) => void;
}

export interface EstadoCuota {
  dia: string;
  usadas: number;
  limite: number;
  restantes: number;
}

/**
 * Cliente para la API de Mercado Público.
 *
 * - Serializa todas las peticiones (la API rechaza peticiones simultáneas del mismo ticket).
 * - Respeta un intervalo mínimo entre llamadas.
 * - Reintenta con backoff exponencial los errores transitorios.
 * - Lleva la cuenta de la cuota diaria (se reinicia con el día en Chile).
 */
export class MercadoPublicoClient {
  private readonly ticket: string;
  private readonly baseUrl: string;
  private readonly intervaloMinimoMs: number;
  private readonly timeoutMs: number;
  private readonly reintentos: number;
  private readonly limiteDiario: number;
  private readonly fetchImpl: typeof fetch;
  private readonly onPeticion?: OpcionesCliente['onPeticion'];

  private cola: Promise<unknown> = Promise.resolve();
  private ultimaPeticion = 0;
  private cuota = { dia: hoyEnChile(), usadas: 0 };

  constructor(opciones: OpcionesCliente) {
    if (!opciones.ticket) {
      throw new Error('Falta el ticket de Mercado Público (solicítalo en https://www.chilecompra.cl/api/).');
    }
    this.ticket = opciones.ticket;
    this.baseUrl = (opciones.baseUrl ?? MP_BASE_URL).replace(/\/$/, '');
    this.intervaloMinimoMs = opciones.intervaloMinimoMs ?? 250;
    this.timeoutMs = opciones.timeoutMs ?? 30_000;
    this.reintentos = opciones.reintentos ?? 3;
    this.limiteDiario = opciones.limiteDiario ?? MP_DAILY_LIMIT;
    this.fetchImpl = opciones.fetch ?? globalThis.fetch.bind(globalThis);
    this.onPeticion = opciones.onPeticion;
  }

  // ─── Licitaciones ────────────────────────────────────────────────

  /** Detalle completo de una licitación por su código (p. ej. '1509-5-L114'). Devuelve null si no existe. */
  async obtenerLicitacion(codigo: string): Promise<Licitacion | null> {
    const r = await this.get<RespuestaListado<Licitacion>>('licitaciones.json', { codigo });
    return r.Listado?.[0] ?? null;
  }

  /** Lista de licitaciones (información básica) según fecha, estado, organismo o proveedor. */
  async listarLicitaciones(filtros: FiltrosListado<EstadoLicitacion> = {}): Promise<RespuestaListado<Licitacion>> {
    return this.get('licitaciones.json', this.paramsListado(filtros));
  }

  /** Todas las licitaciones publicadas a la fecha (respuesta grande: conviene cachearla). */
  async licitacionesActivas(): Promise<RespuestaListado<Licitacion>> {
    return this.get('licitaciones.json', { estado: 'activas' });
  }

  // ─── Órdenes de compra ───────────────────────────────────────────

  /** Detalle completo de una orden de compra por su código (p. ej. '2097-241-SE14'). */
  async obtenerOrdenCompra(codigo: string): Promise<OrdenCompra | null> {
    const r = await this.get<RespuestaListado<OrdenCompra>>('ordenesdecompra.json', { codigo });
    return r.Listado?.[0] ?? null;
  }

  /** Lista de órdenes de compra. Sin fecha ni estado, consulta todas las del día actual. */
  async listarOrdenesCompra(
    filtros: FiltrosListado<EstadoOrdenCompra> = {},
  ): Promise<RespuestaListado<OrdenCompra>> {
    const params = this.paramsListado(filtros);
    if (!params.estado && !params.fecha) params.estado = 'todos';
    return this.get('ordenesdecompra.json', params);
  }

  // ─── Empresas ────────────────────────────────────────────────────

  /**
   * Busca el código de proveedor a partir del RUT (acepta cualquier formato;
   * se envía con puntos y guion como exige la API). Devuelve null si no está registrado.
   */
  async buscarProveedor(rut: string): Promise<Empresa | null> {
    if (!validarRut(rut)) throw new MercadoPublicoError(`RUT inválido: ${rut}`, { status: 400 });
    const r = await this.get<RespuestaEmpresas>('Empresas/BuscarProveedor', {
      rutempresaproveedor: formatearRut(rut).toLowerCase(),
    });
    return r.listaEmpresas?.[0] ?? null;
  }

  /** Lista completa de organismos compradores (respuesta grande y estable: cachéala por horas). */
  async buscarCompradores(): Promise<Empresa[]> {
    const r = await this.get<RespuestaEmpresas>('Empresas/BuscarComprador', {});
    return r.listaEmpresas ?? [];
  }

  // ─── Cuota ───────────────────────────────────────────────────────

  estadoCuota(): EstadoCuota {
    this.renovarCuotaSiCambioDia();
    return {
      dia: this.cuota.dia,
      usadas: this.cuota.usadas,
      limite: this.limiteDiario,
      restantes: Math.max(0, this.limiteDiario - this.cuota.usadas),
    };
  }

  // ─── Núcleo HTTP ─────────────────────────────────────────────────

  private paramsListado(f: FiltrosListado<string>): Record<string, string> {
    const p: Record<string, string> = {};
    if (f.fecha) p.fecha = formatearFechaMP(f.fecha);
    if (f.estado) p.estado = f.estado;
    if (f.codigoOrganismo != null && f.codigoOrganismo !== '') p.CodigoOrganismo = String(f.codigoOrganismo);
    if (f.codigoProveedor != null && f.codigoProveedor !== '') p.CodigoProveedor = String(f.codigoProveedor);
    if ((p.CodigoOrganismo || p.CodigoProveedor) && !p.fecha) {
      // La API exige fecha al filtrar por organismo/proveedor
      p.fecha = formatearFechaMP(hoyEnChile());
    }
    return p;
  }

  private renovarCuotaSiCambioDia() {
    const hoy = hoyEnChile();
    if (hoy !== this.cuota.dia) this.cuota = { dia: hoy, usadas: 0 };
  }

  /** Encola la petición para que nunca haya dos en vuelo al mismo tiempo. */
  private get<T>(ruta: string, params: Record<string, string>): Promise<T> {
    const tarea = this.cola.then(() => this.ejecutarConReintentos<T>(ruta, params));
    // La cola sigue aunque esta tarea falle
    this.cola = tarea.catch(() => undefined);
    return tarea;
  }

  private async ejecutarConReintentos<T>(ruta: string, params: Record<string, string>): Promise<T> {
    let ultimoError: unknown;
    for (let intento = 0; intento <= this.reintentos; intento++) {
      try {
        return await this.ejecutar<T>(ruta, params, intento);
      } catch (e) {
        ultimoError = e;
        const reintentable = e instanceof MercadoPublicoError && e.reintentable;
        if (!reintentable || intento === this.reintentos) throw e;
        // backoff exponencial con jitter: ~0.5s, 1s, 2s…
        await esperar(500 * 2 ** intento + Math.random() * 250);
      }
    }
    throw ultimoError;
  }

  private async ejecutar<T>(ruta: string, params: Record<string, string>, intento: number): Promise<T> {
    this.renovarCuotaSiCambioDia();
    if (this.cuota.usadas >= this.limiteDiario) throw new CuotaAgotadaError(this.limiteDiario);

    const espera = this.ultimaPeticion + this.intervaloMinimoMs - Date.now();
    if (espera > 0) await esperar(espera);

    const url = new URL(`${this.baseUrl}/${ruta}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('ticket', this.ticket);
    const urlLog = url.toString().replace(/([?&]ticket=)[^&]*/i, '$1***');

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    const t0 = Date.now();
    this.cuota.usadas++;
    let ok = false;

    try {
      let res: Response;
      try {
        res = await this.fetchImpl(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      } catch (e) {
        const abortado = (e as Error)?.name === 'AbortError';
        throw new MercadoPublicoError(
          abortado ? `Tiempo de espera agotado (${this.timeoutMs} ms)` : 'No se pudo conectar con la API de Mercado Público',
          { reintentable: true, cause: e },
        );
      }

      const texto = await res.text();
      let cuerpo: any;
      try {
        cuerpo = texto ? JSON.parse(texto) : {};
      } catch {
        throw new MercadoPublicoError(`Respuesta no válida de la API (HTTP ${res.status})`, {
          status: res.status,
          reintentable: res.status >= 500,
        });
      }

      // La API informa errores como { Codigo, Mensaje }, a veces con HTTP 200 y otras con 4xx/5xx
      if (cuerpo && typeof cuerpo === 'object' && 'Mensaje' in cuerpo && !('Listado' in cuerpo) && !('listaEmpresas' in cuerpo)) {
        const codigo = Number(cuerpo.Codigo) || undefined;
        // La API a veces repite el ticket en el mensaje: se oculta para que no llegue a logs ni a quien capture el error
        const mensaje = String(cuerpo.Mensaje).replaceAll(this.ticket, '***');
        throw new MercadoPublicoError(mensaje, {
          codigo,
          status: res.ok ? 502 : res.status,
          reintentable: esErrorTransitorio(codigo, mensaje) || res.status >= 500,
        });
      }

      if (!res.ok) {
        throw new MercadoPublicoError(`Error HTTP ${res.status} de la API de Mercado Público`, {
          status: res.status,
          reintentable: res.status >= 500 || res.status === 429,
        });
      }

      ok = true;
      return cuerpo as T;
    } finally {
      clearTimeout(timer);
      this.ultimaPeticion = Date.now();
      this.onPeticion?.({ url: urlLog, ms: Date.now() - t0, ok, intento });
    }
  }
}
