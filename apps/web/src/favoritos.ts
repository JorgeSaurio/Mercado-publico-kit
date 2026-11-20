import { useSyncExternalStore } from 'react';

/** Favoritos guardados en el dispositivo (localStorage). Funciona igual en web y en la app Capacitor. */
export interface Favorito {
  tipo: 'licitacion' | 'oc';
  codigo: string;
  nombre: string;
  extra?: string; // p. ej. fecha de cierre
  agregado: string;
}

const CLAVE = 'mp-favoritos-v1';
const oyentes = new Set<() => void>();

function leer(): Favorito[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
  } catch {
    return [];
  }
}

let cache = leer();

function guardar(lista: Favorito[]) {
  cache = lista;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    /* almacenamiento no disponible: se mantiene en memoria */
  }
  oyentes.forEach((f) => f());
}

window.addEventListener('storage', (e) => {
  if (e.key === CLAVE) {
    cache = leer();
    oyentes.forEach((f) => f());
  }
});

export const favoritos = {
  alternar(f: Omit<Favorito, 'agregado'>) {
    const existe = cache.some((x) => x.tipo === f.tipo && x.codigo === f.codigo);
    guardar(existe ? cache.filter((x) => !(x.tipo === f.tipo && x.codigo === f.codigo)) : [{ ...f, agregado: new Date().toISOString() }, ...cache]);
  },
  borrarTodo() {
    guardar([]);
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      /* sin almacenamiento */
    }
  },
  quitar(tipo: Favorito['tipo'], codigo: string) {
    guardar(cache.filter((x) => !(x.tipo === tipo && x.codigo === codigo)));
  },
};

export function useFavoritos() {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => cache,
  );
}

export function useEsFavorito(tipo: Favorito['tipo'], codigo: string) {
  return useFavoritos().some((f) => f.tipo === tipo && f.codigo === codigo);
}
