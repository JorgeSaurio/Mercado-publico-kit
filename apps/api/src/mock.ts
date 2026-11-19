import {
  hoyEnChile,
  limpiarRut,
  validarRut,
  type Empresa,
  type EstadoLicitacion,
  type EstadoOrdenCompra,
  type FiltrosListado,
  type Licitacion,
  type OrdenCompra,
  type RespuestaListado,
} from '@mp/sdk';
import type { FuenteDatos } from './fuente.js';

/**
 * Fuente de DATOS DE EJEMPLO (ficticios) con la misma forma que la API real.
 * Sirve para desarrollar la web/app sin ticket ni conexión. Actívala con MP_MOCK=true.
 */

// Generador pseudoaleatorio determinista para que los datos no cambien entre reinicios
function rng(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const ORGANISMOS: Empresa[] = [
  ['7248', 'Municipalidad de Valparaíso'],
  ['6945', 'Dirección de Compras y Contratación Pública'],
  ['7312', 'Hospital Regional de Concepción'],
  ['6901', 'Ministerio de Obras Públicas - Dirección de Vialidad'],
  ['7005', 'Servicio de Salud Metropolitano Sur'],
  ['7120', 'Municipalidad de Temuco'],
  ['7433', 'Universidad de Ejemplo del Norte'],
  ['6988', 'Junta Nacional de Jardines Infantiles'],
  ['7501', 'Gobierno Regional de Antofagasta'],
  ['7055', 'Carabineros de Chile - Dirección de Logística'],
  ['7199', 'Municipalidad de Puerto Montt'],
  ['7266', 'Servicio Nacional de Menores'],
].map(([CodigoEmpresa, NombreEmpresa]) => ({ CodigoEmpresa, NombreEmpresa }));

const PROVEEDORES = [
  { Codigo: '17793', Nombre: 'Comercial Andes SpA', Rut: '76.543.210-3' },
  { Codigo: '20411', Nombre: 'Servicios Integrales Pacífico Ltda.', Rut: '77.111.222-6' },
  { Codigo: '31877', Nombre: 'Tecnología Austral S.A.', Rut: '96.555.444-0' },
  { Codigo: '45012', Nombre: 'Constructora Cordillera SpA', Rut: '78.900.123-5' },
  { Codigo: '52230', Nombre: 'Insumos Médicos del Sur Ltda.', Rut: '76.222.333-3' },
];

const RUBROS = [
  ['Adquisición de insumos médicos', 'Equipamiento y suministros médicos', 'Guantes de nitrilo'],
  ['Servicio de aseo y mantención', 'Servicios de limpieza', 'Servicio de aseo industrial'],
  ['Compra de computadores portátiles', 'Equipos informáticos', 'Notebook 14 pulgadas'],
  ['Reparación de veredas', 'Obras civiles', 'Hormigón premezclado'],
  ['Alimentación para jardines infantiles', 'Alimentos', 'Raciones diarias'],
  ['Arriendo de vehículos', 'Transporte', 'Camioneta 4x4'],
  ['Licencias de software de gestión', 'Software', 'Licencia anual'],
  ['Mobiliario escolar', 'Muebles', 'Silla escolar'],
  ['Servicio de seguridad', 'Servicios de vigilancia', 'Guardia de seguridad 12 h'],
  ['Materiales de oficina', 'Artículos de oficina', 'Resma papel carta'],
];

const ESTADOS_LIC: Array<[number, string]> = [
  [5, 'Publicada'], [6, 'Cerrada'], [7, 'Desierta'], [8, 'Adjudicada'], [18, 'Revocada'], [19, 'Suspendida'],
];
const ESTADOS_OC: Array<[number, string]> = [
  [4, 'Enviada a proveedor'], [6, 'Aceptada'], [9, 'Cancelada'], [12, 'Recepción conforme'], [13, 'Pendiente de recepcionar'],
];
const TIPOS = ['L1', 'LE', 'LP', 'LQ', 'LR'];

const iso = (d: Date) => d.toISOString().slice(0, 19);
const sumarDias = (base: Date, dias: number, horas = 15) => {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + dias);
  d.setUTCHours(horas, 0, 0, 0);
  return d;
};

