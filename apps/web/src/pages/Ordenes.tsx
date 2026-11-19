import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ESTADOS_OC, ETIQUETAS_ESTADO_OC, hoyEnChile } from '@mp/sdk';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { BotonFavorito, Cargando, ErrorCaja, Estado, MetaResultados, Paginacion, Vacio, useFiltrosUrl } from '../components';

const POR_PAGINA = 25;

export default function Ordenes() {
  const { valores: f, pagina, aplicar } = useFiltrosUrl({
    estado: 'todos',
    fecha: '',
    organismo: '',
    proveedor: '',
    q: '',
  });

  const consulta = useQuery({
    queryKey: ['ordenes', f, pagina],
    queryFn: () => api.ordenes({ ...f, pagina, porPagina: POR_PAGINA }),
    placeholderData: keepPreviousData,
  });

  return (
    <section>
      <header className="encabezado">
        <h1>Órdenes de compra</h1>
        <p>Compras emitidas por los organismos públicos, por día y estado.</p>
      </header>

      <form
        className="filtros"
        onSubmit={(e) => {
          e.preventDefault();
          aplicar(Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>);
        }}
      >
        <label className="campo campo--ancho">
          <span>Buscar</span>
          <input name="q" type="search" defaultValue={f.q} placeholder="Nombre o código" key={`q-${f.q}`} />
        </label>
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
        <div className="filtros__acciones">
          <button className="btn btn--primario" type="submit">
            Buscar
          </button>
          <button className="btn btn--texto" type="button" onClick={() => aplicar({ estado: 'todos', fecha: '', organismo: '', proveedor: '', q: '' })}>
            Limpiar
          </button>
        </div>
      </form>

      {consulta.isPending && <Cargando texto="Consultando órdenes de compra…" />}
      {consulta.isError && <ErrorCaja error={consulta.error} reintentar={() => consulta.refetch()} />}
      {consulta.data && (
        <>
          <MetaResultados {...consulta.data.meta} total={consulta.data.total} />
          {consulta.data.items.length === 0 ? (
            <Vacio>No hay órdenes de compra con estos filtros.</Vacio>
          ) : (
            <ul className={`lista ${consulta.isPlaceholderData ? 'lista--cargando' : ''}`}>
              {consulta.data.items.map((o) => (
                <li key={o.Codigo}>
                  <Link to={`/ordenes/${encodeURIComponent(o.Codigo)}`} className="tarjeta">
                    <div className="tarjeta__cuerpo">
                      <div className="tarjeta__fila">
                        <code className="codigo">{o.Codigo}</code>
                        <Estado nombre={o.EstadoNombre} />
                      </div>
                      <h3>{o.Nombre}</h3>
                    </div>
                    <BotonFavorito tipo="oc" codigo={o.Codigo} nombre={o.Nombre} />
                  </Link>
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
