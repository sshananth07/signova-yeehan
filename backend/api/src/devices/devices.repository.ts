import { Inject, Injectable } from '@nestjs/common'
import type { Device, EnrolDeviceBody, PatchDeviceBody } from '@signova/contracts'
import type { Firestore } from 'firebase-admin/firestore'
import { todo } from '../common/todo'
import { FIRESTORE } from '../firebase/firebase.module'

/** Stored device doc: the public fields plus the secret hash, which never leaves this class. */
export type DeviceDoc = Device & { secretHash: string; secretSalt: string }

/** Firestore access for `devices/{deviceId}` only. Services hold the rules. */
@Injectable()
export class DevicesRepository {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  /** TODO(B.3): `this.db.doc(`devices/${id}`).get()`; convert Timestamps to ISO; undefined if missing. */
  async get(id: string): Promise<DeviceDoc | undefined> {
    return todo('B.3')
  }

  /** TODO(B.15): `where('ward', 'in', wards)` (Firestore allows up to 30 values; chunk if an admin has more). */
  async list(wards: string[]): Promise<DeviceDoc[]> {
    return todo('B.15')
  }

  /** TODO(B.3): `.create()` (fails if the id exists) with enrolledBy, enrolledAt, the hash and salt. */
  async create(id: string, body: EnrolDeviceBody, secret: { hash: string; salt: string }, by: string, at: Date): Promise<void> {
    return todo('B.3')
  }

  /** TODO(B.3): `.update()` only the given fields; 404 if missing. */
  async update(id: string, patch: PatchDeviceBody | Partial<DeviceDoc>): Promise<void> {
    return todo('B.3')
  }

  /** TODO(B.3): set lastSeenAt; best effort, never fails the request. */
  async touch(id: string, at: Date): Promise<void> {
    return todo('B.3')
  }
}
