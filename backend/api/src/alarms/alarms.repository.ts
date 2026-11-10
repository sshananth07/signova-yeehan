import { Inject, Injectable } from '@nestjs/common'
import type { Alarm } from '@signova/contracts'
import type { Firestore } from 'firebase-admin/firestore'
import { todo } from '../common/todo'
import { FIRESTORE } from '../firebase/firebase.module'

/** Firestore access for `visits/{visitId}/alarms/{alarmId}`. */
@Injectable()
export class AlarmsRepository {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  /**
   * TODO(B.8): ONE batch: create the alarm { id, raisedAt: at } AND an `alert` event
   * ('Emergency button pressed.' / 'Butang kecemasan ditekan.', src 'Emergency button'), assigning
   * its n from visit.nextN like EventsRepository.add. Alarm already exists → return it (idempotent).
   */
  async raise(visitId: string, alarmId: string, at: Date): Promise<Alarm> {
    return todo('B.8')
  }

  /**
   * TODO(B.8): transaction: already closed → 409 CONFLICT; else set outcome and
   * ack → ackBy + ackAt; cancel → cancelledAt. Also mark the alert event seen (as today's stopAlarm).
   */
  async close(visitId: string, alarmId: string, outcome: 'ack' | 'cancel', by: string, at: Date): Promise<void> {
    return todo('B.8')
  }
}
