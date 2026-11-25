import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MercadoPublicoError } from '@mp/sdk';
import { crearApp } from '../src/app.js';
import { crearFuenteMock } from '../src/mock.js';
import { ServicioMercadoPublico } from '../src/servicio.js';
import type { FuenteDatos } from '../src/fuente.js';

let fuente: FuenteDatos;
let app: ReturnType<typeof crearApp>;

beforeEach(() => {
  fuente = crearFuenteMock();
  app = crearApp({ servicio: new ServicioMercadoPublico(fuente), corsOrigins: ['http://localhost:5173'], modoMock: true });
});

describe('API', () => {
  it('responde el healthcheck', async () => {
    const r = await request(app).get('/api/v1/salud');
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });

  it('lista licitaciones activas paginadas y con nombre de estado', async () => {
    const r = await request(app).get('/api/v1/licitaciones?estado=activas&porPagina=10');
    expect(r.status).toBe(200);
    expect(r.body.items).toHaveLength(10);
    expect(r.body.total).toBeGreaterThan(10);
    expect(r.body.items.every((l: any) => l.EstadoNombre === 'Publicada')).toBe(true);
    // ordenadas por fecha de cierre ascendente
    const cierres = r.body.items.map((l: any) => l.FechaCierre);
    expect([...cierres].sort()).toEqual(cierres);
  });

  it('cachea: la segunda consulta no vuelve a llamar a la fuente', async () => {
    const espia = vi.spyOn(fuente, 'licitacionesActivas');
    await request(app).get('/api/v1/licitaciones?estado=activas');
    const r2 = await request(app).get('/api/v1/licitaciones?estado=activas&pagina=2');
    expect(espia).toHaveBeenCalledTimes(1);
    expect(r2.headers['x-cache']).toBe('HIT');
  });

  it('deduplica peticiones simultáneas idénticas', async () => {
    const espia = vi.spyOn(fuente, 'listarOrdenesCompra');
    await Promise.all(Array.from({ length: 5 }, () => request(app).get('/api/v1/ordenes-compra')));
    expect(espia).toHaveBeenCalledTimes(1);
  });

  it('filtra por texto sin distinguir tildes', async () => {
    const r = await request(app).get('/api/v1/licitaciones?estado=todos&q=adquisicion%20insumos&porPagina=200');
    expect(r.status).toBe(200);
    expect(r.body.total).toBeGreaterThan(0);
    expect(r.body.items.every((l: any) => l.Nombre.includes('Adquisición de insumos'))).toBe(true);
  });

  it('valida parámetros', async () => {
    expect((await request(app).get('/api/v1/licitaciones?estado=inventado')).status).toBe(400);
    expect((await request(app).get('/api/v1/licitaciones?fecha=2024-13-01')).status).toBe(400);
    expect((await request(app).get('/api/v1/licitaciones?fecha=2999-01-01')).status).toBe(400);
    expect((await request(app).get('/api/v1/ordenes-compra?porPagina=1000')).status).toBe(400);
  });

  it('entrega el detalle de una licitación y 404 si no existe', async () => {
    const lista = await request(app).get('/api/v1/licitaciones?estado=todos&porPagina=1');
    const codigo = lista.body.items[0].CodigoExterno;
    const det = await request(app).get(`/api/v1/licitaciones/${codigo}`);
    expect(det.status).toBe(200);
    expect(det.body.Comprador.NombreOrganismo).toBeTruthy();
    expect((await request(app).get('/api/v1/licitaciones/0000-0-XX00')).status).toBe(404);
  });

  it('busca proveedor por RUT y valida el dígito verificador', async () => {
    const ok = await request(app).get('/api/v1/proveedores/76.543.210-3');
    expect(ok.status).toBe(200);
    expect(ok.body.CodigoEmpresa).toBe('17793');
    expect((await request(app).get('/api/v1/proveedores/76.543.210-9')).status).toBe(400);
  });

  it('filtra órdenes por proveedor', async () => {
    const r = await request(app).get('/api/v1/ordenes-compra?proveedor=17793&porPagina=200');
    expect(r.status).toBe(200);
    expect(r.body.total).toBeGreaterThan(0);
  });

  it('busca compradores', async () => {
    const r = await request(app).get('/api/v1/compradores?q=municipalidad');
    expect(r.status).toBe(200);
    expect(r.body.items.every((c: any) => c.NombreEmpresa.startsWith('Municipalidad'))).toBe(true);
  });

  it('traduce errores de Mercado Público a 502', async () => {
    vi.spyOn(fuente, 'obtenerOrdenCompra').mockRejectedValue(new MercadoPublicoError('Ticket no válido.', { codigo: 203, status: 500 }));
    const r = await request(app).get('/api/v1/ordenes-compra/1-1-SE25');
    expect(r.status).toBe(502);
    // no se filtra el mensaje interno de la API oficial (estado del ticket)
    expect(JSON.stringify(r.body)).not.toContain('Ticket');
    expect(r.body.codigoMP).toBeUndefined();
  });

  it('elimina datos personales de contacto en los detalles', async () => {
    const lista = await request(app).get('/api/v1/licitaciones?estado=todos&porPagina=1');
    const det = await request(app).get(`/api/v1/licitaciones/${lista.body.items[0].CodigoExterno}`);
    expect(det.body.Comprador.NombreUsuario).toBeUndefined();
    expect(det.body.NombreResponsableContrato).toBeUndefined();
    expect(det.body.Comprador.NombreOrganismo).toBeTruthy();

    const ocs = await request(app).get('/api/v1/ordenes-compra?porPagina=1');
    const oc = await request(app).get(`/api/v1/ordenes-compra/${ocs.body.items[0].Codigo}`);
    expect(oc.body.Proveedor.NombreContacto).toBeUndefined();
    expect(oc.body.Proveedor.Nombre).toBeTruthy();
  });

  it('limita por IP las consultas que gastan cuota, pero no los aciertos de caché', async () => {
    const app2 = crearApp({ servicio: new ServicioMercadoPublico(crearFuenteMock()), limiteConsultasNuevasPorHora: 2, modoMock: true });
    expect((await request(app2).get('/api/v1/licitaciones/A-1-L125')).status).toBe(404); // miss 1
    expect((await request(app2).get('/api/v1/licitaciones/A-2-L125')).status).toBe(404); // miss 2
    expect((await request(app2).get('/api/v1/licitaciones/A-3-L125')).status).toBe(429); // bloqueado
  });

  it('envía Content-Security-Policy', async () => {
    const r = await request(app).get('/api/v1/salud');
    expect(r.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('/estado público solo muestra el porcentaje; con token, el detalle', async () => {
    const token = 'x'.repeat(32);
    const conToken = crearApp({ servicio: new ServicioMercadoPublico(fuente), modoMock: true, tokenAdmin: token });
    const pub = await request(conToken).get('/api/v1/estado');
    expect(pub.body.cuota).toEqual({ porcentaje: expect.any(Number) });
    expect(pub.body.cache).toBeUndefined();
    const malo = await request(conToken).get('/api/v1/estado').set('Authorization', 'Bearer otro');
    expect(malo.body.cache).toBeUndefined();
    const admin = await request(conToken).get('/api/v1/estado').set('Authorization', `Bearer ${token}`);
    expect(admin.body.cuota.limite).toBeGreaterThan(0);
    expect(admin.body.cache).toBeDefined();
  });

  it('respeta CORS solo para orígenes permitidos', async () => {
    const ok = await request(app).get('/api/v1/salud').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const no = await request(app).get('/api/v1/salud').set('Origin', 'https://malicioso.example');
    expect(no.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sin orígenes configurados no habilita CORS para nadie', async () => {
    const sinCors = crearApp({ servicio: new ServicioMercadoPublico(fuente), modoMock: true });
    const r = await request(sinCors).get('/api/v1/salud').set('Origin', 'https://cualquiera.example');
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('la CSP no permite estilos inline', async () => {
    const r = await request(app).get('/api/v1/salud');
    expect(r.headers['content-security-policy']).toContain("style-src 'self';");
  });

  it('expone la especificación OpenAPI', async () => {
    const r = await request(app).get('/api/v1/openapi.json');
    expect(r.body.openapi).toBe('3.1.0');
  });
});
