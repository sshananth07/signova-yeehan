import { Injectable } from '@nestjs/common'
import type { ConfigSet, Device, EnrolDeviceBody, EnrolDeviceResult, PatchDeviceBody, WardQuery } from '@signova/contracts'
import type { DevicePrincipal, StaffPrincipal } from '../common/auth/principal'
import { Clock } from '../common/clock'
import { todo } from '../common/todo'
import { ConfigSetsRepository } from '../config/config-sets.repository'
import { DevicesRepository } from './devices.repository'

@Injectable()
export class DevicesService {
  constructor(
    private readonly devices: DevicesRepository,
    private readonly configSets: ConfigSetsRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * TODO(B.15):
   *  1. q.ward given → it must be one of admin.wards (403); otherwise use all of admin.wards.
   *  2. `devices.list(wards)`; strip secretHash/secretSalt (DevicesRepository returns DeviceDoc).
   *  3. Sort by ward, then label.
   */
  async list(admin: StaffPrincipal, q: WardQuery): Promise<Device[]> {
    return todo('B.15')
  }

  /**
   * TODO(B.3):
   *  1. Admin must have `body.ward` in their wards (403 otherwise); configSetId must exist (400).
   *  2. deviceId = Firestore auto-id; secret = randomBytes(32).toString('base64url'); salt = randomBytes(16).
   *  3. hash = scrypt(secret, salt, 64); `devices.create(...)` stores hash + salt only.
   *  4. Write an `audit` entry { action: 'device.enrol' }.
   *  5. Return { deviceId, deviceSecret: secret }: the only time the secret is ever returned.
   */
  async enrol(admin: StaffPrincipal, body: EnrolDeviceBody): Promise<EnrolDeviceResult> {
    return todo('B.3')
  }

  /** TODO(B.3): ward check, `devices.update`, audit { action: 'device.update' }. */
  async patch(admin: StaffPrincipal, deviceId: string, body: PatchDeviceBody): Promise<void> {
    return todo('B.3')
  }

  /** TODO(B.3): new secret + salt as in enrol; the old secret stops working at once. Audit. Returns the new secret once. */
  async rotate(admin: StaffPrincipal, deviceId: string): Promise<EnrolDeviceResult> {
    return todo('B.3')
  }

  /** TODO(B.3): set revokedAt; `auth.revokeRefreshTokens(deviceId)` so the session ends within the hour. Audit. */
  async revoke(admin: StaffPrincipal, deviceId: string): Promise<void> {
    return todo('B.3')
  }

  /** TODO(B.10): load the caller's device, then `configSets.get(device.configSetId)`; set Cache-Control: max-age=300. */
  async myConfig(device: DevicePrincipal): Promise<ConfigSet> {
    return todo('B.10')
  }
}
