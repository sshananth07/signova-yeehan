import { Injectable } from '@nestjs/common'
import type { Event, NewEventBody } from '@signova/contracts'
import type { DevicePrincipal, StaffPrincipal } from '../common/auth/principal'
import { Clock } from '../common/clock'
import { todo } from '../common/todo'
import { VisitsRepository } from '../visits/visits.repository'
import { EventsRepository } from './events.repository'

@Injectable()
export class EventsService {
  constructor(
    private readonly events: EventsRepository,
    private readonly visits: VisitsRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * Board adds a patient event (card tap, pain report, typed text, answer...).
   * TODO(B.6):
   *  1. Load the visit (404); `assertWard(board, visit)`; ended visit → 409 "This visit has ended".
   *  2. body.kind in STAFF_ONLY_KINDS (`staff`, `reply`) → 403: boards can't impersonate staff rows.
   *  3. `events.add(visitId, eventId, body, clock.now())` and return the stored event.
   *  Tests: retried PUT → one event, one n; same request 3× within 2 min → asks 3, unseen again;
   *  unknown kind → 400 (pipe); staff-only kind → 403.
   */
  async add(board: DevicePrincipal, visitId: string, eventId: string, body: NewEventBody): Promise<Event> {
    return todo('B.6')
  }

  /**
   * TODO(B.6):
   *  1. Load visit + event (404 each); `assertWard(staff, visit)`.
   *  2. `events.setSeen(visitId, eventId, on, staff.uid, clock.now())`.
   *  Test: two staff marking seen at once → one seenAt, one seenBy (the first); both get 204.
   */
  async setSeen(staff: StaffPrincipal, visitId: string, eventId: string, on: boolean): Promise<void> {
    return todo('B.6')
  }

  /** TODO(B.6): as setSeen, then `events.setDone(...)`. Done rows leave the Station's open list. */
  async done(staff: StaffPrincipal, visitId: string, eventId: string): Promise<void> {
    return todo('B.6')
  }
}
