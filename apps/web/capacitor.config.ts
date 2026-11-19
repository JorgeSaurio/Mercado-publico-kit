import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración para empaquetar la web como app nativa Android/iOS con Capacitor.
 * Antes de compilar: define VITE_API_URL en .env con la URL PÚBLICA de tu backend
 * (p. ej. https://api.tudominio.cl) — dentro de la app no existe el proxy de Vite.
 */
const config: CapacitorConfig = {
  appId: 'cl.tuorganizacion.mercadopublico',
  appName: 'Mercado Público Kit',
  webDir: 'dist',
  android: { allowMixedContent: false },
  server: { androidScheme: 'https' },
};

export default config;
