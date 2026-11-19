/** URL base oficial de la API (v1). */
export const MP_BASE_URL = 'https://api.mercadopublico.cl/servicios/v1/publico';

/** Límite oficial de peticiones por ticket al día (no modificable según ChileCompra). */
export const MP_DAILY_LIMIT = 10_000;

/**
 * Valores aceptados por el parámetro `estado` en licitaciones.
 * `activas` = todas las licitaciones publicadas a la fecha de consulta.
 */
export const ESTADOS_LICITACION = [
  'activas',
  'publicada',
  'cerrada',
  'desierta',
  'adjudicada',
  'revocada',
  'suspendida',
  'todos',
] as const;
export type EstadoLicitacion = (typeof ESTADOS_LICITACION)[number];

/**
 * Valores aceptados por el parámetro `estado` en órdenes de compra.
 * Ojo: algunos vienen mal escritos en la documentación oficial y la API los espera tal cual.
 */
export const ESTADOS_OC = [
  'enviadaproveedor',
  'aceptada',
  'cancelada',
  'recepcionconforme',
  'pendienterecepcion',
  'recepcionaceptadacialmente',
  'recepecionconformeincompleta',
  'todos',
] as const;
export type EstadoOrdenCompra = (typeof ESTADOS_OC)[number];

/** Códigos de estado numéricos que devuelve la API en las licitaciones. */
export const CODIGOS_ESTADO_LICITACION: Record<number, string> = {
  5: 'Publicada',
  6: 'Cerrada',
  7: 'Desierta',
  8: 'Adjudicada',
  18: 'Revocada',
  19: 'Suspendida',
};

/** Códigos de estado numéricos que devuelve la API en las órdenes de compra. */
export const CODIGOS_ESTADO_OC: Record<number, string> = {
  4: 'Enviada a proveedor',
  5: 'En proceso',
  6: 'Aceptada',
  9: 'Cancelada',
  12: 'Recepción conforme',
  13: 'Pendiente de recepcionar',
  14: 'Recepcionada parcialmente',
  15: 'Recepción conforme incompleta',
};

/** Etiquetas legibles para los estados de consulta. */
export const ETIQUETAS_ESTADO_LICITACION: Record<EstadoLicitacion, string> = {
  activas: 'Activas',
  publicada: 'Publicada',
  cerrada: 'Cerrada',
  desierta: 'Desierta',
  adjudicada: 'Adjudicada',
  revocada: 'Revocada',
  suspendida: 'Suspendida',
  todos: 'Todos',
};

export const ETIQUETAS_ESTADO_OC: Record<EstadoOrdenCompra, string> = {
  enviadaproveedor: 'Enviada a proveedor',
  aceptada: 'Aceptada',
  cancelada: 'Cancelada',
  recepcionconforme: 'Recepción conforme',
  pendienterecepcion: 'Pendiente de recepción',
  recepcionaceptadacialmente: 'Recepcionada parcialmente',
  recepecionconformeincompleta: 'Recepción conforme incompleta',
  todos: 'Todos',
};

/** Tipos de licitación más comunes (campo `Tipo` / `CodigoTipo`). */
export const TIPOS_LICITACION: Record<string, string> = {
  L1: 'Licitación pública < 100 UTM',
  LE: 'Licitación pública 100–1.000 UTM',
  LP: 'Licitación pública 1.000–2.000 UTM',
  LQ: 'Licitación pública 2.000–5.000 UTM',
  LR: 'Licitación pública > 5.000 UTM',
  LS: 'Licitación pública servicios personales especializados',
  E2: 'Licitación privada < 100 UTM',
  CO: 'Licitación privada 100–1.000 UTM',
  B2: 'Licitación privada 1.000–2.000 UTM',
  H2: 'Licitación privada 2.000–5.000 UTM',
  I2: 'Licitación privada > 5.000 UTM',
  O1: 'Licitación pública de obras',
  O2: 'Licitación privada de obras',
};
