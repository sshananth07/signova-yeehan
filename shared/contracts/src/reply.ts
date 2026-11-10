import { z } from 'zod'
import { Bi, IconName, IsoTime, Ulid } from './common'

/** `PUT /v1/visits/:visitId/replies/:replyId` from staff. */
export const SendReplyBody = z.object({
  text: Bi,
  icon: IconName,
  /** Message rows this answers; they become seen. */
  toEvents: z.array(Ulid).max(20).default([]),
  /** "In 10 minutes": sets `dueAt` on the answered rows. */
  dueMin: z.number().int().min(1).max(240).optional(),
})
export type SendReplyBody = z.infer<typeof SendReplyBody>

export const Reply = SendReplyBody.omit({ dueMin: true }).extend({
  id: Ulid,
  dueAt: IsoTime.optional(),
  sentBy: z.string(),
  sentAt: IsoTime,
  dismissedAt: IsoTime.optional(),
})
export type Reply = z.infer<typeof Reply>

export const ReplyParams = z.object({ visitId: Ulid, replyId: Ulid })
export type ReplyParams = z.infer<typeof ReplyParams>
