import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { BotonFavorito, Esqueleto, ErrorCaja, Estado, Plazo } from '../components';
import { diasHasta, fecha, fechaLarga } from '../formato';

// Los códigos de licitación/OC tienen forma NNNN-NN-XXNN
const PARECE_CODIGO = /^\d{2,8}-\d{1,6}-[A-Z0-9]{2,6}$/i;
const MAX = 200;

export default function Inicio() {
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');

  const activas = useQuery({
    queryKey: ['inicio', 'activas'],
    queryFn: () => api.licitaciones({ estado: 'activas', orden: 'cierre_asc', porPagina: MAX }),
  });
  const ocHoy = useQuery({ queryKey: ['inicio', 'oc'], queryFn: () => api.ordenes({ estado: 'todos', porPagina: 1 }) });

  // Vienen ordenadas por cierre: las primeras 200 son las más urgentes
  const urgentes = (activas.data?.items ?? []).filter((l) => {
    const d = diasHasta(l.FechaCierre);
    return d != null && d >= 0 && d <= 3;
  });

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    if (PARECE_CODIGO.test(t)) {
      // Las licitaciones terminan en L1/LE/LP…; las OC en SE/CM/AG…
      const esLicitacion = /-(L[1EPQRS]|E2|CO|B2|H2|I2|O[12])\d*$/i.test(t);
      navegar(esLicitacion ? `/licitaciones/${encodeURIComponent(t.toUpperCase())}` : `/ordenes/${encodeURIComponent(t.toUpperCase())}`);
    } else {
      navegar(`/licitaciones?q=${encodeURIComponent(t)}`);
    }
  };

  const total = activas.data?.total;

  return (
    <>
      <section className="portada">
        <p className="eyebrow">{fechaLarga()}</p>
        <h1>Licitaciones del Estado, ordenadas por lo que cierra primero.</h1>
        <p>
          {total != null ? (
            <>
              <strong>{total.toLocaleString('es-CL')}</strong> procesos abiertos ahora en Mercado Público.
            </>
          ) : (
            'Procesos abiertos ahora en Mercado Público.'
          )}{' '}
          Busca por rubro o pega un código.
        </p>
        <form className="buscador" onSubmit={buscar} role="search">
          <Search size={18} aria-hidden />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="aseo industrial, notebooks, 1509-5-L114…"
            aria-label="Buscar licitaciones por palabra o código"
            enterKeyHint="search"
          />
          <button className="btn btn--primario" aria-label="Buscar">
            <span className="buscador__texto">Buscar</span>
            <Search size={16} aria-hidden className="buscador__icono" />
          </button>
        </form>
      </section>

      <div className="cifras">
        <Link to="/licitaciones" className="cifra">
          <span>Abiertas ahora</span>
          <strong>{total != null ? total.toLocaleString('es-CL') : '—'}</strong>
        </Link>
        <Link to="/licitaciones?estado=activas" className="cifra">
          <span>Cierran en 3 días o menos</span>
          <strong>{activas.data ? `${urgentes.length.toLocaleString('es-CL')}${urgentes.length >= MAX ? '+' : ''}` : '—'}</strong>
        </Link>
        <Link to="/ordenes" className="cifra">
          <span>Órdenes de compra hoy</span>
          <strong>{ocHoy.data ? ocHoy.data.total.toLocaleString('es-CL') : '—'}</strong>
        </Link>
      </div>

      <section aria-labelledby="t-urgentes">
        <div className="seccion__titulo">
          <h2 id="t-urgentes">Cierran pronto</h2>
          <Link to="/licitaciones">Ver todas</Link>
        </div>
        {activas.isPending && <Esqueleto filas={5} texto="Cargando licitaciones…" />}
        {activas.isError && <ErrorCaja error={activas.error} reintentar={() => activas.refetch()} />}
        {activas.data && urgentes.length === 0 && <p className="meta">Nada cierra en los próximos 3 días.</p>}
        {urgentes.length > 0 && (
          <ul className="libro">
            {urgentes.slice(0, 8).map((l) => (
              <li className="fila" key={l.CodigoExterno}>
                <Link to={`/licitaciones/${encodeURIComponent(l.CodigoExterno)}`} className="fila__enlace">
                  <Plazo cierre={l.FechaCierre} abierta />
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
      </section>
    </>
  );
}
