import { useQuery } from '@tanstack/react-query';
import { formatearRut, validarRut } from '@mp/sdk';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Cargando, ErrorCaja } from '../components';

export default function Proveedores() {
  const [sp, setSp] = useSearchParams();
  const rut = sp.get('rut') ?? '';
  const [texto, setTexto] = useState(rut);
  const [errorLocal, setErrorLocal] = useState('');

  const q = useQuery({ queryKey: ['proveedor', rut], queryFn: () => api.proveedor(rut), enabled: !!rut });

  return (
    <section>
      <header className="encabezado">
        <h1>Proveedores</h1>
        <p>Ingresa el RUT de una empresa para obtener su código en Mercado Público y ver su actividad.</p>
      </header>

      <form
        className="filtros"
        onSubmit={(e) => {
          e.preventDefault();
          if (!validarRut(texto)) {
            setErrorLocal('El RUT no es válido. Revisa el dígito verificador.');
            return;
          }
          setErrorLocal('');
          const formateado = formatearRut(texto);
          setTexto(formateado);
          setSp({ rut: formateado });
        }}
      >
        <label className="campo campo--ancho">
          <span>RUT del proveedor</span>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={() => texto && validarRut(texto) && setTexto(formatearRut(texto))}
            placeholder="ej: 76.543.210-3"
            autoComplete="off"
            aria-invalid={!!errorLocal}
          />
        </label>
        <div className="filtros__acciones">
          <button className="btn btn--primario">Buscar</button>
        </div>
      </form>

      {errorLocal && <div className="aviso aviso--error">{errorLocal}</div>}
      {q.isFetching && <Cargando texto="Buscando proveedor…" />}
      {q.isError && <ErrorCaja error={q.error} />}
      {q.data && (
        <div className="panel">
          <h2>{q.data.NombreEmpresa}</h2>
          <p>
            RUT <strong>{rut}</strong> · Código de proveedor <code className="codigo">{q.data.CodigoEmpresa}</code>
          </p>
          <div className="acciones">
            <Link className="btn btn--primario" to={`/ordenes?proveedor=${q.data.CodigoEmpresa}`}>
              Órdenes de compra de hoy
            </Link>
            <Link className="btn" to={`/licitaciones?estado=todos&proveedor=${q.data.CodigoEmpresa}`}>
              Licitaciones de hoy
            </Link>
          </div>
          <p className="sutil">Puedes cambiar la fecha desde los filtros de cada listado.</p>
        </div>
      )}
    </section>
  );
}
