import type { FechaEntrada } from './types.js';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Convierte una fecha al formato `ddmmaaaa` que exige la API.
 * Acepta `Date`, `'YYYY-MM-DD'` o un `'ddmmaaaa'` ya formateado.
 * Las `Date` se interpretan en la hora local de quien ejecuta el código.
 */
export function formatearFechaMP(fecha: FechaEntrada): string {
  if (fecha instanceof Date) {
    if (Number.isNaN(fecha.getTime())) throw new RangeError('Fecha inválida');
    return `${pad(fecha.getDate())}${pad(fecha.getMonth() + 1)}${fecha.getFullYear()}`;
  }
  const s = fecha.trim();
  if (/^\d{8}$/.test(s)) {
    validarPartes(+s.slice(4), +s.slice(2, 4), +s.slice(0, 2));
    return s;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const [, y, m, d] = iso;
    validarPartes(+y, +m, +d);
    return `${d}${m}${y}`;
  }
  throw new RangeError(`Formato de fecha no reconocido: "${fecha}". Usa YYYY-MM-DD o ddmmaaaa.`);
}

function validarPartes(y: number, m: number, d: number) {
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    throw new RangeError(`Fecha inexistente: ${y}-${pad(m)}-${pad(d)}`);
  }
}

/** Fecha de hoy en Chile continental, como 'YYYY-MM-DD'. */
export function hoyEnChile(now: Date = new Date()): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Deja un RUT solo con dígitos y K mayúscula: '76.123.456-k' → '76123456K'. */
export function limpiarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

/** Calcula el dígito verificador (módulo 11) de un cuerpo de RUT. */
export function calcularDv(cuerpo: string | number): string {
  const digitos = String(cuerpo).replace(/\D/g, '');
  let suma = 0;
  let mult = 2;
  for (let i = digitos.length - 1; i >= 0; i--) {
    suma += Number(digitos[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const res = 11 - (suma % 11);
  return res === 11 ? '0' : res === 10 ? 'K' : String(res);
}

/** Valida un RUT chileno con cualquier formato. */
export function validarRut(rut: string): boolean {
  const limpio = limpiarRut(rut);
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;
  return calcularDv(limpio.slice(0, -1)) === limpio.slice(-1);
}

/**
 * Formatea un RUT con puntos y guion, como lo exige `BuscarProveedor`:
 * '761234567' → '76.123.456-7'.
 */
export function formatearRut(rut: string): string {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
}

export const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