function generarLicitaciones(): Licitacion[] {
  const r = rng(42);
  const hoy = new Date(`${hoyEnChile()}T12:00:00Z`);
  return Array.from({ length: 140 }, (_, i) => {
    const org = ORGANISMOS[Math.floor(r() * ORGANISMOS.length)];
    const [nombre, categoria, producto] = RUBROS[Math.floor(r() * RUBROS.length)];
    const tipo = TIPOS[Math.floor(r() * TIPOS.length)];
    // ~45 % publicadas (activas), el resto en otros estados
    const [codEstado, estado] = r() < 0.45 ? ESTADOS_LIC[0] : ESTADOS_LIC[1 + Math.floor(r() * 5)];
    const publicada = sumarDias(hoy, -Math.floor(r() * 25), 9);
    const cierre = codEstado === 5 ? sumarDias(hoy, 1 + Math.floor(r() * 20)) : sumarDias(publicada, 10);
    const monto = Math.round((2 + r() * 400) * 1_000_000);
    const codigo = `${org.CodigoEmpresa.slice(0, 4)}-${100 + i}-${tipo}${String(25 + Math.floor(r() * 2))}`;
    const cantidad = 1 + Math.floor(r() * 500);
    const adjudicada = codEstado === 8;
    const prov = PROVEEDORES[Math.floor(r() * PROVEEDORES.length)];
    return {
      CodigoExterno: codigo,
      Nombre: `${nombre} – ${org.NombreEmpresa}`,
      CodigoEstado: codEstado,
      FechaCierre: iso(cierre),
      Estado: estado,
      Descripcion: `${nombre} para ${org.NombreEmpresa}. Datos de ejemplo generados localmente (no corresponden a una licitación real).`,
      Comprador: {
        CodigoOrganismo: org.CodigoEmpresa,
        NombreOrganismo: org.NombreEmpresa,
        RutUnidad: '61.000.000-0',
        CodigoUnidad: `${org.CodigoEmpresa}1`,
        NombreUnidad: 'Unidad de Abastecimiento',
        ComunaUnidad: ['Valparaíso', 'Santiago', 'Concepción', 'Temuco', 'Antofagasta', 'Puerto Montt'][Math.floor(r() * 6)],
        RegionUnidad: ['Región de Valparaíso', 'Región Metropolitana de Santiago', 'Región del Biobío', 'Región de La Araucanía', 'Región de Antofagasta', 'Región de Los Lagos'][Math.floor(r() * 6)],
        NombreUsuario: 'Encargado/a de compras',
      },
      DiasCierreLicitacion: String(Math.max(0, Math.round((cierre.getTime() - hoy.getTime()) / 86_400_000))),
      CodigoTipo: 1,
      Tipo: tipo,
      TipoConvocatoria: '1',
      Moneda: 'CLP',
      Etapas: 1 + Math.floor(r() * 2),
      CantidadReclamos: Math.floor(r() * 3),
      Fechas: {
        FechaCreacion: iso(sumarDias(publicada, -2, 10)),
        FechaPublicacion: iso(publicada),
        FechaCierre: iso(cierre),
        FechaInicio: iso(publicada),
        FechaFinal: iso(sumarDias(cierre, -3)),
        FechaPubRespuestas: iso(sumarDias(cierre, -2)),
        FechaActoAperturaTecnica: iso(sumarDias(cierre, 0, 16)),
        FechaActoAperturaEconomica: iso(sumarDias(cierre, 0, 16)),
        FechaEstimadaAdjudicacion: iso(sumarDias(cierre, 15)),
        FechaAdjudicacion: adjudicada ? iso(sumarDias(cierre, 12)) : null,
      },
      MontoEstimado: r() < 0.7 ? monto : null,
      VisibilidadMonto: 1,
      Modalidad: 1,
      TipoPago: '2',
      NombreResponsableContrato: 'Responsable de contrato',
      TiempoDuracionContrato: String(1 + Math.floor(r() * 24)),
      Adjudicacion: adjudicada
        ? { Tipo: 1, Fecha: iso(sumarDias(cierre, 12)), Numero: `RES-${1000 + i}`, NumeroOferentes: 1 + Math.floor(r() * 8), UrlActa: '' }
        : null,
      Items: {
        Cantidad: 1,
        Listado: [
          {
            Correlativo: 1,
            CodigoProducto: 42000000 + i,
            CodigoCategoria: String(42000000 + Math.floor(r() * 99999)),
            Categoria: categoria,
            NombreProducto: producto,
            Descripcion: `${producto} según bases técnicas`,
            UnidadMedida: 'Unidad',
            Cantidad: cantidad,
            Adjudicacion: adjudicada
              ? { RutProveedor: prov.Rut, NombreProveedor: prov.Nombre, Cantidad: cantidad, MontoUnitario: Math.round(monto / cantidad) }
              : null,
          },
        ],
      },
    } satisfies Licitacion;
  });
}

