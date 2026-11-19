import { Link } from 'react-router-dom';
import { Vacio } from '../components';
import { favoritos, useFavoritos, type Favorito } from '../favoritos';
import { diasHasta, fecha } from '../formato';

function exportarCsv(lista: Favorito[]) {
  const filas = [['tipo', 'codigo', 'nombre', 'cierre', 'agregado'], ...lista.map((f) => [f.tipo, f.codigo, f.nombre, f.extra ?? '', f.agregado])];
  // Neutraliza inyección de fórmulas (CSV injection): Excel/LibreOffice ejecutan celdas que empiezan con = + - @
  const celda = (c: unknown) => {
    const s = String(c);
    const seguro = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${seguro.replace(/"/g, '""')}"`;
  };
  const csv = filas.map((r) => r.map(celda).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'favoritos-mercado-publico.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

export default function Favoritos() {
  const lista = useFavoritos();

  return (
    <section>
      <header className="encabezado encabezado--acciones">
        <div>
          <h1>Favoritos</h1>
          <p>Guardados en este dispositivo.</p>
        </div>
        {lista.length > 0 && (
          <button className="btn" onClick={() => exportarCsv(lista)}>
            Exportar CSV
          </button>
        )}
      </header>

      {lista.length === 0 ? (
        <Vacio>Aún no guardas nada. Toca la ☆ en una licitación u orden de compra para seguirla aquí.</Vacio>
      ) : (
        <ul className="lista">
          {lista.map((f) => {
            const dias = f.tipo === 'licitacion' ? diasHasta(f.extra) : null;
            return (
              <li key={`${f.tipo}-${f.codigo}`}>
                <Link to={f.tipo === 'licitacion' ? `/licitaciones/${encodeURIComponent(f.codigo)}` : `/ordenes/${encodeURIComponent(f.codigo)}`} className="tarjeta">
                  <div className="tarjeta__cuerpo">
                    <div className="tarjeta__fila">
                      <span className="chip">{f.tipo === 'licitacion' ? 'Licitación' : 'Orden de compra'}</span>
                      <code className="codigo">{f.codigo}</code>
                      {dias != null && dias >= 0 && dias <= 3 && <span className="chip chip--rojo">Cierra pronto</span>}
                    </div>
                    <h3>{f.nombre}</h3>
                    {f.extra && <small>Cierre: {fecha(f.extra)}</small>}
                  </div>
                  <button
                    className="btn btn--texto"
                    onClick={(e) => {
                      e.preventDefault();
                      favoritos.quitar(f.tipo, f.codigo);
                    }}
                  >
                    Quitar
                  </button>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
