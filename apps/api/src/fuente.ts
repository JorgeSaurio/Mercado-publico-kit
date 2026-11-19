import type { MercadoPublicoClient } from '@mp/sdk';

/** Lo que el backend necesita de una fuente de datos (cliente real o datos de ejemplo). */
export type FuenteDatos = Pick<
  MercadoPublicoClient,
  | 'obtenerLicitacion'
  | 'listarLicitaciones'
  | 'licitacionesActivas'
  | 'obtenerOrdenCompra'
  | 'listarOrdenesCompra'
  | 'buscarProveedor'
  | 'buscarCompradores'
  | 'estadoCuota'
>;
