import { Injectable } from '@nestjs/common'
import type { DrawingUrl } from '@signova/contracts'
import type { DevicePrincipal, Principal } from '../common/auth/principal'
import { Clock } from '../common/clock'
import { todo } from '../common/todo'
import { EventsRepository } from '../events/events.repository'
import { VisitsRepository } from '../visits/visits.repository'
import { DrawingsRepository } from './drawings.repository'

/** Patient drawings (Draw tab): today an inline JPEG on the event, here a Storage object + `imgPath`. */
@Injectable()
export class DrawingsService {
  constructor(
    private readonly drawings: DrawingsRepository,
    private readonly events: EventsRepository,
    private readonly visits: VisitsRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * TODO(B.9):
   *  1. Load visit + event (404); `assertWard(board, visit)`.
   *  2. bytes.length > MAX_DRAWING_BYTES → 413 TOO_LARGE (the raw parser limit catches most first).
   *  3. Check JPEG magic bytes FF D8 FF; anything else → 400 VALIDATION ("Drawing must be a JPEG").
   *  4. `drawings.save(DrawingsRepository.path(visitId, eventId), bytes)`; set the event's `imgPath`.
   */
  async upload(board: DevicePrincipal, visitId: string, eventId: string, bytes: Buffer): Promise<void> {
    return todo('B.9')
  }

  /**
   * TODO(B.9):
   *  1. Load visit + event; `assertWard(caller, visit)`; no imgPath → 404.
   *  2. expiresAt = now + 5 min; return { url: await drawings.signedUrl(imgPath, expiresAt), expiresAt }.
   */
  async url(caller: Principal, visitId: string, eventId: string): Promise<DrawingUrl> {
    return todo('B.9')
  }
}
