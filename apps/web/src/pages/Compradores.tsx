import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Esqueleto, ErrorCaja, MetaResultados, Paginacion, SelectorEmpresas, Vacio } from '../components';

const POR_PAGINA = 30;

export default function Compradores() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const pagina = Math.max(1, Number(sp.get('pagina')) || 1);
  const [texto, setTexto] = useState(q);

  // Búsqueda mientras se escribe, con una pequeña espera
  useEffect(() => {
    const t = setTimeout(() => {
      if (texto !== q) setSp(texto ? { q: texto } : {});
    }, 300);
    return () => clearTimeout(t);
  }, [texto, q, setSp]);

  const consulta = useQuery({
    queryKey: ['compradores', q, pagina],
    queryFn: () => api.compradores({ q, pagina, porPagina: POR_PAGINA }),
    placeholderData: keepPreviousData,
  });

  return (
    <section>
      <header className="encabezado">
        <h1>Empresas</h1>
        <p>Encuentra un organismo público y revisa lo que está licitando o comprando hoy.</p>
      </header>
      <SelectorEmpresas />

      <div className="filtros">
        <label className="campo campo--ancho">
          <span>Buscar organismo</span>
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="ej: municipalidad de temuco" />
        </label>
      </div>

      {consulta.isPending && <Esqueleto texto="Cargando organismos…" />}
      {consulta.isError && <ErrorCaja error={consulta.error} reintentar={() => consulta.refetch()} />}
      {consulta.data && (
        <>
          <MetaResultados {...consulta.data.meta} total={consulta.data.total} />
          {consulta.data.items.length === 0 ? (
            <Vacio>Sin coincidencias.</Vacio>
          ) : (
            <div className="panel"><div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Organismo</th>
                    <th>Ver hoy</th>
                  </tr>
                </thead>
                <tbody>
                  {consulta.data.items.map((c) => (
                    <tr key={c.CodigoEmpresa}>
                      <td>
                        <code className="codigo">{c.CodigoEmpresa}</code>
                      </td>
                      <td>{c.NombreEmpresa}</td>
                      <td className="enlaces">
                        <Link to={`/licitaciones?estado=todos&organismo=${c.CodigoEmpresa}`}>Licitaciones</Link>
                        <Link to={`/ordenes?organismo=${c.CodigoEmpresa}`}>Órdenes</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          )}
          <Paginacion total={consulta.data.total} pagina={pagina} porPagina={POR_PAGINA} />
        </>
      )}
    </section>
  );
}
