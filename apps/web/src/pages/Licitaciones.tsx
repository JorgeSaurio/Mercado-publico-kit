import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ESTADOS_LICITACION, ETIQUETAS_ESTADO_LICITACION, hoyEnChile } from '@mp/sdk';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { BotonFavorito, Esqueleto, ErrorCaja, Estado, MetaResultados, Paginacion, Plazo, Vacio, useFiltrosUrl } from '../components';
import { fecha } from '../formato';

const POR_PAGINA = 25;
const DEFAULTS = { estado: 'activas', fecha: '', organismo: '', proveedor: '', q: '', orden: 'cierre_asc' };

export default function Licitaciones() {
  const { valores: f, pagina, aplicar, activos } = useFiltrosUrl(DEFAULTS);
  const [verFiltros, setVerFiltros] = useState(false);

  const consulta = useQuery({
    queryKey: ['licitaciones', f, pagina],
    queryFn: () => api.licitaciones({ ...f, pagina, porPagina: POR_PAGINA }),
    placeholderData: keepPreviousData,
  });

  return (
    <section>
      <header className="encabezado">
        <h1>Licitaciones</h1>
        <p>Procesos publicados por organismos del Estado. Por defecto, los abiertos que cierran antes.</p>
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
          <input name="q" type="search" defaultValue={f.q} placeholder="Nombre o código, ej: computadores" key={`q-${f.q}`} enterKeyHint="search" />
        </label>
        <div className={`filtros__extra ${verFiltros ? 'abierto' : ''}`} id="filtros-licitaciones">
          <label className="campo">
            <span>Estado</span>
            <select name="estado" defaultValue={f.estado} key={`e-${f.estado}`}>
              {ESTADOS_LICITACION.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETAS_ESTADO_LICITACION[e]}
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
            <input name="organismo" inputMode="numeric" pattern="\d*" defaultValue={f.organismo} placeholder="ej: 6945" key={`o-${f.organismo}`} />
          </label>
          <label className="campo">
            <span>Ordenar</span>
            <select name="orden" defaultValue={f.orden} key={`r-${f.orden}`}>
              <option value="cierre_asc">Cierre más próximo</option>
              <option value="cierre_desc">Cierre más lejano</option>
              <option value="nombre">Nombre A–Z</option>
            </select>
          </label>
        </div>
        <input type="hidden" name="proveedor" value={f.proveedor} />
        <div className="filtros__acciones">
          <button
            className="btn filtros__toggle"
            type="button"
            aria-expanded={verFiltros}
            aria-controls="filtros-licitaciones"
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

      {f.proveedor && (
        <p className="filtro-activo">
          Proveedor <code className="codigo">{f.proveedor}</code>
          <button className="btn btn--texto btn--icono" aria-label="Quitar filtro de proveedor" onClick={() => aplicar({ proveedor: '' })}>
            <X size={16} aria-hidden />
          </button>
        </p>
      )}

      {consulta.isPending && <Esqueleto texto="Consultando Mercado Público…" />}
      {consulta.isError && <ErrorCaja error={consulta.error} reintentar={() => consulta.refetch()} />}
      {consulta.data && (
        <>
          <MetaResultados {...consulta.data.meta} total={consulta.data.total} />
          {consulta.data.items.length === 0 ? (
            <Vacio>No hay licitaciones con estos filtros. Prueba otra fecha o estado.</Vacio>
          ) : (
            <ul className={`libro ${consulta.isPlaceholderData ? 'libro--cargando' : ''}`} aria-busy={consulta.isPlaceholderData}>
              {consulta.data.items.map((l) => (
                <li className="fila" key={l.CodigoExterno}>
                  <Link to={`/licitaciones/${encodeURIComponent(l.CodigoExterno)}`} className="fila__enlace">
                    <Plazo cierre={l.FechaCierre} abierta={l.CodigoEstado === 5} />
                    <div className="fila__cuerpo">
                      <div className="fila__linea">
                        <code className="codigo">{l.CodigoExterno}</code>
                        <Estado nombre={l.EstadoNombre} />
                      </div>
                      <h3>{l.Nombre}</h3>
                      <small>Cierre {fecha(l.FechaCierre)}</small>
                    </div>
                  </Link>
                  <div className="fila__accion">
                    <BotonFavorito tipo="licitacion" codigo={l.CodigoExterno} nombre={l.Nombre} extra={l.FechaCierre ?? undefined} />
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
