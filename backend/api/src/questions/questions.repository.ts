import { Inject, Injectable } from '@nestjs/common'
import type { Question } from '@signova/contracts'
import type { Firestore } from 'firebase-admin/firestore'
import { todo } from '../common/todo'
import { FIRESTORE } from '../firebase/firebase.module'

/** Firestore access for `visits/{visitId}/questions/{qId}`. */
@Injectable()
export class QuestionsRepository {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  /** TODO(B.7): `.create()`; already exists → return it (idempotent). */
  async create(visitId: string, q: Question): Promise<Question> {
    return todo('B.7')
  }

  /** TODO(B.7): read one; undefined if missing. */
  async get(visitId: string, qId: string): Promise<Question | undefined> {
    return todo('B.7')
  }

  /** TODO(B.7): transaction: already answered → 409 CONFLICT; else set answer + answeredAt. */
  async answer(visitId: string, qId: string, index: number, at: Date): Promise<void> {
    return todo('B.7')
  }

  /** TODO(B.7): set dismissedAt once. */
  async dismiss(visitId: string, qId: string, at: Date): Promise<void> {
    return todo('B.7')
  }
}
