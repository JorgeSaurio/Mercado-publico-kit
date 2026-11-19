const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL');

export function dinero(monto?: number | null, moneda = 'CLP') {
  if (monto == null) return '—';
  if (moneda === 'CLP') return clp.format(monto);
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: moneda }).format(monto);
  } catch {
    return `${num.format(monto)} ${moneda}`;
  }
}

export const numero = (n?: number | null) => (n == null ? '—' : num.format(n));

/** Las fechas de la API vienen sin zona horaria y están en hora de Chile: se muestran tal cual. */
export function fecha(iso?: string | null, conHora = true) {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d, h, mi] = m;
  return conHora && h ? `${d}-${mo}-${y} ${h}:${mi}` : `${d}-${mo}-${y}`;
}

/** Días que faltan hasta una fecha (negativo si ya pasó). */
export function diasHasta(iso?: string | null) {
  if (!iso) return null;
  const objetivo = new Date(iso.slice(0, 10) + 'T00:00:00');
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86_400_000);
}

export function hace(isoFecha: string) {
  const seg = Math.round((Date.now() - new Date(isoFecha).getTime()) / 1000);
  if (seg < 60) return 'hace instantes';
  if (seg < 3600) return `hace ${Math.round(seg / 60)} min`;
  return `hace ${Math.round(seg / 3600)} h`;
}

/** URL pública de la ficha en mercadopublico.cl */
export const urlFichaLicitacion = (codigo: string) =>
  `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(codigo)}`;
export const urlFichaOC = (codigo: string) =>
  `https://www.mercadopublico.cl/PurchaseOrder/Modules/PO/DetailsPurchaseOrder.aspx?codigoOC=${encodeURIComponent(codigo)}`;
