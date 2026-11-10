import { Inject, Injectable } from '@nestjs/common'
import type { DeviceTokenBody, DeviceTokenResult, Me } from '@signova/contracts'
import type { Auth } from 'firebase-admin/auth'
import type { Principal } from '../common/auth/principal'
import { Clock } from '../common/clock'
import { todo } from '../common/todo'
import { DevicesRepository } from '../devices/devices.repository'
import { FIREBASE_AUTH } from '../firebase/firebase.module'
import { StaffRepository } from '../staff/staff.repository'

@Injectable()
export class AuthService {
  constructor(
    @Inject(FIREBASE_AUTH) private readonly auth: Auth,
    private readonly devices: DevicesRepository,
    private readonly staff: StaffRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * TODO(B.3):
   *  1. `this.devices.get(body.deviceId)`; missing or `revokedAt` set → 401 (same message for both,
   *     so the response doesn't reveal which device ids exist).
   *  2. Verify the secret: `crypto.scrypt(body.deviceSecret, device.secretSalt, 64)` compared with
   *     `crypto.timingSafeEqual` against `device.secretHash`. Mismatch → 401.
   *  3. Claims: { kind: 'device', deviceId, role: profile === 'station' ? 'station' : 'board', ward }.
   *  4. `token = await this.auth.createCustomToken(deviceId, claims)`; expiresAt = now + 1 h.
   *  5. `this.devices.touch(deviceId, now)`, at most once per 5 min (skip if lastSeenAt is recent).
   *  Tests: wrong secret 401; revoked 401; claims exact; secret never stored or logged.
   */
  async deviceToken(body: DeviceTokenBody): Promise<DeviceTokenResult> {
    return todo('B.3')
  }

  /**
   * TODO(B.3, B.4):
   *  - device → load the device doc, return { kind: 'device', deviceId, role, profile, ward }
   *  - staff  → load staff/{uid}, return { kind: 'staff', uid, displayName, staffNo, role, wards }
   */
  async me(principal: Principal): Promise<Me> {
    return todo('B.3/B.4')
  }
}
