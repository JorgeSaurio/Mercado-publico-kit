# Mercado Público Kit 🇨🇱

Proyecto completo para trabajar con la **API pública de Mercado Público (ChileCompra)** y llevarla a una **web** o a una **app móvil**.

```
mercado-publico-kit/
├── packages/sdk/     → Cliente TypeScript tipado de la API oficial (reutilizable en cualquier proyecto Node)
├── apps/api/         → Backend seguro: oculta el ticket, cachea, controla la cuota y expone una API REST limpia
├── apps/web/         → Web React instalable (PWA) + empaquetado nativo Android/iOS con Capacitor
├── docs/             → Guía de integración (React Native, Flutter, otros clientes) y despliegue
├── Dockerfile        → Imagen única backend + web
└── docker-compose.yml
```

## ¿Por qué un backend y no llamar a la API directamente desde la app?

La API oficial tiene restricciones que hacen inviable llamarla directo desde un navegador o un celular:

| Restricción de la API oficial | Cómo lo resuelve este kit |
|---|---|
| **Un ticket por persona**, personal y ligado a tu Clave Única | El ticket vive solo en el servidor (`.env`). La app nunca lo ve. |
| **10.000 peticiones diarias** por ticket, no ampliable | Caché por tipo de dato (histórico 12 h, hoy 10 min, organismos 24 h) + contador de cuota con freno antes del límite. |
| **Rechaza peticiones simultáneas** del mismo ticket | Cola serial con pausa mínima entre llamadas + reintentos con backoff. |
| Uso abusivo puede **bloquear el ticket o la IP** | Rate limit por cliente hacia tu backend y deduplicación: 100 usuarios pidiendo lo mismo = 1 llamada. |
| Fechas en `ddmmaaaa`, RUT con puntos y guion, estados con faltas de ortografía | El SDK normaliza todo: usas `YYYY-MM-DD`, RUT en cualquier formato y enums tipados. |
| Respuestas enormes (todas las licitaciones activas) | El backend pagina, filtra por texto (sin tildes) y ordena. |

## Inicio rápido

Requisitos: **Node.js 20+**.

```bash
npm install
cp .env.example .env

# Opción A: sin ticket, con datos de ejemplo ficticios
npm run dev:mock

# Opción B: con tu ticket real (edita MP_TICKET en .env)
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001/api/v1/salud
- Especificación OpenAPI: http://localhost:3001/api/v1/openapi.json (ábrela en editor.swagger.io o impórtala en Postman)

### Obtener el ticket

Se solicita en https://www.chilecompra.cl/api/ con Clave Única; llega por correo. Es uno por persona.

## Endpoints del backend (`/api/v1`)

| Método y ruta | Descripción | Parámetros |
|---|---|---|
| `GET /licitaciones` | Buscar licitaciones | `estado` (activas, publicada, cerrada, desierta, adjudicada, revocada, suspendida, todos), `fecha` (YYYY-MM-DD), `organismo`, `proveedor`, `q`, `orden` (cierre_asc, cierre_desc, nombre), `pagina`, `porPagina` (máx. 200) |
| `GET /licitaciones/:codigo` | Detalle completo (comprador, fechas, ítems, adjudicación) | — |
| `GET /ordenes-compra` | Buscar órdenes de compra | `estado` (enviadaproveedor, aceptada, cancelada, recepcionconforme, pendienterecepcion, …, todos), `fecha`, `organismo`, `proveedor`, `q`, `pagina`, `porPagina` |
| `GET /ordenes-compra/:codigo` | Detalle completo (montos, proveedor, ítems) | — |
| `GET /proveedores/:rut` | Código de proveedor a partir del RUT (valida dígito verificador) | — |
| `GET /compradores` | Buscar organismos compradores | `q`, `pagina`, `porPagina` |
| `GET /estado` | Porcentaje de cuota usado hoy. Con `Authorization: Bearer <ADMIN_TOKEN>`: cifras exactas y estadísticas de caché | — |
| `GET /salud` | Healthcheck | — |

Respuesta de los listados:

```json
{
  "total": 1873,
  "pagina": 1,
  "porPagina": 25,
  "items": [{ "CodigoExterno": "1509-5-L114", "Nombre": "…", "CodigoEstado": 5, "EstadoNombre": "Publicada", "FechaCierre": "2026-11-20T15:00:00" }],
  "meta": { "desdeCache": true, "actualizado": "2026-11-19T03:48:08.181Z", "fechaConsulta": null }
}
```

Errores: `{ "error": "mensaje legible", "detalles": [...] }` con 400 (parámetros), 404 (no existe), 429 (límite/cuota), 502 (falla de Mercado Público).

## La web / app

Funciones incluidas:

- **Inicio**: buscador universal (palabra clave o código pegado), KPIs del día y licitaciones que cierran en ≤ 3 días.
- **Licitaciones**: filtros por estado, fecha, organismo y texto; orden por cierre; aviso de "cierra pronto"; detalle con fechas clave, montos, ítems y adjudicación; enlace a la ficha oficial y botón compartir (usa la hoja nativa en móvil).
- **Órdenes de compra**: filtros y detalle con totales, comprador, proveedor e ítems; enlace cruzado a la licitación de origen.
- **Proveedores**: RUT → código → sus órdenes y licitaciones.
- **Compradores**: buscador de organismos con accesos directos.
- **Favoritos**: guardados en el dispositivo, con exportación a CSV (abre en Excel).
- Filtros en la URL (los enlaces se pueden compartir), modo oscuro automático, diseño móvil con barra inferior, funciona offline con lo último consultado.

### Instalar como app

**PWA (sin tiendas):** al abrir la web publicada con HTTPS, el navegador ofrece "Instalar app" / "Agregar a pantalla de inicio".

**App nativa Android/iOS con Capacitor:**

```bash
# 1. En .env, apunta a tu backend PÚBLICO (dentro de la app no hay proxy):
#    VITE_API_URL=https://api.tudominio.cl
# 2. Cambia appId en apps/web/capacitor.config.ts (ej: cl.tuempresa.licitaciones)
cd apps/web
npx cap add android          # o: npx cap add ios (requiere macOS + Xcode)
npm run cap:android          # compila, sincroniza y abre Android Studio
```

Agrega `capacitor://localhost` (iOS) y `https://localhost` (Android) a `CORS_ORIGINS` del backend.

