import { Check, ChevronLeft, ChevronRight, Inbox, Star, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { borrarDatosLocales } from './datosLocales';
import { NavLink, useSearchParams } from 'react-router-dom';
import { favoritos, useEsFavorito, type Favorito } from './favoritos';
import { diasHasta, hace } from './formato';

/** Tono por estado (licitación u OC). Se muestra como un punto + texto, nunca solo color. */
const TONO: Record<string, string> = {
  Publicada: 'verde',
  Aceptada: 'verde',
  'Recepción conforme': 'verde',
  Adjudicada: 'azul',
  'Enviada a proveedor': 'azul',
  Cerrada: 'gris',
  'Pendiente de recepcionar': 'ambar',
  Suspendida: 'ambar',
  Desierta: 'rojo',
  Revocada: 'rojo',
  Cancelada: 'rojo',
};

export function Estado({ nombre }: { nombre?: string }) {
  if (!nombre) return null;
  return (
    <span className={`estado estado--${TONO[nombre] ?? 'gris'}`}>
      <i aria-hidden />
      {nombre}
    </span>
  );
}

/** Días que faltan para el cierre: el dato que decide si alcanzas a postular. */
export function Plazo({ cierre, abierta, grande }: { cierre?: string | null; abierta: boolean; grande?: boolean }) {
  const d = abierta ? diasHasta(cierre) : null;
  const clase = `plazo ${grande ? 'plazo--grande' : ''}`;
  if (d == null || d < 0) {
    return (
      <div className={`${clase} plazo--cerrado`} aria-label="Sin plazo vigente">
        <strong aria-hidden>—</strong>
        <span>cerrada</span>
      </div>
    );
  }
  const tono = d <= 1 ? 'rojo' : d <= 3 ? 'ambar' : '';
  const texto = d === 0 ? 'Cierra hoy' : `Cierra en ${d} día${d === 1 ? '' : 's'}`;
  return (
    <div className={`${clase} ${tono ? `plazo--${tono}` : ''}`} aria-label={texto} title={texto}>
      <strong aria-hidden>{d === 0 ? 'Hoy' : d}</strong>
      <span aria-hidden>{d === 0 ? 'cierra' : d === 1 ? 'día' : 'días'}</span>
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="cargando" role="status">
      <span className="spinner" aria-hidden /> {texto}
    </div>
  );
}

/** Filas de relleno mientras llega la primera respuesta: reserva el espacio y evita saltos. */
export function Esqueleto({ filas = 6, texto = 'Cargando…' }: { filas?: number; texto?: string }) {
  return (
    <div role="status">
      <span className="sr-only">
        {texto}
      </span>
      <ul className="libro esqueleto" aria-hidden>
        {Array.from({ length: filas }, (_, i) => (
          <li className="fila" key={i}>
            <b />
            <div>
              <b style={{ width: '30%' }} />
              <b style={{ width: `${55 + ((i * 17) % 35)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ErrorCaja({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
  return (
    <div className="aviso aviso--error" role="alert">
      <strong>No se pudo cargar.</strong> {msg}
      {reintentar && (
        <button className="btn btn--texto" onClick={reintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return (
    <div className="vacio">
      <Inbox size={28} strokeWidth={1.5} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function Paginacion({ total, pagina, porPagina }: { total: number; pagina: number; porPagina: number }) {
  const [sp, setSp] = useSearchParams();
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  const ir = (p: number) => {
    const n = new URLSearchParams(sp);
    n.set('pagina', String(p));
    setSp(n);
    window.scrollTo({ top: 0 });
  };
  return (
    <nav className="paginacion" aria-label="Paginación">
      <button className="btn" disabled={pagina <= 1} onClick={() => ir(pagina - 1)}>
        <ChevronLeft size={16} aria-hidden /> Anterior
      </button>
      <span>
        {pagina} / {paginas}
      </span>
      <button className="btn" disabled={pagina >= paginas} onClick={() => ir(pagina + 1)}>
        Siguiente <ChevronRight size={16} aria-hidden />
      </button>
    </nav>
  );
}

export function MetaResultados({ total, actualizado, desdeCache }: { total: number; actualizado: string; desdeCache: boolean }) {
  return (
    <p className="meta" aria-live="polite">
      <strong>{total.toLocaleString('es-CL')}</strong> resultado{total === 1 ? '' : 's'} · datos {hace(actualizado)}
      {desdeCache && <span title="Respuesta servida desde la caché del servidor"> · caché</span>}
    </p>
  );
}

export function BotonFavorito(props: Omit<Favorito, 'agregado'>) {
  const activo = useEsFavorito(props.tipo, props.codigo);
  const etiqueta = activo ? 'Quitar de guardadas' : 'Guardar para seguirla';
  return (
    <button
      className={`favorito ${activo ? 'favorito--activo' : ''}`}
      aria-pressed={activo}
      aria-label={`${etiqueta}: ${props.codigo}`}
      title={etiqueta}
      onClick={() => favoritos.alternar(props)}
    >
      <Star size={20} strokeWidth={1.75} fill={activo ? 'currentColor' : 'none'} aria-hidden />
    </button>
  );
}

export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="dato">
      <dt>{etiqueta}</dt>
      <dd>{children ?? '—'}</dd>
    </div>
  );
}

/** Cambia entre las dos formas de buscar empresas (proveedores por RUT / organismos compradores). */
export function SelectorEmpresas() {
  return (
    <nav className="selector" aria-label="Tipo de empresa">
      <NavLink to="/proveedores" className={({ isActive }) => (isActive ? 'activo' : '')}>
        Proveedores
      </NavLink>
      <NavLink to="/compradores" className={({ isActive }) => (isActive ? 'activo' : '')}>
        Organismos
      </NavLink>
    </nav>
  );
}

/** Hook para leer/escribir filtros en la URL (así los enlaces se pueden compartir). */
export function useFiltrosUrl<T extends Record<string, string>>(defaults: T) {
  const [sp, setSp] = useSearchParams();
  const valores = Object.fromEntries(Object.keys(defaults).map((k) => [k, sp.get(k) ?? defaults[k]])) as T;
  const pagina = Math.max(1, Number(sp.get('pagina')) || 1);
  const activos = Object.keys(defaults).filter((k) => k !== 'q' && valores[k] && valores[k] !== defaults[k]).length;
  const aplicar = (nuevos: Partial<T>) => {
    const n = new URLSearchParams();
    const todos = { ...valores, ...nuevos };
    for (const [k, v] of Object.entries(todos)) if (v && v !== defaults[k]) n.set(k, v);
    setSp(n); // al cambiar filtros vuelve a la página 1
  };
  return { valores, pagina, aplicar, activos };
}

/** Borra los datos que la app guardó en el dispositivo. Pide confirmación en un segundo toque. */
export function BorrarDatosLocales() {
  const [fase, setFase] = useState<'inicio' | 'confirmar' | 'listo'>('inicio');
  if (fase === 'listo') {
    return (
      <p className="confirmado" role="status">
        <Check size={16} aria-hidden /> Datos de este dispositivo borrados.
      </p>
    );
  }
  if (fase === 'confirmar') {
    return (
      <div className="confirmar" role="group" aria-label="Confirmar borrado">
        <span>Se borrarán tus guardadas y las consultas guardadas sin conexión.</span>
        <button
          className="btn btn--peligro"
          onClick={async () => {
            await borrarDatosLocales();
            setFase('listo');
          }}
        >
          Sí, borrar
        </button>
        <button className="btn btn--texto" onClick={() => setFase('inicio')}>
          Cancelar
        </button>
      </div>
    );
  }
  return (
    <button className="btn" onClick={() => setFase('confirmar')}>
      <Trash2 size={16} aria-hidden /> Borrar datos de este dispositivo
    </button>
  );
}
