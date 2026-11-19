# Guía de integración

El backend (`apps/api`) es el punto único de acceso. Cualquier cliente —la web incluida, una app React Native, Flutter, Power BI, Excel o un script— consume `/api/v1` sin conocer el ticket.

```
[ Web / PWA ]──┐
[ App nativa ]─┼──► Tu backend /api/v1 ──(cola + caché + cuota)──► api.mercadopublico.cl
[ Otros ]──────┘         (ticket aquí)
```

## 1. Desde React Native / Expo

```ts
const API = 'https://api.tudominio.cl/api/v1';

export async function licitacionesActivas(pagina = 1, q = '') {
  const params = new URLSearchParams({ estado: 'activas', pagina: String(pagina), porPagina: '25' });
  if (q) params.set('q', q);
  const res = await fetch(`${API}/licitaciones?${params}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json(); // { total, pagina, porPagina, items, meta }
}
```

Puedes importar los tipos y constantes del SDK (`@mp/sdk`) para tener autocompletado: copia `packages/sdk/src/types.ts` y `constants.ts` o publica el paquete en un registro privado. No uses `MercadoPublicoClient` dentro de la app: expondría el ticket.

## 2. Desde Flutter (Dart)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

const api = 'https://api.tudominio.cl/api/v1';

Future<Map<String, dynamic>> detalleLicitacion(String codigo) async {
  final r = await http.get(Uri.parse('$api/licitaciones/${Uri.encodeComponent(codigo)}'));
  if (r.statusCode != 200) throw Exception(jsonDecode(r.body)['error']);
  return jsonDecode(r.body);
}
```

## 3. Desde Excel / Power BI / Google Sheets

- **Power BI / Excel (Power Query):** Obtener datos → Web → `https://api.tudominio.cl/api/v1/licitaciones?estado=adjudicada&fecha=2026-11-18&porPagina=200` → expandir `items`.
- **Google Sheets:** `=IMPORTDATA()` no lee JSON; usa Apps Script con `UrlFetchApp.fetch(url)` y `JSON.parse`.

## 4. Despliegue recomendado

| Escenario | Recomendación |
|---|---|
| Prueba o uso interno | `docker compose up -d` en un VPS, detrás de Nginx/Caddy con HTTPS |
| Sin administrar servidores | Railway, Render o Fly.io con el `Dockerfile` (1 instancia) |
| Web en CDN + API aparte | Publica `apps/web/dist` en Netlify/Vercel/Cloudflare Pages con `VITE_API_URL` apuntando al backend y agrega ese dominio a `CORS_ORIGINS` |

**Importante:** usa **una sola instancia** del backend, o reemplaza `CacheTTL` por Redis y lleva el contador de cuota en Redis (`INCR` con expiración diaria). Con varias instancias sin estado compartido se multiplican las llamadas y la cola anti-concurrencia deja de ser global, lo que provoca errores de "peticiones simultáneas".

## 5. Ideas para extender

- **Alertas:** un job nocturno (22:00–07:00, como recomienda ChileCompra) que revise licitaciones activas por palabras clave o rubros y envíe correo/push.
- **Histórico propio:** guardar cada día las licitaciones y OC en PostgreSQL para análisis (gasto por organismo, proveedores frecuentes, precios unitarios).
- **Autenticación:** si la app es para tu empresa, protege el backend con un API key o login (middleware antes del router `/api/v1`).
- **Datos masivos:** para análisis de años completos, usa los datos abiertos de ChileCompra (descargas masivas) en vez de la API, que está pensada para consultas puntuales.

## 6. Agregar un endpoint nuevo

1. Si es una ruta nueva de la API oficial, agrega el método en `packages/sdk/src/client.ts` usando `this.get(ruta, params)` (hereda cola, reintentos y cuota).
2. Agrégalo a `FuenteDatos` (`apps/api/src/fuente.ts`) y a la fuente de ejemplo (`mock.ts`).
3. Envuélvelo con caché en `servicio.ts` y expón la ruta con validación zod en `app.ts`.
4. Documenta en `openapi.ts` y agrega una prueba en `apps/api/test/app.test.ts`.
