import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { favoritos, useEsFavorito, type Favorito } from './favoritos';
import { hace } from './formato';

/** Colores por estado (licitación u OC) para que se reconozcan de un vistazo. */
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
  return <span className={`estado estado--${TONO[nombre] ?? 'gris'}`}>{nombre}</span>;
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="cargando" role="status">
      <span className="spinner" aria-hidden /> {texto}
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
  return <div className="vacio">{children}</div>;
}

export function Paginacion({ total, pagina, porPagina }: { total: number; pagina: number; porPagina: number }) {
  const [sp, setSp] = useSearchParams();
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  const ir = (p: number) => {
    const n = new URLSearchParams(sp);
    n.set('pagina', String(p));
    setSp(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <nav className="paginacion" aria-label="Paginación">
      <button className="btn" disabled={pagina <= 1} onClick={() => ir(pagina - 1)}>
        ← Anterior
      </button>
      <span>
        Página {pagina} de {paginas}
      </span>
      <button className="btn" disabled={pagina >= paginas} onClick={() => ir(pagina + 1)}>
        Siguiente →
      </button>
    </nav>
  );
}

export function MetaResultados({ total, actualizado, desdeCache }: { total: number; actualizado: string; desdeCache: boolean }) {
  return (
    <p className="meta">
      <strong>{total.toLocaleString('es-CL')}</strong> resultado{total === 1 ? '' : 's'} · datos {hace(actualizado)}
      {desdeCache && <span title="Respuesta servida desde la caché del servidor"> · caché</span>}
    </p>
  );
}

export function BotonFavorito(props: Omit<Favorito, 'agregado'>) {
  const activo = useEsFavorito(props.tipo, props.codigo);
  return (
    <button
      className={`favorito ${activo ? 'favorito--activo' : ''}`}
      aria-pressed={activo}
      aria-label={activo ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      title={activo ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        favoritos.alternar(props);
      }}
    >
      {activo ? '★' : '☆'}
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

/** Hook para leer/escribir filtros en la URL (así los enlaces se pueden compartir). */
export function useFiltrosUrl<T extends Record<string, string>>(defaults: T) {
  const [sp, setSp] = useSearchParams();
  const valores = Object.fromEntries(Object.keys(defaults).map((k) => [k, sp.get(k) ?? defaults[k]])) as T;
  const pagina = Math.max(1, Number(sp.get('pagina')) || 1);
  const aplicar = (nuevos: Partial<T>) => {
    const n = new URLSearchParams();
    const todos = { ...valores, ...nuevos };
    for (const [k, v] of Object.entries(todos)) if (v && v !== defaults[k]) n.set(k, v);
    setSp(n); // al cambiar filtros vuelve a la página 1
  };
  return { valores, pagina, aplicar };
}
