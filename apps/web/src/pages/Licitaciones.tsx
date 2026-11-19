import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ESTADOS_LICITACION, ETIQUETAS_ESTADO_LICITACION, hoyEnChile } from '@mp/sdk';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { BotonFavorito, Cargando, ErrorCaja, Estado, MetaResultados, Paginacion, Vacio, useFiltrosUrl } from '../components';
import { diasHasta, fecha } from '../formato';

const POR_PAGINA = 25;

export default function Licitaciones() {
  const { valores: f, pagina, aplicar } = useFiltrosUrl({
    estado: 'activas',
    fecha: '',
    organismo: '',
    proveedor: '',
    q: '',
    orden: 'cierre_asc',
  });

  const consulta = useQuery({
    queryKey: ['licitaciones', f, pagina],
    queryFn: () => api.licitaciones({ ...f, pagina, porPagina: POR_PAGINA }),
    placeholderData: keepPreviousData,
  });

  return (
    <section>
      <header className="encabezado">
        <h1>Licitaciones</h1>
        <p>Busca procesos de compra publicados por organismos del Estado.</p>
      </header>

      <form
        className="filtros"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          aplicar(Object.fromEntries(d.entries()) as Record<string, string>);
        }}
      >
        <label className="campo campo--ancho">
          <span>Buscar</span>
          <input name="q" type="search" defaultValue={f.q} placeholder="Nombre o código, ej: computadores" key={`q-${f.q}`} />
        </label>
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
        <input type="hidden" name="proveedor" value={f.proveedor} />
        <div className="filtros__acciones">
          <button className="btn btn--primario" type="submit">
            Buscar
          </button>
          <button
            className="btn btn--texto"
            type="button"
            onClick={() => aplicar({ estado: 'activas', fecha: '', organismo: '', proveedor: '', q: '', orden: 'cierre_asc' })}
          >
            Limpiar
          </button>
        </div>
      </form>

      {f.proveedor && (
        <p className="chip">
          Filtrando por proveedor {f.proveedor}{' '}
          <button className="btn btn--texto" onClick={() => aplicar({ proveedor: '' })}>
            ✕
          </button>
        </p>
      )}

      {consulta.isPending && <Cargando texto="Consultando Mercado Público…" />}
      {consulta.isError && <ErrorCaja error={consulta.error} reintentar={() => consulta.refetch()} />}
      {consulta.data && (
        <>
          <MetaResultados {...consulta.data.meta} total={consulta.data.total} />
          {consulta.data.items.length === 0 ? (
            <Vacio>No hay licitaciones con estos filtros. Prueba otra fecha o estado.</Vacio>
          ) : (
            <ul className={`lista ${consulta.isPlaceholderData ? 'lista--cargando' : ''}`}>
              {consulta.data.items.map((l) => {
                const dias = l.CodigoEstado === 5 ? diasHasta(l.FechaCierre) : null;
                return (
                  <li key={l.CodigoExterno}>
                    <Link to={`/licitaciones/${encodeURIComponent(l.CodigoExterno)}`} className="tarjeta">
                      <div className="tarjeta__cuerpo">
                        <div className="tarjeta__fila">
                          <code className="codigo">{l.CodigoExterno}</code>
                          <Estado nombre={l.EstadoNombre} />
                          {dias != null && dias >= 0 && dias <= 3 && (
                            <span className="chip chip--rojo">{dias === 0 ? 'Cierra hoy' : `Cierra en ${dias} día${dias > 1 ? 's' : ''}`}</span>
                          )}
                        </div>
                        <h3>{l.Nombre}</h3>
                        <small>Cierre: {fecha(l.FechaCierre)}</small>
                      </div>
                      <BotonFavorito tipo="licitacion" codigo={l.CodigoExterno} nombre={l.Nombre} extra={l.FechaCierre ?? undefined} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Paginacion total={consulta.data.total} pagina={pagina} porPagina={POR_PAGINA} />
        </>
      )}
    </section>
  );
}
