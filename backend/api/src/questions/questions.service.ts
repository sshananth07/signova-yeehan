import { Injectable } from '@nestjs/common'
import type { AnswerBody, AskBody, Question } from '@signova/contracts'
import type { DevicePrincipal, StaffPrincipal } from '../common/auth/principal'
import { Clock } from '../common/clock'
import { todo } from '../common/todo'
import { EventsRepository } from '../events/events.repository'
import { VisitsRepository } from '../visits/visits.repository'
import { QuestionsRepository } from './questions.repository'

@Injectable()
export class QuestionsService {
  constructor(
    private readonly questions: QuestionsRepository,
    private readonly events: EventsRepository,
    private readonly visits: VisitsRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * Staff ask the patient a multiple-choice question (today's simulated "Ask by voice" → activeQ).
   * TODO(B.7):
   *  1. Load the visit (404); `assertWard(staff, visit)`.
   *  2. `questions.create(visitId, { id: qId, ...body, askedBy: staff.uid, askedAt: now })`.
   *  The board's listener shows the answer cards; plan 01 later opens forms instead where it fits.
   */
  async ask(staff: StaffPrincipal, visitId: string, qId: string, body: AskBody): Promise<Question> {
    return todo('B.7')
  }

  /**
   * TODO(B.7):
   *  1. Load visit + question (404); `assertWard(board, visit)`; index >= answers.length → 400.
   *  2. `questions.answer(visitId, qId, index, now)` (409 if already answered).
   *  3. Log an `answer` event with a server-made id, exactly as today:
   *     en: `Staff asked "${q.question.en}" → ${answer.en}.`, bm likewise, src: 'Staff question', seen: true.
   */
  async answer(board: DevicePrincipal, visitId: string, qId: string, body: AnswerBody): Promise<void> {
    return todo('B.7')
  }

  /** TODO(B.7): load visit, `assertWard(board, visit)`, `questions.dismiss(...)`. */
  async dismiss(board: DevicePrincipal, visitId: string, qId: string): Promise<void> {
    return todo('B.7')
  }
}
