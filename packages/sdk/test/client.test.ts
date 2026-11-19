import { describe, expect, it, vi } from 'vitest';
import {
  CuotaAgotadaError,
  MercadoPublicoClient,
  MercadoPublicoError,
  calcularDv,
  formatearFechaMP,
  formatearRut,
  validarRut,
} from '../src/index.js';

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const listado = (Listado: unknown[]) => ({ Cantidad: Listado.length, FechaCreacion: '', Version: 'v1', Listado });

function crear(fetchMock: typeof fetch, extra: Partial<ConstructorParameters<typeof MercadoPublicoClient>[0]> = {}) {
  return new MercadoPublicoClient({ ticket: 'TICKET-123', fetch: fetchMock, intervaloMinimoMs: 0, ...extra });
}

describe('utilidades', () => {
  it('formatea fechas al formato ddmmaaaa', () => {
    expect(formatearFechaMP('2024-02-03')).toBe('03022024');
    expect(formatearFechaMP('03022024')).toBe('03022024');
    expect(formatearFechaMP(new Date(2024, 11, 25))).toBe('25122024');
    expect(() => formatearFechaMP('2024-02-30')).toThrow(RangeError);
    expect(() => formatearFechaMP('ayer')).toThrow(RangeError);
  });

  it('valida y formatea RUT', () => {
    expect(calcularDv('70017820')).toBe('K');
    expect(validarRut('70.017.820-k')).toBe(true);
    expect(validarRut('70017820K')).toBe(true);
    expect(validarRut('70.017.820-1')).toBe(false);
    expect(formatearRut('70017820k')).toBe('70.017.820-K');
  });
});

describe('MercadoPublicoClient', () => {
  it('arma la URL con ticket y parámetros correctos', async () => {
    const fetchMock = vi.fn(async () => ok(listado([{ CodigoExterno: '1-1-L1', Nombre: 'X', CodigoEstado: 5 }])));
    const c = crear(fetchMock as any);
    await c.listarLicitaciones({ fecha: '2024-02-02', estado: 'adjudicada', codigoOrganismo: 6945 });
    const url = new URL(String((fetchMock.mock.calls[0] as any[])[0]));
    expect(url.pathname).toBe('/servicios/v1/publico/licitaciones.json');
    expect(url.searchParams.get('fecha')).toBe('02022024');
    expect(url.searchParams.get('estado')).toBe('adjudicada');
    expect(url.searchParams.get('CodigoOrganismo')).toBe('6945');
    expect(url.searchParams.get('ticket')).toBe('TICKET-123');
  });

  it('agrega la fecha de hoy si se filtra por organismo sin fecha', async () => {
    const fetchMock = vi.fn(async () => ok(listado([])));
    await crear(fetchMock as any).listarOrdenesCompra({ codigoProveedor: 17793 });
    const url = new URL(String((fetchMock.mock.calls[0] as any[])[0]));
    expect(url.searchParams.get('fecha')).toMatch(/^\d{8}$/);
  });

  it('devuelve null si una licitación no existe', async () => {
    const c = crear((async () => ok(listado([]))) as any);
    expect(await c.obtenerLicitacion('NO-EXISTE')).toBeNull();
  });

  it('convierte { Codigo, Mensaje } en MercadoPublicoError', async () => {
    const c = crear((async () => ok({ Codigo: 203, Mensaje: 'Ticket no válido.' }, 500)) as any, { reintentos: 0 });
    await expect(c.licitacionesActivas()).rejects.toMatchObject({ codigo: 203, message: 'Ticket no válido.' });
  });

  it('reintenta ante peticiones simultáneas y luego responde', async () => {
    let n = 0;
    const fetchMock = vi.fn(async () =>
      ++n === 1
        ? ok({ Codigo: 10500, Mensaje: 'Lo sentimos. Hemos detectado que existen peticiones simultáneas.' }, 500)
        : ok(listado([{ Codigo: 'OC-1', Nombre: 'Y', CodigoEstado: 6 }])),
    );
    const c = crear(fetchMock as any, { reintentos: 2 });
    const r = await c.listarOrdenesCompra();
    expect(r.Listado[0].Codigo).toBe('OC-1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('nunca ejecuta dos peticiones en paralelo', async () => {
    let enVuelo = 0;
    let maximo = 0;
    const fetchMock = vi.fn(async () => {
      enVuelo++;
      maximo = Math.max(maximo, enVuelo);
      await new Promise((r) => setTimeout(r, 10));
      enVuelo--;
      return ok(listado([]));
    });
    const c = crear(fetchMock as any);
    await Promise.all([c.licitacionesActivas(), c.listarOrdenesCompra(), c.obtenerLicitacion('A'), c.obtenerOrdenCompra('B')]);
    expect(maximo).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('corta al llegar al límite diario', async () => {
    const c = crear((async () => ok(listado([]))) as any, { limiteDiario: 2 });
    await c.licitacionesActivas();
    await c.licitacionesActivas();
    await expect(c.licitacionesActivas()).rejects.toBeInstanceOf(CuotaAgotadaError);
    expect(c.estadoCuota()).toMatchObject({ usadas: 2, restantes: 0 });
  });

  it('busca proveedor enviando el RUT con puntos y guion', async () => {
    const fetchMock = vi.fn(async () =>
      ok({ Cantidad: 1, FechaCreacion: '', listaEmpresas: [{ CodigoEmpresa: '17793', NombreEmpresa: 'ACME' }] }),
    );
    const r = await crear(fetchMock as any).buscarProveedor('70017820K');
    const url = new URL(String((fetchMock.mock.calls[0] as any[])[0]));
    expect(url.searchParams.get('rutempresaproveedor')).toBe('70.017.820-k');
    expect(r?.CodigoEmpresa).toBe('17793');
  });

  it('rechaza RUT inválido sin gastar cuota', async () => {
    const fetchMock = vi.fn();
    const c = crear(fetchMock as any);
    await expect(c.buscarProveedor('11.111.111-2')).rejects.toBeInstanceOf(MercadoPublicoError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no filtra el ticket en los logs', async () => {
    const logs: string[] = [];
    const c = crear((async () => ok(listado([]))) as any, { onPeticion: (i) => logs.push(i.url) });
    await c.licitacionesActivas();
    expect(logs[0]).not.toContain('TICKET-123');
    expect(logs[0]).toContain('ticket=***');
  });
});
