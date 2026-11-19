/**
 * Tipos de las respuestas de la API de Mercado Público.
 *
 * La API no publica un esquema formal: estos tipos reflejan los campos observados.
 * Todo campo opcional (`?`) puede venir ausente o en `null`, sobre todo en las
 * búsquedas por fecha/estado, que devuelven solo información básica.
 * Las fechas llegan como texto ISO sin zona horaria (hora de Chile continental).
 */

export interface RespuestaListado<T> {
  Cantidad: number;
  FechaCreacion: string;
  Version: string;
  Listado: T[];
}

// ─── Licitaciones ──────────────────────────────────────────────────

export interface Comprador {
  CodigoOrganismo?: string;
  NombreOrganismo?: string;
  RutUnidad?: string;
  CodigoUnidad?: string;
  NombreUnidad?: string;
  DireccionUnidad?: string;
  ComunaUnidad?: string;
  RegionUnidad?: string;
  RutUsuario?: string;
  CodigoUsuario?: string;
  NombreUsuario?: string;
  CargoUsuario?: string;
  // En órdenes de compra el comprador trae algunos campos con otro nombre
  Actividad?: string;
  NombreContacto?: string;
  CargoContacto?: string;
  FonoContacto?: string;
  MailContacto?: string;
  Pais?: string;
}

export interface FechasLicitacion {
  FechaCreacion?: string | null;
  FechaCierre?: string | null;
  FechaInicio?: string | null;
  FechaFinal?: string | null;
  FechaPubRespuestas?: string | null;
  FechaActoAperturaTecnica?: string | null;
  FechaActoAperturaEconomica?: string | null;
  FechaPublicacion?: string | null;
  FechaAdjudicacion?: string | null;
  FechaEstimadaAdjudicacion?: string | null;
  FechaSoporteFisico?: string | null;
  FechaTiempoEvaluacion?: string | null;
  FechaEstimadaFirma?: string | null;
  FechasUsuario?: string | null;
  FechaVisitaTerreno?: string | null;
  FechaEntregaAntecedentes?: string | null;
}

export interface AdjudicacionItem {
  RutProveedor?: string;
  NombreProveedor?: string;
  Cantidad?: number;
  MontoUnitario?: number;
}

export interface ItemLicitacion {
  Correlativo?: number;
  CodigoProducto?: number;
  CodigoCategoria?: string;
  Categoria?: string;
  NombreProducto?: string;
  Descripcion?: string;
  UnidadMedida?: string;
  Cantidad?: number;
  Adjudicacion?: AdjudicacionItem | null;
}

export interface AdjudicacionLicitacion {
  Tipo?: number;
  Fecha?: string | null;
  Numero?: string;
  NumeroOferentes?: number;
  UrlActa?: string;
}

export interface Licitacion {
  CodigoExterno: string;
  Nombre: string;
  CodigoEstado: number;
  FechaCierre?: string | null;
  // ── Campos presentes solo en la consulta por código (detalle) ──
  Descripcion?: string;
  Estado?: string;
  Comprador?: Comprador;
  DiasCierreLicitacion?: string;
  Informada?: number;
  CodigoTipo?: number;
  Tipo?: string;
  TipoConvocatoria?: string;
  Moneda?: string;
  Etapas?: number;
  EstadoEtapas?: string;
  TomaRazon?: string;
  EstadoPublicidadOfertas?: number;
  JustificacionPublicidad?: string;
  Contrato?: string;
  Obras?: string;
  CantidadReclamos?: number;
  Fechas?: FechasLicitacion;
  UnidadTiempoEvaluacion?: number;
  DireccionVisita?: string;
  DireccionEntrega?: string;
  Estimacion?: number;
  FuenteFinanciamiento?: string;
  VisibilidadMonto?: number;
  MontoEstimado?: number | null;
  Tiempo?: string | null;
  UnidadTiempo?: string;
  Modalidad?: number;
  TipoPago?: string;
  NombreResponsablePago?: string;
  EmailResponsablePago?: string;
  NombreResponsableContrato?: string;
  EmailResponsableContrato?: string;
  FonoResponsableContrato?: string;
  ProhibicionContratacion?: string;
  SubContratacion?: string;
  UnidadTiempoDuracionContrato?: number;
  TiempoDuracionContrato?: string;
  TipoDuracionContrato?: string;
  JustificacionMontoEstimado?: string;
  ObservacionContract?: string | null;
  ExtensionPlazo?: number;
  EsBaseTipo?: number;
  UnidadTiempoContratoLicitacion?: string;
  ValorTiempoRenovacion?: string;
  PeriodoTiempoRenovacion?: string;
  EsRenovable?: number;
  Adjudicacion?: AdjudicacionLicitacion | null;
  Items?: { Cantidad: number; Listado: ItemLicitacion[] };
}

