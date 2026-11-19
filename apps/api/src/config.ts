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
    .default('http://localhost:5173,capacitor://localhost,http://localhost')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  MP_DAILY_LIMIT: z.coerce.number().int().positive().default(9500),
  MP_MIN_INTERVAL_MS: z.coerce.number().int().nonnegative().default(250),
  CLIENT_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(120),
  /** Carpeta con el build del frontend para servirlo desde el mismo backend (opcional). */
  WEB_DIST: z.string().optional(),
  TRUST_PROXY: z.string().optional(),
});

export type Config = z.infer<typeof Esquema>;

export function cargarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const cfg = Esquema.parse(env);
  if (!cfg.MP_MOCK && !cfg.MP_TICKET) {
    throw new Error(
      'Falta MP_TICKET. Copia .env.example a .env y agrega tu ticket, o usa MP_MOCK=true para datos de ejemplo.',
    );
  }
  return cfg;
}
