import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../src/config.js';

const base = { MP_MOCK: 'true' };

describe('config', () => {
  it('rechaza TRUST_PROXY=true (permitiría falsificar la IP del cliente)', () => {
    expect(() => cargarConfig({ ...base, TRUST_PROXY: 'true' })).toThrow(/TRUST_PROXY/);
    expect(cargarConfig({ ...base, TRUST_PROXY: '1' }).TRUST_PROXY).toBe('1');
  });

  it('rechaza CORS_ORIGINS="*" en producción', () => {
    expect(() => cargarConfig({ ...base, NODE_ENV: 'production', CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
    expect(cargarConfig({ ...base, CORS_ORIGINS: '*' }).CORS_ORIGINS).toEqual(['*']);
  });
});