## Usar solo el SDK

```ts
import { MercadoPublicoClient } from '@mp/sdk';

const mp = new MercadoPublicoClient({ ticket: process.env.MP_TICKET! });

const activas = await mp.licitacionesActivas();
const adjudicadas = await mp.listarLicitaciones({ fecha: '2026-11-18', estado: 'adjudicada' });
const lic = await mp.obtenerLicitacion('1509-5-L114');
const prov = await mp.buscarProveedor('76.543.210-3');
const ocs = await mp.listarOrdenesCompra({ fecha: '2026-11-18', codigoProveedor: prov?.CodigoEmpresa });
console.log(mp.estadoCuota()); // { dia, usadas, limite, restantes }
```

También incluye utilidades: `validarRut`, `formatearRut`, `calcularDv`, `formatearFechaMP`, `hoyEnChile`, y tablas de estados y tipos de licitación.

## Despliegue

```bash
docker compose up -d --build     # backend + web en http://127.0.0.1:3001 (publícalo con un proxy inverso con TLS)
```

Funciona en cualquier servicio que corra contenedores (Railway, Render, Fly.io, Cloud Run, un VPS con Docker). Usa una sola instancia o cambia la caché en memoria (`apps/api/src/cache.ts`) por Redis si escalas a varias: si no, cada instancia gasta cuota por separado. Más detalles en [`docs/INTEGRACION.md`](docs/INTEGRACION.md).

## Pruebas

```bash
npm test          # 34 pruebas: SDK (URL, reintentos, cola, cuota, RUT, ticket oculto) y backend (caché, validación, CORS, CSP, config, errores)
npm run typecheck
```

## Variables de entorno

| Variable | Por defecto | Descripción |
|---|---|---|
| `MP_TICKET` | — | Ticket de ChileCompra (obligatorio salvo en modo mock) |
| `MP_MOCK` | `false` | Usa datos de ejemplo ficticios |
| `PORT` | `3001` | Puerto del backend |
| `CORS_ORIGINS` | `http://localhost:5173,…` | Orígenes permitidos, separados por coma |
| `MP_DAILY_LIMIT` | `9500` | Freno de cuota diaria (el máximo oficial es 10.000) |
| `MP_MIN_INTERVAL_MS` | `250` | Pausa entre llamadas a la API oficial |
| `CLIENT_RATE_LIMIT_PER_MIN` | `120` | Peticiones por minuto por IP hacia tu backend |
| `WEB_DIST` | — | Carpeta del build web para servirlo desde el backend |
| `TRUST_PROXY` | — | Ponlo en `1` si estás detrás de un proxy/balanceador |
| `VITE_API_URL` | vacío | URL del backend para el frontend (necesaria en la app nativa) |

## Notas y límites conocidos

- La API oficial **no publica un esquema formal ni códigos de error**; los tipos se basan en los campos observados y todo campo de detalle se trata como opcional.
- Las búsquedas por fecha/estado devuelven **solo datos básicos** (código, nombre, estado, cierre). El detalle requiere una consulta por código (1 petición cada una), por eso el detalle se pide solo al abrirlo.
- Filtrar por organismo o proveedor **exige una fecha**; si no la indicas, se usa la de hoy.
- ChileCompra recomienda las descargas masivas entre 22:00 y 07:00, y puede modificar o suspender el servicio.
- La **Compra Ágil** tiene documentación aparte y no está incluida.
- Este proyecto no es un servicio oficial de ChileCompra.