function generarOrdenes(lics: Licitacion[]): OrdenCompra[] {
  const r = rng(7);
  const hoy = new Date(`${hoyEnChile()}T12:00:00Z`);
  return Array.from({ length: 160 }, (_, i) => {
    const org = ORGANISMOS[Math.floor(r() * ORGANISMOS.length)];
    const prov = PROVEEDORES[Math.floor(r() * PROVEEDORES.length)];
    const [nombre, categoria, producto] = RUBROS[Math.floor(r() * RUBROS.length)];
    const [codEstado, estado] = ESTADOS_OC[Math.floor(r() * ESTADOS_OC.length)];
    const creada = sumarDias(hoy, -Math.floor(r() * 10), 8 + Math.floor(r() * 9));
    const cantidad = 1 + Math.floor(r() * 200);
    const precio = Math.round(5_000 + r() * 400_000);
    const neto = cantidad * precio;
    const iva = Math.round(neto * 0.19);
    const lic = r() < 0.5 ? lics[Math.floor(r() * lics.length)].CodigoExterno : undefined;
    return {
      Codigo: `${org.CodigoEmpresa}-${300 + i}-${['SE', 'CM', 'AG'][Math.floor(r() * 3)]}25`,
      Nombre: nombre,
      CodigoEstado: codEstado,
      Estado: estado,
      CodigoLicitacion: lic,
      Descripcion: `${nombre}. Datos de ejemplo (ficticios).`,
      Tipo: lic ? 'SE' : 'CM',
      TipoMoneda: 'CLP',
      EstadoProveedor: codEstado === 4 ? 'Pendiente' : 'Aceptada',
      Fechas: {
        FechaCreacion: iso(creada),
        FechaEnvio: iso(creada),
        FechaAceptacion: codEstado !== 4 ? iso(sumarDias(creada, 1, 11)) : null,
        FechaCancelacion: codEstado === 9 ? iso(sumarDias(creada, 2, 11)) : null,
        FechaUltimaModificacion: iso(sumarDias(creada, 2, 11)),
      },
      TieneItems: 1,
      TotalNetoOC: neto,
      PorcentajeIva: 19,
      Impuestos: iva,
      Total: neto + iva,
      Financiamiento: 'Presupuesto institucional',
      Pais: 'CL',
      TipoDespacho: 'Despacho a dirección de envío',
      FormaPago: '30 días contra recepción conforme',
      Comprador: { CodigoOrganismo: org.CodigoEmpresa, NombreOrganismo: org.NombreEmpresa, NombreUnidad: 'Unidad de Abastecimiento', RutUnidad: '61.000.000-0' },
      Proveedor: {
        Codigo: prov.Codigo,
        Nombre: prov.Nombre,
        RutSucursal: prov.Rut,
        NombreSucursal: 'Casa matriz',
        Comuna: 'Santiago',
        Region: 'Región Metropolitana de Santiago',
        NombreContacto: 'Contacto comercial',
      },
      Items: {
        Cantidad: 1,
        Listado: [
          {
            Correlativo: 1,
            Categoria: categoria,
            Producto: producto,
            EspecificacionComprador: `${producto} según requerimiento`,
            EspecificacionProveedor: `${producto} marca genérica`,
            Cantidad: cantidad,
            Unidad: 'Unidad',
            Moneda: 'CLP',
            PrecioNeto: precio,
            Total: neto,
          },
        ],
      },
    } satisfies OrdenCompra;
  });
}

