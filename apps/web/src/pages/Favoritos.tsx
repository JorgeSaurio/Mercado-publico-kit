import { Download, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Plazo, Vacio } from '../components';
import { favoritos, useFavoritos, type Favorito } from '../favoritos';
import { fecha } from '../formato';

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
  const a = Object.assign(document.createElement('a'), { href: url, download: 'guardadas-mercado-publico.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

export default function Favoritos() {
  const lista = useFavoritos();

  return (
    <section>
      <header className="encabezado encabezado--acciones">
        <div>
          <h1>Guardadas</h1>
          <p>
            Licitaciones y órdenes que sigues. Quedan solo en este dispositivo, no se envían a ningún servidor.{' '}
            <Link to="/privacidad">Borrar datos del dispositivo</Link>
          </p>
        </div>
        {lista.length > 0 && (
          <button className="btn" onClick={() => exportarCsv(lista)}>
            <Download size={16} aria-hidden /> Exportar CSV
          </button>
        )}
      </header>

      {lista.length === 0 ? (
        <Vacio>Aún no guardas nada. Usa la estrella de una licitación u orden de compra para seguirla aquí.</Vacio>
      ) : (
        <ul className="libro">
          {lista.map((f) => {
            const esLic = f.tipo === 'licitacion';
            return (
              <li key={`${f.tipo}-${f.codigo}`} className={`fila ${esLic ? '' : 'fila--simple'}`}>
                <Link to={esLic ? `/licitaciones/${encodeURIComponent(f.codigo)}` : `/ordenes/${encodeURIComponent(f.codigo)}`} className="fila__enlace">
                  {esLic && <Plazo cierre={f.extra} abierta />}
                  <div className="fila__cuerpo">
                    <div className="fila__linea">
                      <span className="chip">{esLic ? 'Licitación' : 'Orden de compra'}</span>
                      <code className="codigo">{f.codigo}</code>
                    </div>
                    <h3>{f.nombre}</h3>
                    {f.extra && <small>Cierre {fecha(f.extra)}</small>}
                  </div>
                </Link>
                <div className="fila__accion">
                  <button className="btn btn--texto btn--icono" aria-label={`Quitar ${f.codigo} de guardadas`} title="Quitar" onClick={() => favoritos.quitar(f.tipo, f.codigo)}>
                    <X size={18} aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
