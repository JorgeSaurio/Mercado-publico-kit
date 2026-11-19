import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '');
  const backend = env.API_PROXY_TARGET || `http://localhost:${env.PORT || 3001}`;

  return {
    envDir: '../../',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'Mercado Público Kit',
          short_name: 'MP Kit',
          description: 'Explora licitaciones y órdenes de compra del Estado de Chile',
          lang: 'es-CL',
          theme_color: '#0b3c5d',
          background_color: '#f5f7fa',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Respuestas de la API: primero red, si falla usa lo último guardado (sirve offline)
          runtimeCaching: [
            {
              // No se guardan en el dispositivo las búsquedas por RUT (posible dato personal) ni el estado del servidor
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/api/v1/') &&
                !url.pathname.startsWith('/api/v1/proveedores/') &&
                url.pathname !== '/api/v1/estado',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'mp-api',
                networkTimeoutSeconds: 8,
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
          ],
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: { '/api': backend },
    },
  };
});
