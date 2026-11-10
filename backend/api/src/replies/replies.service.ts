import { Injectable } from '@nestjs/common'
import type { Reply, SendReplyBody } from '@signova/contracts'
import type { DevicePrincipal, StaffPrincipal } from '../common/auth/principal'
import { Clock } from '../common/clock'
import { todo } from '../common/todo'
import { EventsRepository } from '../events/events.repository'
import { VisitsRepository } from '../visits/visits.repository'
import { RepliesRepository } from './replies.repository'

@Injectable()
export class RepliesService {
  constructor(
    private readonly replies: RepliesRepository,
    private readonly events: EventsRepository,
    private readonly visits: VisitsRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * Staff send a short reply; the board shows and speaks it (as today's ReplyPicker / sendReply).
   * TODO(B.7):
   *  1. Load the visit (404); `assertWard(staff, { ...visit, profile })`: a clerk on a bedside board → 403.
   *  2. dueAt = body.dueMin ? now + dueMin : undefined.
   *  3. `replies.create(visitId, { id: replyId, text, icon, toEvents, dueAt, sentBy: staff.uid, sentAt: now })`.
   *  4. For each of body.toEvents: `events.setSeen(..., true, staff.uid, now)` (first writer wins).
   *  5. dueAt set → `events.setDue(visitId, toEvents, dueAt)`.
   *  Tests: a due reply sets dueAt on every target; a retried PUT doesn't duplicate.
   */
  async send(staff: StaffPrincipal, visitId: string, replyId: string, body: SendReplyBody): Promise<Reply> {
    return todo('B.7')
  }

  /** TODO(B.7): load visit, `assertWard(board, visit)`, `replies.dismiss(visitId, replyId, now)`. */
  async dismiss(board: DevicePrincipal, visitId: string, replyId: string): Promise<void> {
    return todo('B.7')
  }
}
