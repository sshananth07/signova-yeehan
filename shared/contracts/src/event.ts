import { z } from 'zod'
import { IsoTime, Kind, Ulid } from './common'

/** Kinds only staff-side routes create (replies log `staff`/`reply` rows); a board may not send them. */
export const STAFF_ONLY_KINDS = ['staff', 'reply'] as const

/** `PUT /v1/visits/:visitId/events/:eventId` from the board. Mirrors the frontend `LogEvent` input. */
export const NewEventBody = z.object({
  kind: Kind,
  src: z.string().min(1).max(60),
  en: z.string().min(1).max(1000),
  bm: z.string().min(1).max(1000),
  score: z.number().int().min(0).max(10).optional(),
  site: z.string().max(80).optional(),
  /** Staff-only detail, e.g. the anatomy structure tapped. */
  detail: z.string().max(200).optional(),
})
export type NewEventBody = z.infer<typeof NewEventBody>

/** One row of the message history as stored and as read by listeners. */
export const Event = NewEventBody.extend({
  id: Ulid,
  /** Display number `#n`, assigned by the server in a transaction. */
  n: z.number().int().positive(),
  createdAt: IsoTime,
  seen: z.boolean(),
  seenAt: IsoTime.optional(),
  seenBy: z.string().optional(),
  doneAt: IsoTime.optional(),
  doneBy: z.string().optional(),
  /** A staff reply promised help by this time; late rows are flagged at the Station. */
  dueAt: IsoTime.optional(),
  /** How many times the patient asked before it was done (repeats within 2 min merge). */
  asks: z.number().int().positive(),
  /** Cloud Storage path of a drawing, read via a signed URL. */
  imgPath: z.string().optional(),
})
export type Event = z.infer<typeof Event>

export const EventParams = z.object({ visitId: Ulid, eventId: Ulid })
export type EventParams = z.infer<typeof EventParams>
