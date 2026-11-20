import { BorrarDatosLocales } from '../components';

// Datos de quien opera esta instalación. Se configuran en .env (VITE_RESPONSABLE_*).
const env = import.meta.env;
const RESPONSABLE = env.VITE_RESPONSABLE_NOMBRE || '';
const RUT = env.VITE_RESPONSABLE_RUT || '';
const CONTACTO = env.VITE_CONTACTO_PRIVACIDAD || '';

function Pendiente({ campo }: { campo: string }) {
  return <mark className="pendiente">[{campo}: completar en .env]</mark>;
}

function Contacto() {
  if (!CONTACTO) return <Pendiente campo="VITE_CONTACTO_PRIVACIDAD" />;
  const esCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CONTACTO);
  return esCorreo ? <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a> : <span>{CONTACTO}</span>;
}

export default function Privacidad() {
  return (
    <article className="legal">
      <header className="encabezado">
        <p className="eyebrow">Ley 21.719 · Protección de datos personales</p>
        <h1>Privacidad y tus datos</h1>
        <p>Qué datos usa esta herramienta, para qué y cómo ejercer tus derechos.</p>
      </header>

      <section className="panel">
        <h2>En resumen</h2>
        <ul>
          <li>No hay cuentas ni registro: no pedimos tu nombre, correo ni RUT.</li>
          <li>Tus guardadas quedan solo en este dispositivo y puedes borrarlas cuando quieras.</li>
          <li>No usamos cookies de seguimiento, publicidad ni analítica de terceros.</li>
          <li>Las fuentes y archivos se sirven desde nuestro propio servidor: tu navegador no se conecta a otros sitios.</li>
        </ul>
      </section>

      <h2 className="seccion__titulo">Responsable</h2>
      <p>
        {RESPONSABLE || <Pendiente campo="VITE_RESPONSABLE_NOMBRE" />}
        {RUT ? `, RUT ${RUT}` : <>, RUT <Pendiente campo="VITE_RESPONSABLE_RUT" /></>}. Contacto para privacidad: <Contacto />.
      </p>

      <h2 className="seccion__titulo">Qué datos se tratan</h2>
      <dl className="lista-legal">
        <dt>Datos públicos de Mercado Público</dt>
        <dd>
          Licitaciones, órdenes de compra, organismos y proveedores publicados por ChileCompra. Antes de guardarlos o mostrarlos
          eliminamos los datos de contacto de personas (nombres, RUT, cargos, correos y teléfonos de funcionarios y contactos de
          proveedores): la herramienta no los necesita. Algunos proveedores son personas naturales; su nombre y RUT pueden aparecer
          porque forman parte del registro público de compras.
        </dd>
        <dt>Búsquedas por RUT</dt>
        <dd>
          Se envían a la API oficial para obtener la ficha del proveedor. No se guardan en tu dispositivo ni se escriben en los
          registros del servidor (el RUT se oculta).
        </dd>
        <dt>Dirección IP</dt>
        <dd>
          Se usa solo en memoria para limitar el número de consultas y proteger el servicio frente a abusos. Se descarta en un
          plazo máximo de una hora y no se asocia a ninguna identidad.
        </dd>
        <dt>Guardadas</dt>
        <dd>Se almacenan en tu navegador o en la app (almacenamiento local). Nunca se envían al servidor.</dd>
        <dt>Uso sin conexión</dt>
        <dd>
          Las últimas respuestas de licitaciones y órdenes se guardan en tu dispositivo hasta 24 horas para que la app funcione sin
          internet.
        </dd>
      </dl>

      <h2 className="seccion__titulo">Para qué y con qué base</h2>
      <p>
        El tratamiento busca facilitar el acceso a información de compras públicas, en especial a micro, pequeñas y medianas
        empresas. Se basa en que los datos provienen de una fuente de acceso público y en el interés legítimo de operar un servicio
        seguro, siempre limitado a lo necesario (principios de finalidad, proporcionalidad y minimización).
      </p>

      <h2 className="seccion__titulo">Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo escribiendo a{' '}
        <Contacto />. Responderemos dentro de los plazos que fija la ley. Si los datos provienen de Mercado Público, la corrección de
        origen debe pedirse también a ChileCompra. Si no quedas conforme, puedes reclamar ante la Agencia de Protección de Datos
        Personales.
      </p>

      <h2 className="seccion__titulo">Seguridad e incidentes</h2>
      <p>
        El servidor usa conexiones cifradas, cabeceras de seguridad y límites de uso. Si ocurriera una vulneración de seguridad que
        afecte datos personales, la informaremos a la Agencia y, cuando corresponda, a las personas afectadas.
      </p>

      <section className="panel" aria-labelledby="borrar-titulo">
        <h2 id="borrar-titulo">Borrar datos de este dispositivo</h2>
        <p>Elimina tus guardadas y las consultas guardadas para uso sin conexión. No afecta a otros dispositivos.</p>
        <BorrarDatosLocales />
      </section>
    </article>
  );
}
