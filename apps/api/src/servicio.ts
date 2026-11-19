import {
  CODIGOS_ESTADO_LICITACION,
  CODIGOS_ESTADO_OC,
  formatearFechaMP,
  hoyEnChile,
  limpiarRut,
  type EstadoLicitacion,
  type EstadoOrdenCompra,
  type Licitacion,
  type OrdenCompra,
} from '@mp/sdk';
import { CacheTTL } from './cache.js';
import type { FuenteDatos } from './fuente.js';

const MIN = 60_000;
const HORA = 60 * MIN;

/** Política de caché: lo histórico no cambia, lo de hoy sí. */
export const TTL = {
  detalle: 15 * MIN,
  listaHoy: 10 * MIN,
  listaHistorica: 12 * HORA,
  activas: 10 * MIN,
  compradores: 24 * HORA,
  proveedor: 24 * HORA,
};

export interface Pagina<T> {
  total: number;
  pagina: number;
  porPagina: number;
  items: T[];
  meta: { desdeCache: boolean; actualizado: string; fechaConsulta: string | null };
}

export interface FiltrosBusqueda<E extends string> {
  fecha?: string; // YYYY-MM-DD
  estado?: E;
  organismo?: string;
  proveedor?: string;
  q?: string;
  pagina: number;
  porPagina: number;
  orden?: 'cierre_asc' | 'cierre_desc' | 'nombre';
}

/** Normaliza texto para búsquedas sin tildes ni mayúsculas. */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function paginar<T>(items: T[], pagina: number, porPagina: number) {
  const inicio = (pagina - 1) * porPagina;
  return items.slice(inicio, inicio + porPagina);
}

export type LicitacionResumen = Licitacion & { EstadoNombre: string };
export type OrdenCompraResumen = OrdenCompra & { EstadoNombre: string };

export class ServicioMercadoPublico {
  readonly cache: CacheTTL;

  constructor(private readonly fuente: FuenteDatos, cache = new CacheTTL()) {
    this.cache = cache;
  }

  private ttlLista(fecha?: string) {
    return !fecha || fecha >= hoyEnChile() ? TTL.listaHoy : TTL.listaHistorica;
  }

  // ─── Licitaciones ────────────────────────────────────────────────

  async buscarLicitaciones(f: FiltrosBusqueda<EstadoLicitacion>): Promise<Pagina<LicitacionResumen>> {
    const soloActivas = f.estado === 'activas' && !f.fecha && !f.organismo && !f.proveedor;
    const clave = soloActivas
      ? 'lic:activas'
      : `lic:${f.fecha ?? 'hoy'}:${f.estado ?? ''}:${f.organismo ?? ''}:${f.proveedor ?? ''}`;
    const ttl = soloActivas ? TTL.activas : this.ttlLista(f.fecha);

    const { valor, desdeCache, actualizado } = await this.cache.obtener(clave, ttl, () =>
      soloActivas
        ? this.fuente.licitacionesActivas()
        : this.fuente.listarLicitaciones({
            fecha: f.fecha,
            estado: f.estado,
            codigoOrganismo: f.organismo,
            codigoProveedor: f.proveedor,
          }),
    );

    let items: LicitacionResumen[] = (valor.Listado ?? []).map((l) => ({
      ...l,
      EstadoNombre: CODIGOS_ESTADO_LICITACION[l.CodigoEstado] ?? `Estado ${l.CodigoEstado}`,
    }));

    if (f.q) {
      const terminos = norm(f.q).split(/\s+/).filter(Boolean);
      items = items.filter((l) => {
        const texto = norm(`${l.CodigoExterno} ${l.Nombre}`);
        return terminos.every((t) => texto.includes(t));
      });
    }

    const orden = f.orden ?? 'cierre_asc';
    items.sort((a, b) => {
      if (orden === 'nombre') return a.Nombre.localeCompare(b.Nombre, 'es');
      const ca = a.FechaCierre ?? '9999';
      const cb = b.FechaCierre ?? '9999';
      return orden === 'cierre_asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
    });

    return {
      total: items.length,
      pagina: f.pagina,
      porPagina: f.porPagina,
      items: paginar(items, f.pagina, f.porPagina),
      meta: { desdeCache, actualizado: actualizado.toISOString(), fechaConsulta: f.fecha ?? null },
    };
  }

  async licitacion(codigo: string) {
    return this.cache.obtener(`lic:det:${codigo}`, TTL.detalle, async () =>
      minimizarLicitacion(await this.fuente.obtenerLicitacion(codigo)),
    );
  }

  // ─── Órdenes de compra ───────────────────────────────────────────

