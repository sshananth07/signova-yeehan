import { Inject, Injectable } from '@nestjs/common'
import type { Firestore } from 'firebase-admin/firestore'
import { Clock } from '../common/clock'
import { todo } from '../common/todo'
import { DrawingsRepository } from '../drawings/drawings.repository'
import { FIRESTORE } from '../firebase/firebase.module'

/**
 * Deletes ended visits after `ward.retentionDays`. Firestore TTL removes the visit doc but NOT its
 * subcollections or Storage files, so this job does the full cleanup. Safe to re-run.
 */
@Injectable()
export class RetentionService {
  constructor(
    @Inject(FIRESTORE) private readonly db: Firestore,
    private readonly drawings: DrawingsRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * TODO(B.11):
   *  1. Query visits where expireAt <= now (limit 100 per page).
   *  2. For each: `this.db.recursiveDelete(visitRef)` (deletes subcollections in batches),
   *     then `drawings.deleteVisit(visitId)`.
   *  3. Repeat until the query is empty; return the count. Log counts only, never ids with content.
   *  Test (emulator): a visit 31 days after ending is fully gone; an active visit is untouched.
   */
  async run(): Promise<number> {
    return todo('B.11')
  }
}
