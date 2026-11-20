import { QueryClient } from '@tanstack/react-query';
import { ErrorApi } from './api';
import { favoritos } from './favoritos';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      // No reintentar errores del cliente (400/404/429): solo fallos de red/servidor
      retry: (n, e) => n < 2 && !(e instanceof ErrorApi && e.status >= 400 && e.status < 500),
    },
  },
});

/**
 * Borra todo lo que la app guardó en este dispositivo: guardadas, respuestas de la API
 * guardadas para uso sin conexión y la caché en memoria. Los archivos de la app (código,
 * fuentes) se mantienen porque no contienen datos de la persona.
 */
export async function borrarDatosLocales() {
  favoritos.borrarTodo();
  queryClient.clear();
  if ('caches' in window) {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter((n) => n.startsWith('mp-api')).map((n) => caches.delete(n)));
  }
}
