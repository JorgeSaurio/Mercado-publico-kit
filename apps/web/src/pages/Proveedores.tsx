import { useQuery } from '@tanstack/react-query';
import { formatearRut, validarRut } from '@mp/sdk';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Cargando, ErrorCaja, SelectorEmpresas } from '../components';

export default function Proveedores() {
  const [sp, setSp] = useSearchParams();
  const rut = sp.get('rut') ?? '';
  const [texto, setTexto] = useState(rut);
  const [errorLocal, setErrorLocal] = useState('');

  const q = useQuery({ queryKey: ['proveedor', rut], queryFn: () => api.proveedor(rut), enabled: !!rut });

  return (
    <section>
      <header className="encabezado">
        <h1>Empresas</h1>
        <p>Con el RUT de una empresa obtienes su código de proveedor y ves qué le ha comprado el Estado.</p>
      </header>
      <SelectorEmpresas />

      <form
        className="filtros"
        noValidate
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
            placeholder="76.543.210-3"
            autoComplete="off"
            inputMode="text"
            aria-invalid={!!errorLocal}
            aria-describedby={errorLocal ? 'rut-error' : 'rut-ayuda'}
          />
          {errorLocal ? (
            <span className="campo__error" id="rut-error">
              {errorLocal}
            </span>
          ) : (
            <span className="campo__ayuda" id="rut-ayuda">
              Con o sin puntos y guion.
            </span>
          )}
        </label>
        <div className="filtros__acciones">
          <button className="btn btn--primario">Buscar</button>
        </div>
      </form>

      {q.isFetching && <Cargando texto="Buscando proveedor…" />}
      {q.isError && <ErrorCaja error={q.error} />}
      {q.data && (
        <div className="panel resultado">
          <h2>{q.data.NombreEmpresa}</h2>
          <p className="meta">
            RUT <span className="codigo">{rut}</span> · Código de proveedor <span className="codigo">{q.data.CodigoEmpresa}</span>
          </p>
          <div className="acciones">
            <Link className="btn btn--primario" to={`/ordenes?proveedor=${q.data.CodigoEmpresa}`}>
              Órdenes de compra de hoy
            </Link>
            <Link className="btn" to={`/licitaciones?estado=todos&proveedor=${q.data.CodigoEmpresa}`}>
              Licitaciones de hoy
            </Link>
          </div>
          <p className="sutil">
            Puedes cambiar la fecha desde los filtros de cada listado.
          </p>
        </div>
      )}
    </section>
  );
}
