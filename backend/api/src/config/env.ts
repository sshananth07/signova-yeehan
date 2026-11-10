import { z } from 'zod'

/** Validated once at startup; a bad value stops the service instead of failing later. */
const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(8080),
  GOOGLE_CLOUD_PROJECT: z.string().default('demo-signova'),
  STORAGE_BUCKET: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:5173').transform(s => s.split(',').map(o => o.trim()).filter(Boolean)),
  /** Flask inference service (plans 02 and 03); unset until Phase 4 of plan 03. */
  INFERENCE_URL: z.url().optional(),
})

export type Env = z.infer<typeof Env>
export const env: Env = Env.parse(process.env)