const resumenLic = ({ CodigoExterno, Nombre, CodigoEstado, FechaCierre }: Licitacion): Licitacion => ({
  CodigoExterno, Nombre, CodigoEstado, FechaCierre,
});
const resumenOC = ({ Codigo, Nombre, CodigoEstado }: OrdenCompra): OrdenCompra => ({ Codigo, Nombre, CodigoEstado });

const envolver = <T>(Listado: T[]): RespuestaListado<T> => ({
  Cantidad: Listado.length,
  FechaCreacion: new Date().toISOString(),
  Version: 'v1-mock',
  Listado,
});

const ESTADO_A_COD_LIC: Record<string, number> = { publicada: 5, cerrada: 6, desierta: 7, adjudicada: 8, revocada: 18, suspendida: 19 };
const ESTADO_A_COD_OC: Record<string, number> = {
  enviadaproveedor: 4, aceptada: 6, cancelada: 9, recepcionconforme: 12, pendienterecepcion: 13,
};

export function crearFuenteMock(): FuenteDatos {
  const lics = generarLicitaciones();
  const ocs = generarOrdenes(lics);
  let usadas = 0;
  const contar = async <T>(v: T) => {
    usadas++;
    await new Promise((r) => setTimeout(r, 120)); // simula latencia
    return v;
  };

  return {
    obtenerLicitacion: (codigo) => contar(lics.find((l) => l.CodigoExterno === codigo) ?? null),
    licitacionesActivas: () => contar(envolver(lics.filter((l) => l.CodigoEstado === 5).map(resumenLic))),
    listarLicitaciones: (f: FiltrosListado<EstadoLicitacion> = {}) => {
      let res = lics;
      if (f.estado === 'activas') res = res.filter((l) => l.CodigoEstado === 5);
      else if (f.estado && f.estado !== 'todos') res = res.filter((l) => l.CodigoEstado === ESTADO_A_COD_LIC[f.estado!]);
      if (f.codigoOrganismo) res = res.filter((l) => l.Comprador?.CodigoOrganismo === String(f.codigoOrganismo));
      if (f.codigoProveedor) {
        const prov = PROVEEDORES.find((p) => p.Codigo === String(f.codigoProveedor));
        res = res.filter((l) => l.Items?.Listado.some((it) => it.Adjudicacion?.RutProveedor === prov?.Rut));
      }
      return contar(envolver(res.map(resumenLic)));
    },
    obtenerOrdenCompra: (codigo) => contar(ocs.find((o) => o.Codigo === codigo) ?? null),
    listarOrdenesCompra: (f: FiltrosListado<EstadoOrdenCompra> = {}) => {
      let res = ocs;
      if (f.estado && f.estado !== 'todos') res = res.filter((o) => o.CodigoEstado === ESTADO_A_COD_OC[f.estado!]);
      if (f.codigoOrganismo) res = res.filter((o) => o.Comprador?.CodigoOrganismo === String(f.codigoOrganismo));
      if (f.codigoProveedor) res = res.filter((o) => o.Proveedor?.Codigo === String(f.codigoProveedor));
      return contar(envolver(res.map(resumenOC)));
    },
    buscarProveedor: async (rut) => {
      if (!validarRut(rut)) {
        const { MercadoPublicoError } = await import('@mp/sdk');
        throw new MercadoPublicoError(`RUT inválido: ${rut}`, { status: 400 });
      }
      const p = PROVEEDORES.find((x) => limpiarRut(x.Rut) === limpiarRut(rut));
      return contar(p ? { CodigoEmpresa: p.Codigo, NombreEmpresa: p.Nombre } : null);
    },
    buscarCompradores: () => contar(ORGANISMOS),
    estadoCuota: () => ({ dia: hoyEnChile(), usadas, limite: 10_000, restantes: 10_000 - usadas }),
  };
}
