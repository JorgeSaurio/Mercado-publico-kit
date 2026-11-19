import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ESTADOS_OC, ETIQUETAS_ESTADO_OC, hoyEnChile } from '@mp/sdk';
import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { BotonFavorito, Esqueleto, ErrorCaja, Estado, MetaResultados, Paginacion, Vacio, useFiltrosUrl } from '../components';

const POR_PAGINA = 25;
const DEFAULTS = { estado: 'todos', fecha: '', organismo: '', proveedor: '', q: '' };

export default function Ordenes() {
  const { valores: f, pagina, aplicar, activos } = useFiltrosUrl(DEFAULTS);
  const [verFiltros, setVerFiltros] = useState(false);

  const consulta = useQuery({
    queryKey: ['ordenes', f, pagina],
    queryFn: () => api.ordenes({ ...f, pagina, porPagina: POR_PAGINA }),
    placeholderData: keepPreviousData,
  });

  return (
    <section>
      <header className="encabezado">
        <h1>Órdenes de compra</h1>
        <p>Lo que los organismos públicos compraron, por día y estado. Útil para ver precios y quién vende qué.</p>
      </header>

      <form
        className="filtros"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          aplicar(Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>);
          setVerFiltros(false);
        }}
      >
        <label className="campo campo--ancho">
          <span>Buscar</span>
          <input name="q" type="search" defaultValue={f.q} placeholder="Nombre o código" key={`q-${f.q}`} enterKeyHint="search" />
        </label>
        <div className={`filtros__extra ${verFiltros ? 'abierto' : ''}`} id="filtros-ordenes">
          <label className="campo">
            <span>Estado</span>
            <select name="estado" defaultValue={f.estado} key={`e-${f.estado}`}>
              {ESTADOS_OC.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETAS_ESTADO_OC[e]}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Fecha</span>
            <input name="fecha" type="date" max={hoyEnChile()} defaultValue={f.fecha} key={`f-${f.fecha}`} />
          </label>
          <label className="campo">
            <span>Cód. organismo</span>
            <input name="organismo" inputMode="numeric" pattern="\d*" defaultValue={f.organismo} key={`o-${f.organismo}`} />
          </label>
          <label className="campo">
            <span>Cód. proveedor</span>
            <input name="proveedor" inputMode="numeric" pattern="\d*" defaultValue={f.proveedor} key={`p-${f.proveedor}`} />
          </label>
        </div>
        <div className="filtros__acciones">
          <button
            className="btn filtros__toggle"
            type="button"
            aria-expanded={verFiltros}
            aria-controls="filtros-ordenes"
            onClick={() => setVerFiltros((v) => !v)}
          >
            <SlidersHorizontal size={16} aria-hidden /> Filtros {activos > 0 && <span className="contador">{activos}</span>}
          </button>
          <button className="btn btn--primario" type="submit">
            Buscar
          </button>
          {activos > 0 && (
            <button className="btn btn--texto" type="button" onClick={() => aplicar(DEFAULTS)}>
              Limpiar
            </button>
          )}
        </div>
      </form>

      {consulta.isPending && <Esqueleto texto="Consultando órdenes de compra…" />}
      {consulta.isError && <ErrorCaja error={consulta.error} reintentar={() => consulta.refetch()} />}
      {consulta.data && (
        <>
          <MetaResultados {...consulta.data.meta} total={consulta.data.total} />
          {consulta.data.items.length === 0 ? (
            <Vacio>No hay órdenes de compra con estos filtros.</Vacio>
          ) : (
            <ul className={`libro ${consulta.isPlaceholderData ? 'libro--cargando' : ''}`} aria-busy={consulta.isPlaceholderData}>
              {consulta.data.items.map((o) => (
                <li className="fila fila--simple" key={o.Codigo}>
                  <Link to={`/ordenes/${encodeURIComponent(o.Codigo)}`} className="fila__enlace">
                    <div className="fila__cuerpo">
                      <div className="fila__linea">
                        <code className="codigo">{o.Codigo}</code>
                        <Estado nombre={o.EstadoNombre} />
                      </div>
                      <h3>{o.Nombre}</h3>
                    </div>
                  </Link>
                  <div className="fila__accion">
                    <BotonFavorito tipo="oc" codigo={o.Codigo} nombre={o.Nombre} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Paginacion total={consulta.data.total} pagina={pagina} porPagina={POR_PAGINA} />
        </>
      )}
    </section>
  );
}
