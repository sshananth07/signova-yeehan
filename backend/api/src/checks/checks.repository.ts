import { Inject, Injectable } from '@nestjs/common'
import type { Check } from '@signova/contracts'
import type { Firestore } from 'firebase-admin/firestore'
import { todo } from '../common/todo'
import { FIRESTORE } from '../firebase/firebase.module'

/** Firestore access for `visits/{visitId}/checks/{checkId}` (pain check-back). */
@Injectable()
export class ChecksRepository {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  /** TODO(B.8): `.create()`; exists → return it (idempotent). */
  async create(visitId: string, check: Check): Promise<Check> {
    return todo('B.8')
  }

  /** TODO(B.8): set snoozedUntil (answered → 409). */
  async snooze(visitId: string, checkId: string, until: Date): Promise<void> {
    return todo('B.8')
  }

  /** TODO(B.8): set answeredAt + eventId once (already answered → no change). */
  async answer(visitId: string, checkId: string, eventId: string, at: Date): Promise<void> {
    return todo('B.8')
  }
}
