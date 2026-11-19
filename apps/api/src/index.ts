import { MercadoPublicoClient } from '@mp/sdk';
import { crearApp } from './app.js';
import { cargarConfig } from './config.js';
import type { FuenteDatos } from './fuente.js';
import { crearFuenteMock } from './mock.js';
import { ServicioMercadoPublico } from './servicio.js';

const cfg = cargarConfig();

const fuente: FuenteDatos = cfg.MP_MOCK
  ? crearFuenteMock()
  : new MercadoPublicoClient({
      ticket: cfg.MP_TICKET,
      intervaloMinimoMs: cfg.MP_MIN_INTERVAL_MS,
      limiteDiario: cfg.MP_DAILY_LIMIT,
      // El RUT puede ser de una persona natural (dato personal, Ley 21.719): no se escribe en los logs
      onPeticion: ({ url, ms, ok, intento }) =>
        console.log(
          `[MP] ${ok ? 'OK ' : 'ERR'} ${ms}ms${intento ? ` (reintento ${intento})` : ''} ${url.replace(/(rutempresaproveedor=)[^&]+/i, '$1***')}`,
        ),
    });

const app = crearApp({
  servicio: new ServicioMercadoPublico(fuente),
  corsOrigins: cfg.CORS_ORIGINS,
  rateLimitPorMinuto: cfg.CLIENT_RATE_LIMIT_PER_MIN,
  limiteConsultasNuevasPorHora: cfg.CLIENT_MISS_LIMIT_PER_HOUR,
  webDist: cfg.WEB_DIST,
  trustProxy: cfg.TRUST_PROXY,
  modoMock: cfg.MP_MOCK,
});

const server = app.listen(cfg.PORT, () => {
  console.log(`API Mercado Público escuchando en http://localhost:${cfg.PORT}/api/v1  (modo ${cfg.MP_MOCK ? 'MOCK' : 'REAL'})`);
});

for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(senal, () => server.close(() => process.exit(0)));
}
