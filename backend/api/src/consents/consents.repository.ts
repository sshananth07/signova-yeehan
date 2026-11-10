import { Inject, Injectable } from '@nestjs/common'
import type { Consent, Feature } from '@signova/contracts'
import type { Firestore } from 'firebase-admin/firestore'
import { todo } from '../common/todo'
import { FIRESTORE } from '../firebase/firebase.module'

/** Firestore access for `visits/{visitId}/consents/{feature}`. */
@Injectable()
export class ConsentsRepository {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  /** TODO(B.10): `.set()` the consent (re-enabling after a revoke starts a fresh record: clear revokedAt). */
  async put(visitId: string, consent: Consent): Promise<void> {
    return todo('B.10')
  }

  /** TODO(B.10): read one; undefined if missing. Active means `!revokedAt`. Plan 03's pain-check writes call this. */
  async get(visitId: string, feature: Feature): Promise<Consent | undefined> {
    return todo('B.10')
  }

  /** TODO(B.10): set revokedAt once. Never delete: the record stays readable as an audit trail. */
  async revoke(visitId: string, feature: Feature, at: Date): Promise<void> {
    return todo('B.10')
  }
}
