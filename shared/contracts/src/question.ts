import { z } from 'zod'
import { Bi, IsoTime, Ulid } from './common'

/** `PUT /v1/visits/:visitId/questions/:qId`: staff ask a multiple-choice question. */
export const AskBody = z.object({ question: Bi, answers: z.array(Bi).min(2).max(4) })
export type AskBody = z.infer<typeof AskBody>

export const AnswerBody = z.object({ index: z.number().int().min(0).max(3) })
export type AnswerBody = z.infer<typeof AnswerBody>

export const Question = AskBody.extend({
  id: Ulid,
  askedBy: z.string(),
  askedAt: IsoTime,
  answer: z.number().int().optional(),
  answeredAt: IsoTime.optional(),
  dismissedAt: IsoTime.optional(),
})
export type Question = z.infer<typeof Question>

export const QuestionParams = z.object({ visitId: Ulid, qId: Ulid })
export type QuestionParams = z.infer<typeof QuestionParams>
