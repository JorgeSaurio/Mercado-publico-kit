import type { Empresa, Licitacion, OrdenCompra } from '@mp/sdk';

/**
 * Cliente del frontend. Habla SOLO con tu backend (nunca con api.mercadopublico.cl),
 * así el ticket queda protegido en el servidor.
 */
const BASE = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}/api/v1`;

export class ErrorApi extends Error {
  constructor(readonly status: number, mensaje: string) {
    super(mensaje);
  }
}

async function get<T>(ruta: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== '') qs.set(k, String(v));
  const url = `${BASE}${ruta}${qs.size ? `?${qs}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new ErrorApi(0, 'Sin conexión con el servidor. Revisa tu internet.');
  }
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErrorApi(res.status, cuerpo.error ?? `Error ${res.status}`);
  return cuerpo as T;
}

export interface Pagina<T> {
  total: number;
  pagina: number;
  porPagina: number;
  items: T[];
  meta: { desdeCache: boolean; actualizado: string; fechaConsulta: string | null };
}

export type LicitacionResumen = Licitacion & { EstadoNombre: string };
export type OrdenCompraResumen = OrdenCompra & { EstadoNombre: string };

export interface ParamsBusqueda {
  fecha?: string;
  estado?: string;
  organismo?: string;
  proveedor?: string;
  q?: string;
  orden?: string;
  pagina?: number;
  porPagina?: number;
}

export interface EstadoServidor {
  modo: 'mock' | 'real';
  /** Público: solo el porcentaje de la cuota diaria usado (el detalle exige token de administración). */
  cuota: { porcentaje: number };
}

export const api = {
  estado: () => get<EstadoServidor>('/estado'),
  licitaciones: (p: ParamsBusqueda) => get<Pagina<LicitacionResumen>>('/licitaciones', { ...p }),
  licitacion: (codigo: string) => get<Licitacion>(`/licitaciones/${encodeURIComponent(codigo)}`),
  ordenes: (p: ParamsBusqueda) => get<Pagina<OrdenCompraResumen>>('/ordenes-compra', { ...p }),
  orden: (codigo: string) => get<OrdenCompra>(`/ordenes-compra/${encodeURIComponent(codigo)}`),
  proveedor: (rut: string) => get<Empresa>(`/proveedores/${encodeURIComponent(rut)}`),
  compradores: (p: { q?: string; pagina?: number; porPagina?: number }) => get<Pagina<Empresa>>('/compradores', p),
};
