import { Inject, Injectable } from '@nestjs/common'
import type { EndReason, Visit } from '@signova/contracts'
import type { Firestore, Transaction } from 'firebase-admin/firestore'
import { todo } from '../common/todo'
import { FIRESTORE } from '../firebase/firebase.module'

/** Stored visit: the public fields plus server bookkeeping. */
export type VisitDoc = Visit & { nextN: number; expireAt?: string }

/**
 * Firestore access for `visits/{visitId}`. Every visit-scoped module (events, replies, questions,
 * checks, alarms, drawings, consents) loads its visit through `get()` to check the ward first.
 */
@Injectable()
export class VisitsRepository {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  /** TODO(B.5): read visits/{id} (inside `tx` when given); undefined if missing. */
  async get(id: string, tx?: Transaction): Promise<VisitDoc | undefined> {
    return todo('B.5')
  }

  /**
   * TODO(B.5): in ONE transaction:
   *  1. read devices/{deviceId}; if currentVisitId is set and that visit has no endedAt, end it
   *     (endedAt = at, endReason = previousEndReason, expireAt = at + ward.retentionDays).
   *  2. create visits/{id} { deviceId, ward, profile, location (copied from the device), startedAt: at, nextN: 1 }.
   *  3. set devices/{deviceId}.currentVisitId = id.
   *  A retried start with the same id returns without changes (idempotent).
   */
  async start(id: string, deviceId: string, previousEndReason: EndReason, at: Date): Promise<VisitDoc> {
    return todo('B.5')
  }

  /**
   * TODO(B.5): in ONE batch: set endedAt, endedBy, endReason, expireAt (ward.retentionDays);
   * set `revokedAt` on every active doc in visits/{id}/consents; clear devices.currentVisitId if it points here.
   * Ending an ended visit is a no-op.
   */
  async end(id: string, reason: EndReason, by: string, at: Date): Promise<void> {
    return todo('B.5')
  }
}
