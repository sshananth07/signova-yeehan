import { Inject, Injectable } from '@nestjs/common'
import type { InviteStaffBody, InviteStaffResult, PatchStaffBody, Staff, WardQuery } from '@signova/contracts'
import type { Auth } from 'firebase-admin/auth'
import type { StaffPrincipal } from '../common/auth/principal'
import { Clock } from '../common/clock'
import { todo } from '../common/todo'
import { FIREBASE_AUTH } from '../firebase/firebase.module'
import { StaffRepository } from './staff.repository'

@Injectable()
export class StaffService {
  constructor(
    @Inject(FIREBASE_AUTH) private readonly auth: Auth,
    private readonly staff: StaffRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * TODO(B.15):
   *  1. q.ward given → must be one of admin.wards (403); otherwise all of admin.wards.
   *  2. `staff.list(wards)`; sort active first, then by displayName.
   */
  async list(admin: StaffPrincipal, q: WardQuery): Promise<Staff[]> {
    return todo('B.15')
  }

  /**
   * TODO(B.4):
   *  1. Every ward in body.wards must be one of the admin's wards (403 otherwise).
   *  2. `this.auth.createUser({ email, displayName })`; email already used → 409 CONFLICT.
   *  3. `this.auth.setCustomUserClaims(uid, { kind: 'staff', role, wards })`.
   *  4. `staff.create({ uid, ..., active: true, createdBy: admin.uid, createdAt: now })`.
   *  5. `passwordLink = await this.auth.generatePasswordResetLink(email)`; the admin hands it over.
   *  6. Audit { action: 'staff.invite' }.
   */
  async invite(admin: StaffPrincipal, body: InviteStaffBody): Promise<InviteStaffResult> {
    return todo('B.4')
  }

  /**
   * TODO(B.4):
   *  1. An admin can't remove their own admin role (409), so a ward never loses its last admin by accident.
   *  2. Update claims, then `staff.update`; the next token refresh carries the new claims.
   *  3. Audit { action: 'staff.update' }.
   */
  async patch(admin: StaffPrincipal, uid: string, body: PatchStaffBody): Promise<void> {
    return todo('B.4')
  }

  /**
   * TODO(B.4):
   *  1. `staff.update(uid, { active: false })`: AuthGuard rejects them on the next request.
   *  2. `this.auth.updateUser(uid, { disabled: true })` and `revokeRefreshTokens(uid)`.
   *  3. Audit { action: 'staff.disable' }.
   */
  async disable(admin: StaffPrincipal, uid: string): Promise<void> {
    return todo('B.4')
  }
}
