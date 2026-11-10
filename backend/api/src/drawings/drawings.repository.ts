import { Inject, Injectable } from '@nestjs/common'
import type { Storage } from 'firebase-admin/storage'
import { todo } from '../common/todo'
import { STORAGE } from '../firebase/firebase.module'

/** Cloud Storage objects at `visits/{visitId}/drawings/{eventId}.jpg`. */
@Injectable()
export class DrawingsRepository {
  constructor(@Inject(STORAGE) private readonly storage: Storage) {}

  static path(visitId: string, eventId: string) {
    return `visits/${visitId}/drawings/${eventId}.jpg`
  }

  /** TODO(B.9): `bucket().file(path).save(bytes, { contentType: 'image/jpeg', resumable: false })`. Same path again overwrites (idempotent). */
  async save(path: string, bytes: Buffer): Promise<void> {
    return todo('B.9')
  }

  /** TODO(B.9): `file(path).getSignedUrl({ action: 'read', expires: expiresAt })`; missing file → 404. */
  async signedUrl(path: string, expiresAt: Date): Promise<string> {
    return todo('B.9')
  }

  /** TODO(B.11): delete every object under `visits/{visitId}/` (retention job). */
  async deleteVisit(visitId: string): Promise<void> {
    return todo('B.11')
  }
}