  async buscarOrdenes(f: FiltrosBusqueda<EstadoOrdenCompra>): Promise<Pagina<OrdenCompraResumen>> {
    const clave = `oc:${f.fecha ?? 'hoy'}:${f.estado ?? ''}:${f.organismo ?? ''}:${f.proveedor ?? ''}`;
    const { valor, desdeCache, actualizado } = await this.cache.obtener(clave, this.ttlLista(f.fecha), () =>
      this.fuente.listarOrdenesCompra({
        fecha: f.fecha,
        estado: f.estado,
        codigoOrganismo: f.organismo,
        codigoProveedor: f.proveedor,
      }),
    );

    let items: OrdenCompraResumen[] = (valor.Listado ?? []).map((o) => ({
      ...o,
      EstadoNombre: CODIGOS_ESTADO_OC[o.CodigoEstado] ?? `Estado ${o.CodigoEstado}`,
    }));
    if (f.q) {
      const terminos = norm(f.q).split(/\s+/).filter(Boolean);
      items = items.filter((o) => terminos.every((t) => norm(`${o.Codigo} ${o.Nombre}`).includes(t)));
    }
    if (f.orden === 'nombre') items.sort((a, b) => a.Nombre.localeCompare(b.Nombre, 'es'));

    return {
      total: items.length,
      pagina: f.pagina,
      porPagina: f.porPagina,
      items: paginar(items, f.pagina, f.porPagina),
      meta: { desdeCache, actualizado: actualizado.toISOString(), fechaConsulta: f.fecha ?? null },
    };
  }

  async ordenCompra(codigo: string) {
    return this.cache.obtener(`oc:det:${codigo}`, TTL.detalle, async () =>
      minimizarOrden(await this.fuente.obtenerOrdenCompra(codigo)),
    );
  }

  // ─── Empresas ────────────────────────────────────────────────────

  async proveedor(rut: string) {
    return this.cache.obtener(`prov:${limpiarRut(rut)}`, TTL.proveedor, () => this.fuente.buscarProveedor(rut));
  }

  async compradores(q: string | undefined, pagina: number, porPagina: number) {
    const { valor, desdeCache, actualizado } = await this.cache.obtener('compradores', TTL.compradores, () =>
      this.fuente.buscarCompradores(),
    );
    let items = valor;
    if (q) {
      const terminos = norm(q).split(/\s+/).filter(Boolean);
      items = items.filter((c) => terminos.every((t) => norm(`${c.CodigoEmpresa} ${c.NombreEmpresa}`).includes(t)));
    }
    items = [...items].sort((a, b) => a.NombreEmpresa.localeCompare(b.NombreEmpresa, 'es'));
    return {
      total: items.length,
      pagina,
      porPagina,
      items: paginar(items, pagina, porPagina),
      meta: { desdeCache, actualizado: actualizado.toISOString(), fechaConsulta: null },
    };
  }

  estado() {
    return { cuota: this.fuente.estadoCuota(), cache: this.cache.estadisticas() };
  }
}

// ─── Minimización de datos personales (Ley 21.719, principio de proporcionalidad) ─────
//
// La API oficial entrega datos de contacto de funcionarios y de personas de contacto de
// proveedores (nombre, RUT, cargo, correo, teléfono). La app no los usa y, además, durante
// un proceso de compra la comunicación con el organismo debe hacerse por la plataforma
// (foro de preguntas), no por contacto directo. Se eliminan antes de cachear y responder.

const CAMPOS_PERSONALES_COMPRADOR = [
  'RutUsuario', 'CodigoUsuario', 'NombreUsuario', 'CargoUsuario',
  'NombreContacto', 'CargoContacto', 'FonoContacto', 'MailContacto',
] as const;
const CAMPOS_PERSONALES_LICITACION = [
  'NombreResponsablePago', 'EmailResponsablePago',
  'NombreResponsableContrato', 'EmailResponsableContrato', 'FonoResponsableContrato',
] as const;
const CAMPOS_PERSONALES_PROVEEDOR = ['NombreContacto', 'CargoContacto', 'FonoContacto', 'MailContacto'] as const;

function sinCampos<T extends object>(obj: T | undefined, campos: readonly string[]): T | undefined {
  if (!obj) return obj;
  const copia = { ...obj } as Record<string, unknown>;
  for (const c of campos) delete copia[c];
  return copia as T;
}

export function minimizarLicitacion(l: Licitacion | null): Licitacion | null {
  if (!l) return l;
  const r = sinCampos(l, CAMPOS_PERSONALES_LICITACION)!;
  return { ...r, Comprador: sinCampos(l.Comprador, CAMPOS_PERSONALES_COMPRADOR) };
}

export function minimizarOrden(o: OrdenCompra | null): OrdenCompra | null {
  if (!o) return o;
  return {
    ...o,
    Comprador: sinCampos(o.Comprador, CAMPOS_PERSONALES_COMPRADOR),
    Proveedor: sinCampos(o.Proveedor, CAMPOS_PERSONALES_PROVEEDOR),
  };
}

/** Valida que una fecha YYYY-MM-DD exista (reutiliza la validación del SDK). */
export function fechaValida(fecha: string) {
  try {
    formatearFechaMP(fecha);
    return true;
  } catch {
    return false;
  }
}
