import { z } from 'zod'
import { Bi, IsoTime, Profile } from './common'

export const EndReason = z.enum(['new-visit', 'idle', 'profile-switch', 'staff'])
export type EndReason = z.infer<typeof EndReason>

export const Visit = z.object({
  id: z.string(),
  deviceId: z.string(),
  ward: z.string(),
  profile: Profile,
  location: Bi,
  startedAt: IsoTime,
  endedAt: IsoTime.optional(),
  endedBy: z.string().optional(),
  endReason: EndReason.optional(),
})
export type Visit = z.infer<typeof Visit>

/** `PUT /v1/visits/:visitId`: the device's previous visit is ended with this reason. */
export const StartVisitBody = z.object({ previousEndReason: EndReason.default('new-visit') })
export type StartVisitBody = z.infer<typeof StartVisitBody>

export const EndVisitBody = z.object({ reason: EndReason })
export type EndVisitBody = z.infer<typeof EndVisitBody>
