import { Injectable } from '@nestjs/common'
import type { AnswerCheckBody, Check, StartCheckBody } from '@signova/contracts'
import type { DevicePrincipal } from '../common/auth/principal'
import { Clock } from '../common/clock'
import { todo } from '../common/todo'
import { EventsRepository } from '../events/events.repository'
import { VisitsRepository } from '../visits/visits.repository'
import { ChecksRepository } from './checks.repository'

/**
 * The pain check-back: after a pain report the board asks again later (today's `check`,
 * `checkPain`, `snoozeCheck` in store.ts). Stored so the Station can show "check due".
 */
@Injectable()
export class ChecksService {
  constructor(
    private readonly checks: ChecksRepository,
    private readonly events: EventsRepository,
    private readonly visits: VisitsRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * TODO(B.8):
   *  1. Load the visit; `assertWard(board, visit)`; body.painEventId must exist and be kind `pain` (400).
   *  2. `checks.create(visitId, { id: checkId, ...body, dueAt: now + CHECK_MIN })`.
   */
  async start(board: DevicePrincipal, visitId: string, checkId: string, body: StartCheckBody): Promise<Check> {
    return todo('B.8')
  }

  /** TODO(B.8): ward check; `checks.snooze(visitId, checkId, now + SNOOZE_MIN)`. */
  async snooze(board: DevicePrincipal, visitId: string, checkId: string): Promise<void> {
    return todo('B.8')
  }

  /** TODO(B.8): ward check; body.eventId must be a `pain` event in this visit; `checks.answer(...)`. */
  async answer(board: DevicePrincipal, visitId: string, checkId: string, body: AnswerCheckBody): Promise<void> {
    return todo('B.8')
  }
}
