import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Cargando, ErrorCaja, Estado } from '../components';
import { diasHasta, fecha } from '../formato';

// Los códigos de licitación/OC tienen forma NNNN-NN-XXNN
const PARECE_CODIGO = /^\d{2,8}-\d{1,6}-[A-Z0-9]{2,6}$/i;

export default function Inicio() {
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');

  const activas = useQuery({
    queryKey: ['inicio', 'activas'],
    queryFn: () => api.licitaciones({ estado: 'activas', orden: 'cierre_asc', porPagina: 200 }),
  });
  const ocHoy = useQuery({ queryKey: ['inicio', 'oc'], queryFn: () => api.ordenes({ estado: 'todos', porPagina: 1 }) });

  const proximas = (activas.data?.items ?? [])
    .filter((l) => {
      const d = diasHasta(l.FechaCierre);
      return d != null && d >= 0 && d <= 3;
    })
    .slice(0, 8);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    if (PARECE_CODIGO.test(t)) {
      // Un código: las OC suelen terminar en SE/CM/AG/etc. y las licitaciones en L1/LE/LP…
      const esLicitacion = /-(L[1EPQRS]|E2|CO|B2|H2|I2|O[12])\d*$/i.test(t);
      navegar(esLicitacion ? `/licitaciones/${encodeURIComponent(t.toUpperCase())}` : `/ordenes/${encodeURIComponent(t.toUpperCase())}`);
    } else {
      navegar(`/licitaciones?q=${encodeURIComponent(t)}`);
    }
  };

  return (
    <section>
      <div className="hero">
        <h1>¿Qué está comprando el Estado hoy?</h1>
        <p>Consulta licitaciones, órdenes de compra, proveedores y organismos de Mercado Público.</p>
        <form className="hero__busqueda" onSubmit={buscar}>
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Busca por palabra clave o pega un código (ej: 1509-5-L114)"
            aria-label="Buscar"
          />
          <button className="btn btn--primario">Buscar</button>
        </form>
      </div>

      <div className="kpis">
        <Link to="/licitaciones" className="kpi kpi--enlace">
          <span>Licitaciones activas</span>
          <strong>{activas.data ? activas.data.total.toLocaleString('es-CL') : '…'}</strong>
        </Link>
        <Link to="/licitaciones?estado=activas" className="kpi kpi--enlace">
          <span>Cierran en ≤ 3 días (primeras 200)</span>
          <strong>{activas.data ? proximas.length.toLocaleString('es-CL') : '…'}</strong>
        </Link>
        <Link to="/ordenes" className="kpi kpi--enlace">
          <span>Órdenes de compra hoy</span>
          <strong>{ocHoy.data ? ocHoy.data.total.toLocaleString('es-CL') : '…'}</strong>
        </Link>
      </div>

      <section className="panel">
        <h2>Cierran pronto</h2>
        {activas.isPending && <Cargando />}
        {activas.isError && <ErrorCaja error={activas.error} reintentar={() => activas.refetch()} />}
        {activas.data && proximas.length === 0 && <p>No hay licitaciones que cierren en los próximos 3 días.</p>}
        <ul className="lista lista--compacta">
          {proximas.map((l) => (
            <li key={l.CodigoExterno}>
              <Link to={`/licitaciones/${encodeURIComponent(l.CodigoExterno)}`} className="tarjeta">
                <div className="tarjeta__cuerpo">
                  <div className="tarjeta__fila">
                    <code className="codigo">{l.CodigoExterno}</code>
                    <Estado nombre={l.EstadoNombre} />
                  </div>
                  <h3>{l.Nombre}</h3>
                  <small>Cierre: {fecha(l.FechaCierre)}</small>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
