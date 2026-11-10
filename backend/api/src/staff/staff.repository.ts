import { Inject, Injectable } from '@nestjs/common'
import type { PatchStaffBody, Staff } from '@signova/contracts'
import type { Firestore } from 'firebase-admin/firestore'
import { todo } from '../common/todo'
import { FIRESTORE } from '../firebase/firebase.module'

/** Firestore access for `staff/{uid}` and `audit/{id}`. */
@Injectable()
export class StaffRepository {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  /** TODO(B.4): read staff/{uid}; undefined if missing. AuthGuard caches the result for 60 s. */
  async get(uid: string): Promise<Staff | undefined> {
    return todo('B.4')
  }

  /** TODO(B.15): `where('wards', 'array-contains-any', wards)` (up to 30 values; chunk beyond). */
  async list(wards: string[]): Promise<Staff[]> {
    return todo('B.15')
  }

  /** TODO(B.4): `.create()` staff/{uid}. */
  async create(staff: Staff): Promise<void> {
    return todo('B.4')
  }

  /** TODO(B.4): `.update()` the given fields (including `active: false` on disable). */
  async update(uid: string, patch: PatchStaffBody & { active?: boolean }): Promise<void> {
    return todo('B.4')
  }

  /** TODO(B.4): add audit/{auto-id} { at, actor, action, target, ward }. Admin actions only, never patient data. */
  async audit(entry: { at: Date; actor: string; action: string; target: string; ward?: string }): Promise<void> {
    return todo('B.4')
  }
}
