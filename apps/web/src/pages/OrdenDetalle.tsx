import { useQuery } from '@tanstack/react-query';
import { CODIGOS_ESTADO_OC } from '@mp/sdk';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { BotonFavorito, Cargando, Dato, ErrorCaja, Estado } from '../components';
import { dinero, fecha, numero, urlFichaOC } from '../formato';

export default function OrdenDetalle() {
  const { codigo = '' } = useParams();
  const navegar = useNavigate();
  const q = useQuery({ queryKey: ['orden', codigo], queryFn: () => api.orden(codigo) });

  if (q.isPending) return <Cargando texto="Cargando orden de compra…" />;
  if (q.isError) return <ErrorCaja error={q.error} reintentar={() => q.refetch()} />;
  const o = q.data;
  const moneda = o.TipoMoneda || 'CLP';
  const items = o.Items?.Listado ?? [];

  return (
    <article className="detalle">
      <button className="btn btn--texto volver" onClick={() => navegar(-1)}>
        ← Volver
      </button>

      <header className="detalle__cabecera">
        <div className="tarjeta__fila">
          <code className="codigo">{o.Codigo}</code>
          <Estado nombre={o.Estado ?? CODIGOS_ESTADO_OC[o.CodigoEstado]} />
          {o.Tipo && <span className="chip">{o.Tipo}</span>}
        </div>
        <h1>{o.Nombre}</h1>
        <div className="acciones">
          <BotonFavorito tipo="oc" codigo={o.Codigo} nombre={o.Nombre} />
          <a className="btn btn--primario" href={urlFichaOC(o.Codigo)} target="_blank" rel="noreferrer">
            Ver ficha oficial ↗
          </a>
        </div>
      </header>

      <div className="kpis">
        <div className="kpi">
          <span>Total</span>
          <strong>{dinero(o.Total, moneda)}</strong>
        </div>
        <div className="kpi">
          <span>Neto</span>
          <strong>{dinero(o.TotalNetoOC, moneda)}</strong>
        </div>
        <div className="kpi">
          <span>Impuestos</span>
          <strong>{dinero(o.Impuestos, moneda)}</strong>
        </div>
      </div>

      {o.Descripcion && <p className="descripcion">{o.Descripcion}</p>}

      <div className="rejilla">
        <section className="panel">
          <h2>Comprador</h2>
          <dl>
            <Dato etiqueta="Organismo">
              {o.Comprador?.CodigoOrganismo ? (
                <Link to={`/ordenes?organismo=${o.Comprador.CodigoOrganismo}`}>{o.Comprador.NombreOrganismo}</Link>
              ) : (
                o.Comprador?.NombreOrganismo
              )}
            </Dato>
            <Dato etiqueta="Unidad">{o.Comprador?.NombreUnidad}</Dato>
            <Dato etiqueta="RUT unidad">{o.Comprador?.RutUnidad}</Dato>
          </dl>
        </section>
        <section className="panel">
          <h2>Proveedor</h2>
          <dl>
            <Dato etiqueta="Nombre">
              {o.Proveedor?.Codigo ? <Link to={`/ordenes?proveedor=${o.Proveedor.Codigo}`}>{o.Proveedor.Nombre}</Link> : o.Proveedor?.Nombre}
            </Dato>
            <Dato etiqueta="RUT">{o.Proveedor?.RutSucursal}</Dato>
            <Dato etiqueta="Sucursal">{o.Proveedor?.NombreSucursal}</Dato>
            <Dato etiqueta="Comuna / Región">{[o.Proveedor?.Comuna, o.Proveedor?.Region].filter(Boolean).join(', ') || '—'}</Dato>
          </dl>
        </section>
        <section className="panel">
          <h2>Fechas y pago</h2>
          <dl>
            <Dato etiqueta="Creación">{fecha(o.Fechas?.FechaCreacion)}</Dato>
            <Dato etiqueta="Envío">{fecha(o.Fechas?.FechaEnvio)}</Dato>
            <Dato etiqueta="Aceptación">{fecha(o.Fechas?.FechaAceptacion)}</Dato>
            {o.Fechas?.FechaCancelacion && <Dato etiqueta="Cancelación">{fecha(o.Fechas.FechaCancelacion)}</Dato>}
            <Dato etiqueta="Forma de pago">{o.FormaPago}</Dato>
            <Dato etiqueta="Financiamiento">{o.Financiamiento}</Dato>
            {o.CodigoLicitacion && (
              <Dato etiqueta="Licitación asociada">
                <Link to={`/licitaciones/${encodeURIComponent(o.CodigoLicitacion)}`}>{o.CodigoLicitacion}</Link>
              </Dato>
            )}
          </dl>
        </section>
      </div>

      <section className="panel">
        <h2>Ítems ({items.length})</h2>
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Especificación</th>
                <th className="num">Cantidad</th>
                <th className="num">Precio neto</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.Correlativo ?? i}>
                  <td>
                    <strong>{it.Producto}</strong>
                    <div className="sutil">{it.Categoria}</div>
                  </td>
                  <td>
                    {it.EspecificacionComprador}
                    {it.EspecificacionProveedor && <div className="sutil">Proveedor: {it.EspecificacionProveedor}</div>}
                  </td>
                  <td className="num">
                    {numero(it.Cantidad)} {it.Unidad}
                  </td>
                  <td className="num">{dinero(it.PrecioNeto, it.Moneda || moneda)}</td>
                  <td className="num">{dinero(it.Total, it.Moneda || moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
