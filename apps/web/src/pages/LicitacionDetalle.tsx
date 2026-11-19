import { useQuery } from '@tanstack/react-query';
import { CODIGOS_ESTADO_LICITACION, TIPOS_LICITACION } from '@mp/sdk';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { BotonFavorito, Cargando, Dato, ErrorCaja, Estado } from '../components';
import { diasHasta, dinero, fecha, numero, urlFichaLicitacion } from '../formato';

export default function LicitacionDetalle() {
  const { codigo = '' } = useParams();
  const navegar = useNavigate();
  const q = useQuery({ queryKey: ['licitacion', codigo], queryFn: () => api.licitacion(codigo) });

  if (q.isPending) return <Cargando texto="Cargando licitación…" />;
  if (q.isError) return <ErrorCaja error={q.error} reintentar={() => q.refetch()} />;
  const l = q.data;
  const estado = l.Estado ?? CODIGOS_ESTADO_LICITACION[l.CodigoEstado];
  const dias = l.CodigoEstado === 5 ? diasHasta(l.Fechas?.FechaCierre ?? l.FechaCierre) : null;
  const items = l.Items?.Listado ?? [];

  const compartir = async () => {
    const datos = { title: l.Nombre, text: `Licitación ${l.CodigoExterno}`, url: urlFichaLicitacion(l.CodigoExterno) };
    if (navigator.share) await navigator.share(datos).catch(() => undefined);
    else await navigator.clipboard?.writeText(datos.url);
  };

  return (
    <article className="detalle">
      <button className="btn btn--texto volver" onClick={() => navegar(-1)}>
        ← Volver
      </button>

      <header className="detalle__cabecera">
        <div className="tarjeta__fila">
          <code className="codigo">{l.CodigoExterno}</code>
          <Estado nombre={estado} />
          {l.Tipo && <span className="chip" title={TIPOS_LICITACION[l.Tipo]}>{l.Tipo}</span>}
          {dias != null && dias >= 0 && <span className="chip chip--rojo">{dias === 0 ? 'Cierra hoy' : `Quedan ${dias} días`}</span>}
        </div>
        <h1>{l.Nombre}</h1>
        <div className="acciones">
          <BotonFavorito tipo="licitacion" codigo={l.CodigoExterno} nombre={l.Nombre} extra={l.Fechas?.FechaCierre ?? undefined} />
          <a className="btn btn--primario" href={urlFichaLicitacion(l.CodigoExterno)} target="_blank" rel="noreferrer">
            Ver ficha oficial ↗
          </a>
          <button className="btn" onClick={compartir}>
            Compartir
          </button>
        </div>
      </header>

      {l.Descripcion && <p className="descripcion">{l.Descripcion}</p>}

      <div className="rejilla">
        <section className="panel">
          <h2>Comprador</h2>
          <dl>
            <Dato etiqueta="Organismo">
              {l.Comprador?.CodigoOrganismo ? (
                <Link to={`/licitaciones?estado=todos&organismo=${l.Comprador.CodigoOrganismo}`}>{l.Comprador.NombreOrganismo}</Link>
              ) : (
                l.Comprador?.NombreOrganismo
              )}
            </Dato>
            <Dato etiqueta="Unidad">{l.Comprador?.NombreUnidad}</Dato>
            <Dato etiqueta="Comuna / Región">
              {[l.Comprador?.ComunaUnidad, l.Comprador?.RegionUnidad].filter(Boolean).join(', ') || '—'}
            </Dato>
            <Dato etiqueta="RUT unidad">{l.Comprador?.RutUnidad}</Dato>
          </dl>
        </section>

        <section className="panel">
          <h2>Montos y condiciones</h2>
          <dl>
            <Dato etiqueta="Monto estimado">{dinero(l.MontoEstimado, l.Moneda)}</Dato>
            <Dato etiqueta="Tipo">{l.Tipo ? `${l.Tipo} · ${TIPOS_LICITACION[l.Tipo] ?? ''}` : '—'}</Dato>
            <Dato etiqueta="Etapas">{l.Etapas}</Dato>
            <Dato etiqueta="Reclamos del organismo">{numero(l.CantidadReclamos)}</Dato>
            <Dato etiqueta="Duración contrato">
              {l.TiempoDuracionContrato ? `${l.TiempoDuracionContrato} ${l.TipoDuracionContrato ?? ''}` : '—'}
            </Dato>
          </dl>
        </section>

        <section className="panel">
          <h2>Fechas clave</h2>
          <dl>
            <Dato etiqueta="Publicación">{fecha(l.Fechas?.FechaPublicacion)}</Dato>
            <Dato etiqueta="Fin de preguntas">{fecha(l.Fechas?.FechaFinal)}</Dato>
            <Dato etiqueta="Publicación respuestas">{fecha(l.Fechas?.FechaPubRespuestas)}</Dato>
            <Dato etiqueta="Cierre">{fecha(l.Fechas?.FechaCierre ?? l.FechaCierre)}</Dato>
            <Dato etiqueta="Apertura técnica">{fecha(l.Fechas?.FechaActoAperturaTecnica)}</Dato>
            <Dato etiqueta="Adjudicación estimada">{fecha(l.Fechas?.FechaEstimadaAdjudicacion)}</Dato>
            {l.Fechas?.FechaAdjudicacion && <Dato etiqueta="Adjudicada el">{fecha(l.Fechas.FechaAdjudicacion)}</Dato>}
          </dl>
        </section>

        {l.Adjudicacion && (
          <section className="panel">
            <h2>Adjudicación</h2>
            <dl>
              <Dato etiqueta="N° resolución">{l.Adjudicacion.Numero}</Dato>
              <Dato etiqueta="Fecha">{fecha(l.Adjudicacion.Fecha)}</Dato>
              <Dato etiqueta="N° de oferentes">{numero(l.Adjudicacion.NumeroOferentes)}</Dato>
              {l.Adjudicacion.UrlActa && (
                <Dato etiqueta="Acta">
                  <a href={l.Adjudicacion.UrlActa} target="_blank" rel="noreferrer">
                    Ver acta ↗
                  </a>
                </Dato>
              )}
            </dl>
          </section>
        )}
      </div>

      <section className="panel">
        <h2>Ítems ({items.length})</h2>
        {items.length === 0 ? (
          <p>Sin ítems informados.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="num">Cantidad</th>
                  <th>Adjudicado a</th>
                  <th className="num">Monto unitario</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={`${it.Correlativo ?? i}`}>
                    <td>{it.Correlativo ?? i + 1}</td>
                    <td>
                      <strong>{it.NombreProducto}</strong>
                      {it.Descripcion && <div className="sutil">{it.Descripcion}</div>}
                    </td>
                    <td>{it.Categoria}</td>
                    <td className="num">
                      {numero(it.Cantidad)} {it.UnidadMedida}
                    </td>
                    <td>
                      {it.Adjudicacion?.NombreProveedor ? (
                        <>
                          {it.Adjudicacion.NombreProveedor}
                          <div className="sutil">{it.Adjudicacion.RutProveedor}</div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="num">{dinero(it.Adjudicacion?.MontoUnitario, l.Moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  );
}
