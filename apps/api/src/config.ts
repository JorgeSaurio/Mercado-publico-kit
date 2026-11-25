import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const Esquema = z.object({
  MP_TICKET: z.string().optional().default(''),
  MP_MOCK: bool,
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGINS: z
    .string()
    // capacitor://localhost = iOS; https://localhost = Android con androidScheme 'https'
    .default('http://localhost:5173,capacitor://localhost,https://localhost')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  MP_DAILY_LIMIT: z.coerce.number().int().positive().default(9500),
  MP_MIN_INTERVAL_MS: z.coerce.number().int().nonnegative().default(250),
  CLIENT_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(120),
  /** Consultas nuevas (no cacheadas) por IP y hora: evita que un cliente agote la cuota diaria. */
  CLIENT_MISS_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(150),
  /** Carpeta con el build del frontend para servirlo desde el mismo backend (opcional). */
  WEB_DIST: z.string().optional(),
  /** Número de proxies, IP o subred de confianza. 'true' (confiar en todos) permite falsificar la IP del cliente. */
  TRUST_PROXY: z
    .string()
    .optional()
    .refine((v) => v === undefined || !/^(true|\*)$/i.test(v.trim()), {
      message: 'TRUST_PROXY=true permite falsificar X-Forwarded-For: usa el número de proxies (p. ej. 1) o su IP/subred',
    }),
  NODE_ENV: z.string().optional(),
  /** Token (mín. 24 caracteres) para ver el detalle de /api/v1/estado con Authorization: Bearer. */
  ADMIN_TOKEN: z.string().min(24, 'ADMIN_TOKEN debe tener al menos 24 caracteres').optional(),
});

export type Config = z.infer<typeof Esquema>;

export function cargarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const cfg = Esquema.parse(env);
  if (!cfg.MP_MOCK && !cfg.MP_TICKET) {
    throw new Error(
      'Falta MP_TICKET. Copia .env.example a .env y agrega tu ticket, o usa MP_MOCK=true para datos de ejemplo.',
    );
  }
  if (cfg.NODE_ENV === 'production' && cfg.CORS_ORIGINS.includes('*')) {
    throw new Error('CORS_ORIGINS="*" no está permitido en producción: indica los orígenes exactos.');
  }
  return cfg;
}
