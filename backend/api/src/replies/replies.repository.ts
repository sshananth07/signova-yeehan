import { Inject, Injectable } from '@nestjs/common'
import type { Reply } from '@signova/contracts'
import type { Firestore } from 'firebase-admin/firestore'
import { todo } from '../common/todo'
import { FIRESTORE } from '../firebase/firebase.module'

/** Firestore access for `visits/{visitId}/replies/{replyId}`. */
@Injectable()
export class RepliesRepository {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  /** TODO(B.7): `.create()`; already exists → return the stored reply (idempotent). */
  async create(visitId: string, reply: Reply): Promise<Reply> {
    return todo('B.7')
  }

  /** TODO(B.7): set dismissedAt once (already dismissed → no change). Never delete: the Staff view keeps it. */
  async dismiss(visitId: string, replyId: string, at: Date): Promise<void> {
    return todo('B.7')
  }
}
