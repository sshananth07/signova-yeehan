import { Injectable } from '@nestjs/common'
import type { EndVisitBody, StartVisitBody, Visit } from '@signova/contracts'
import type { DevicePrincipal, Principal } from '../common/auth/principal'
import { Clock } from '../common/clock'
import { todo } from '../common/todo'
import { VisitsRepository } from './visits.repository'

@Injectable()
export class VisitsService {
  constructor(
    private readonly visits: VisitsRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * Board starts a visit (New visit, idle guard, profile switch, first launch).
   * TODO(B.5):
   *  1. Only `board` devices (route guard). The visit belongs to `board.deviceId`.
   *  2. `visits.start(visitId, board.deviceId, body.previousEndReason, clock.now())`.
   *  3. Return the visit without bookkeeping fields (drop nextN, expireAt).
   *  Tests: two starts leave one active visit per device; a retried start is idempotent.
   */
  async start(board: DevicePrincipal, visitId: string, body: StartVisitBody): Promise<Visit> {
    return todo('B.5')
  }

  /**
   * TODO(B.5):
   *  1. Load the visit (404 if missing); `assertWard(caller, visit)`.
   *  2. `visits.end(visitId, body.reason, caller id (deviceId or uid), clock.now())`.
   *  Test: ending revokes every consent in the visit.
   */
  async end(caller: Principal, visitId: string, body: EndVisitBody): Promise<void> {
    return todo('B.5')
  }
}