// ─── Órdenes de compra ────────────────────────────────────────────

export interface FechasOrdenCompra {
  FechaCreacion?: string | null;
  FechaEnvio?: string | null;
  FechaAceptacion?: string | null;
  FechaCancelacion?: string | null;
  FechaUltimaModificacion?: string | null;
}

export interface Proveedor {
  Codigo?: string;
  Nombre?: string;
  Actividad?: string;
  CodigoSucursal?: string;
  NombreSucursal?: string;
  RutSucursal?: string;
  Direccion?: string;
  Comuna?: string;
  Region?: string;
  Pais?: string;
  NombreContacto?: string;
  CargoContacto?: string;
  FonoContacto?: string;
  MailContacto?: string;
}

export interface ItemOrdenCompra {
  Correlativo?: number;
  CodigoCategoria?: number;
  Categoria?: string;
  CodigoProducto?: number;
  Producto?: string;
  EspecificacionComprador?: string;
  EspecificacionProveedor?: string;
  Cantidad?: number;
  Unidad?: string;
  Moneda?: string;
  PrecioNeto?: number;
  TotalCargos?: number;
  TotalDescuentos?: number;
  TotalImpuestos?: number;
  Total?: number;
}

export interface OrdenCompra {
  Codigo: string;
  Nombre: string;
  CodigoEstado: number;
  // ── Campos presentes solo en la consulta por código (detalle) ──
  Estado?: string;
  CodigoLicitacion?: string;
  Descripcion?: string;
  CodigoTipo?: number;
  Tipo?: string;
  TipoMoneda?: string;
  CodigoEstadoProveedor?: number;
  EstadoProveedor?: string;
  Fechas?: FechasOrdenCompra;
  TieneItems?: number;
  PromedioCalificacion?: number;
  CantidadEvaluacion?: number;
  Descuentos?: number;
  Cargos?: number;
  TotalNetoOC?: number;
  PorcentajeIva?: number;
  Impuestos?: number;
  Total?: number;
  Financiamiento?: string;
  Pais?: string;
  TipoDespacho?: string;
  FormaPago?: string;
  Comprador?: Comprador;
  Proveedor?: Proveedor;
  Items?: { Cantidad: number; Listado: ItemOrdenCompra[] };
}

// ─── Empresas ─────────────────────────────────────────────────────

export interface Empresa {
  CodigoEmpresa: string;
  NombreEmpresa: string;
}

export interface RespuestaEmpresas {
  Cantidad: number;
  FechaCreacion: string;
  listaEmpresas: Empresa[];
}

// ─── Parámetros de consulta ───────────────────────────────────────

/** Fecha aceptada por el SDK: Date, 'YYYY-MM-DD' o 'ddmmaaaa'. */
export type FechaEntrada = Date | string;

export interface FiltrosListado<E extends string> {
  /** Día a consultar. Si se omite, la API devuelve el día actual. */
  fecha?: FechaEntrada;
  estado?: E;
  /** Código del organismo comprador (ver `buscarCompradores`). Se usa junto a `fecha`. */
  codigoOrganismo?: string | number;
  /** Código del proveedor (ver `buscarProveedor`). Se usa junto a `fecha`. */
  codigoProveedor?: string | number;
}
