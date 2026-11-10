import { z } from 'zod'
import { IsoTime, Ulid } from './common'

/** Camera features: eye control (plan 02) and the face pain check (plan 03). */
export const Feature = z.enum(['gaze', 'face'])
export type Feature = z.infer<typeof Feature>

export const ConsentBody = z.object({
  agreedBy: z.enum(['patient', 'staff-proxy']),
  /** Feature-specific; plans 02 and 03 narrow this with their own schemas. */
  settings: z.record(z.string(), z.unknown()).default({}),
})
export type ConsentBody = z.infer<typeof ConsentBody>

export const Consent = ConsentBody.extend({
  feature: Feature,
  enabledBy: z.string(),
  enabledAt: IsoTime,
  revokedAt: IsoTime.optional(),
})
export type Consent = z.infer<typeof Consent>

export const ConsentParams = z.object({ visitId: Ulid, feature: Feature })
export type ConsentParams = z.infer<typeof ConsentParams>
