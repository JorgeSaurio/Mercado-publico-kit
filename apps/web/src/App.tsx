import { useQuery } from '@tanstack/react-query';
import { NavLink, Route, Routes } from 'react-router-dom';
import { api } from './api';
import Compradores from './pages/Compradores';
import Favoritos from './pages/Favoritos';
import Inicio from './pages/Inicio';
import LicitacionDetalle from './pages/LicitacionDetalle';
import Licitaciones from './pages/Licitaciones';
import OrdenDetalle from './pages/OrdenDetalle';
import Ordenes from './pages/Ordenes';
import Proveedores from './pages/Proveedores';

const NAV = [
  { to: '/', label: 'Inicio', icono: '⌂', end: true },
  { to: '/licitaciones', label: 'Licitaciones', icono: '📋' },
  { to: '/ordenes', label: 'Órdenes', icono: '🧾' },
  { to: '/proveedores', label: 'Proveedores', icono: '🏢' },
  { to: '/compradores', label: 'Compradores', icono: '🏛' },
  { to: '/favoritos', label: 'Favoritos', icono: '★' },
];

export default function App() {
  const estado = useQuery({ queryKey: ['estado'], queryFn: api.estado, refetchInterval: 60_000, retry: false });

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">
          <img src="/icon.svg" alt="" width={36} height={36} />
          <div>
            <strong>Mercado Público</strong>
            <span>Kit de consulta</span>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav__item ${isActive ? 'activo' : ''}`}>
              <span className="nav__icono" aria-hidden>
                {n.icono}
              </span>
              <span className="nav__texto">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        {estado.data && (
          <div className="cuota" title="Peticiones a la API oficial usadas hoy por el servidor">
            {estado.data.modo === 'mock' && <span className="chip chip--ambar">Datos de ejemplo</span>}
            <div className="cuota__barra">
              <div style={{ width: `${Math.min(100, (estado.data.cuota.usadas / estado.data.cuota.limite) * 100)}%` }} />
            </div>
            <small>
              Cuota diaria: {estado.data.cuota.usadas.toLocaleString('es-CL')} / {estado.data.cuota.limite.toLocaleString('es-CL')}
            </small>
          </div>
        )}
      </aside>

      <main className="contenido">
        {estado.isError && (
          <div className="aviso aviso--error">No hay conexión con el backend. ¿Está corriendo <code>npm run dev</code>?</div>
        )}
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/licitaciones" element={<Licitaciones />} />
          <Route path="/licitaciones/:codigo" element={<LicitacionDetalle />} />
          <Route path="/ordenes" element={<Ordenes />} />
          <Route path="/ordenes/:codigo" element={<OrdenDetalle />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/compradores" element={<Compradores />} />
          <Route path="/favoritos" element={<Favoritos />} />
          <Route path="*" element={<p>Página no encontrada.</p>} />
        </Routes>
        <footer className="pie">
          Datos: API pública de Mercado Público (ChileCompra). Esta herramienta no es un servicio oficial.
        </footer>
      </main>
    </div>
  );
}
