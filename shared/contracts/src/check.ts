import { z } from 'zod'
import { IsoTime, Ulid } from './common'

/** Pain check-back: today's `CHECK_MS` (45 min) and `SNOOZE_MS` (15 min) in store.ts. */
export const CHECK_MIN = 45
export const SNOOZE_MIN = 15

export const StartCheckBody = z.object({ site: z.string().max(80), painEventId: Ulid })
export type StartCheckBody = z.infer<typeof StartCheckBody>

/** The patient's new pain report answers the check-back. */
export const AnswerCheckBody = z.object({ eventId: Ulid })
export type AnswerCheckBody = z.infer<typeof AnswerCheckBody>

export const Check = StartCheckBody.extend({
  id: Ulid,
  dueAt: IsoTime,
  snoozedUntil: IsoTime.optional(),
  answeredAt: IsoTime.optional(),
  eventId: Ulid.optional(),
})
export type Check = z.infer<typeof Check>

export const CheckParams = z.object({ visitId: Ulid, checkId: Ulid })
export type CheckParams = z.infer<typeof CheckParams>
