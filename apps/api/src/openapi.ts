import { ESTADOS_LICITACION, ESTADOS_OC } from '@mp/sdk';

const paginacion = [
  { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Texto a buscar en código o nombre (sin distinguir tildes)' },
  { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
  { name: 'porPagina', in: 'query', schema: { type: 'integer', default: 25, minimum: 1, maximum: 200 } },
];
const filtrosComunes = [
  { name: 'fecha', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Día a consultar (YYYY-MM-DD). Por defecto, hoy.' },
  { name: 'organismo', in: 'query', schema: { type: 'string' }, description: 'Código del organismo comprador' },
  { name: 'proveedor', in: 'query', schema: { type: 'string' }, description: 'Código del proveedor (ver /proveedores/{rut})' },
];
const errores = {
  '400': { description: 'Parámetros inválidos' },
  '429': { description: 'Límite de peticiones o cuota diaria agotada' },
  '502': { description: 'Error de la API de Mercado Público' },
};
const pagina = (item: string) => ({
  type: 'object',
  properties: {
    total: { type: 'integer' },
    pagina: { type: 'integer' },
    porPagina: { type: 'integer' },
    items: { type: 'array', items: { $ref: `#/components/schemas/${item}` } },
    meta: { $ref: '#/components/schemas/Meta' },
  },
});

/** Especificación OpenAPI 3.1 del backend (ábrela en https://editor.swagger.io o Postman). */
export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Mercado Público Kit – API',
    version: '1.0.0',
    description:
      'Capa segura sobre la API oficial de Mercado Público (ChileCompra). Oculta el ticket, cachea respuestas, controla la cuota diaria y entrega datos paginados.',
  },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/salud': { get: { summary: 'Healthcheck', responses: { '200': { description: 'OK' } } } },
    '/estado': { get: { summary: 'Porcentaje de cuota usado (detalle con Bearer ADMIN_TOKEN)', responses: { '200': { description: 'OK' } } } },
    '/licitaciones': {
      get: {
        summary: 'Buscar licitaciones',
        parameters: [
          ...filtrosComunes,
          { name: 'estado', in: 'query', schema: { type: 'string', enum: ESTADOS_LICITACION } },
          { name: 'orden', in: 'query', schema: { type: 'string', enum: ['cierre_asc', 'cierre_desc', 'nombre'] } },
          ...paginacion,
        ],
        responses: { '200': { description: 'Página de resultados', content: { 'application/json': { schema: pagina('LicitacionResumen') } } }, ...errores },
      },
    },
    '/licitaciones/{codigo}': {
      get: {
        summary: 'Detalle de una licitación',
        parameters: [{ name: 'codigo', in: 'path', required: true, schema: { type: 'string' }, example: '1509-5-L114' }],
        responses: { '200': { description: 'Licitación completa (fechas, comprador, ítems, adjudicación)' }, '404': { description: 'No existe' }, ...errores },
      },
    },
    '/ordenes-compra': {
      get: {
        summary: 'Buscar órdenes de compra',
        parameters: [...filtrosComunes, { name: 'estado', in: 'query', schema: { type: 'string', enum: ESTADOS_OC } }, ...paginacion],
        responses: { '200': { description: 'Página de resultados', content: { 'application/json': { schema: pagina('OrdenCompraResumen') } } }, ...errores },
      },
    },
    '/ordenes-compra/{codigo}': {
      get: {
        summary: 'Detalle de una orden de compra',
        parameters: [{ name: 'codigo', in: 'path', required: true, schema: { type: 'string' }, example: '2097-241-SE14' }],
        responses: { '200': { description: 'Orden de compra completa' }, '404': { description: 'No existe' }, ...errores },
      },
    },
    '/proveedores/{rut}': {
      get: {
        summary: 'Obtener el código de proveedor a partir del RUT',
        parameters: [{ name: 'rut', in: 'path', required: true, schema: { type: 'string' }, example: '70.017.820-K' }],
        responses: { '200': { description: 'Empresa', content: { 'application/json': { schema: { $ref: '#/components/schemas/Empresa' } } } }, '404': { description: 'No registrado' }, ...errores },
      },
    },
    '/compradores': {
      get: {
        summary: 'Listar/buscar organismos compradores',
        parameters: paginacion,
        responses: { '200': { description: 'Página de organismos', content: { 'application/json': { schema: pagina('Empresa') } } }, ...errores },
      },
    },
  },
  components: {
    schemas: {
      Meta: {
        type: 'object',
        properties: { desdeCache: { type: 'boolean' }, actualizado: { type: 'string', format: 'date-time' }, fechaConsulta: { type: ['string', 'null'] } },
      },
      LicitacionResumen: {
        type: 'object',
        properties: {
          CodigoExterno: { type: 'string' },
          Nombre: { type: 'string' },
          CodigoEstado: { type: 'integer' },
          EstadoNombre: { type: 'string' },
          FechaCierre: { type: ['string', 'null'] },
        },
      },
      OrdenCompraResumen: {
        type: 'object',
        properties: { Codigo: { type: 'string' }, Nombre: { type: 'string' }, CodigoEstado: { type: 'integer' }, EstadoNombre: { type: 'string' } },
      },
      Empresa: { type: 'object', properties: { CodigoEmpresa: { type: 'string' }, NombreEmpresa: { type: 'string' } } },
    },
  },
} as const;
