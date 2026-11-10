import { z } from 'zod'

/** Versioned and immutable once published; a device points at one id. */
export const ConfigSet = z.object({
  version: z.number().int().positive(),
  gaze: z.object({ dwellMs: z.number().int().min(600).max(2000) }).optional(),
  /** Plan 03 Task 3.1 replaces this with its sensitivity/cooldown schema. */
  face: z.unknown().optional(),
})
export type ConfigSet = z.infer<typeof ConfigSet>

/** One row of `GET /v1/config-sets` (the admin's Settings list). */
export const ConfigSetSummary = z.object({ id: z.string(), version: z.number().int().positive(), devices: z.number().int().min(0) })
export type ConfigSetSummary = z.infer<typeof ConfigSetSummary>

export const ConfigSetParams = z.object({ id: z.string().min(1).max(60) })
export type ConfigSetParams = z.infer<typeof ConfigSetParams>
