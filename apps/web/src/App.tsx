import { useQuery } from '@tanstack/react-query';
import { Building2, FileSearch, Home, Landmark, Receipt, Star, type LucideIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { api } from './api';
import Compradores from './pages/Compradores';
import Favoritos from './pages/Favoritos';
import Inicio from './pages/Inicio';
import LicitacionDetalle from './pages/LicitacionDetalle';
import Licitaciones from './pages/Licitaciones';
import OrdenDetalle from './pages/OrdenDetalle';
import Ordenes from './pages/Ordenes';
import Proveedores from './pages/Proveedores';

interface ItemNav {
  to: string;
  label: string;
  icono: LucideIcon;
  end?: boolean;
  /** Solo en escritorio: la barra móvil se limita a 5 destinos. */
  escritorio?: boolean;
}

const NAV: ItemNav[] = [
  { to: '/', label: 'Inicio', icono: Home, end: true },
  { to: '/licitaciones', label: 'Licitaciones', icono: FileSearch },
  { to: '/ordenes', label: 'Órdenes', icono: Receipt },
  { to: '/proveedores', label: 'Empresas', icono: Building2 },
  { to: '/compradores', label: 'Compradores', icono: Landmark, escritorio: true },
  { to: '/favoritos', label: 'Guardadas', icono: Star },
];

function Marca() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
      <rect width="34" height="34" rx="8" fill="var(--tinta)" />
      <path d="M9 11h16M9 17h16M9 23h9" stroke="var(--papel)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="24" cy="23" r="3" fill="var(--cobre)" />
    </svg>
  );
}

export default function App() {
  const estado = useQuery({ queryKey: ['estado'], queryFn: api.estado, refetchInterval: 60_000, retry: false });
  const { pathname } = useLocation();
  const principal = useRef<HTMLElement>(null);

  // Al navegar, el foco va al contenido (lectores de pantalla anuncian la página nueva)
  useEffect(() => {
    principal.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="app">
      <a href="#contenido" className="saltar">
        Saltar al contenido
      </a>
      <aside className="lateral">
        <Link to="/" className="marca" aria-label="Mercado Público Kit, inicio">
          <Marca />
          <div>
            <strong>Mercado Público</strong>
            <span>kit de consulta</span>
          </div>
        </Link>
        <nav className="nav" aria-label="Principal">
          {NAV.map(({ to, label, icono: Icono, end, escritorio }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav__item ${isActive ? 'activo' : ''} ${escritorio ? 'nav__item--escritorio' : ''} ${
                  // En móvil "Empresas" agrupa proveedores y compradores
                  to === '/proveedores' && pathname.startsWith('/compradores') ? 'activo-movil' : ''
                }`
              }
            >
              <Icono size={18} strokeWidth={1.75} aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        {estado.data && (
          <div className="cuota" title="Consultas a la API oficial usadas hoy por este servidor">
            {estado.data.modo === 'mock' && <span className="chip chip--ambar">Datos de ejemplo</span>}
            <span>Cuota diaria de consultas</span>
            <div className="cuota__barra">
              <div style={{ transform: `scaleX(${Math.min(1, estado.data.cuota.usadas / estado.data.cuota.limite)})` }} />
            </div>
            <span className="cuota__cifras">
              {estado.data.cuota.usadas.toLocaleString('es-CL')} / {estado.data.cuota.limite.toLocaleString('es-CL')}
            </span>
          </div>
        )}
      </aside>

      <main className="contenido" id="contenido" ref={principal} tabIndex={-1}>
        {estado.isError && (
          <div className="aviso aviso--error" role="alert">
            Sin conexión con el servidor.{import.meta.env.DEV && <> ¿Está corriendo <code>npm run dev</code>?</>}
          </div>
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
          Datos públicos de Mercado Público (ChileCompra). Herramienta independiente, no es un servicio oficial.
        </footer>
      </main>
    </div>
  );
}
