import { z } from 'zod'
import { Bi, IsoTime } from './common'

export const DeviceProfile = z.enum(['fd', 'bs', 'station'])
export type DeviceProfile = z.infer<typeof DeviceProfile>

export const Device = z.object({
  id: z.string(),
  label: z.string().min(1).max(80),
  ward: z.string().min(1).max(40),
  profile: DeviceProfile,
  location: Bi,
  configSetId: z.string(),
  currentVisitId: z.string().optional(),
  enrolledBy: z.string(),
  enrolledAt: IsoTime,
  lastSeenAt: IsoTime.optional(),
  revokedAt: IsoTime.optional(),
  /** Plan 03 Phase 4 only: allows face crops to the inference service. */
  validationMode: z.boolean().default(false),
})
export type Device = z.infer<typeof Device>

/** Admin lists (`GET /v1/devices`, `GET /v1/staff`): optionally narrowed to one of the admin's wards. */
export const WardQuery = z.object({ ward: z.string().min(1).max(40).optional() })
export type WardQuery = z.infer<typeof WardQuery>

export const EnrolDeviceBody = Device.pick({ label: true, ward: true, profile: true, location: true, configSetId: true })
export type EnrolDeviceBody = z.infer<typeof EnrolDeviceBody>
/** Returned once; only a hash of the secret is stored. */
export const EnrolDeviceResult = z.object({ deviceId: z.string(), deviceSecret: z.string().min(32) })
export type EnrolDeviceResult = z.infer<typeof EnrolDeviceResult>

export const PatchDeviceBody = EnrolDeviceBody.partial().extend({ validationMode: z.boolean().optional() })
export type PatchDeviceBody = z.infer<typeof PatchDeviceBody>

export const DeviceTokenBody = z.object({ deviceId: z.string(), deviceSecret: z.string().min(32) })
export type DeviceTokenBody = z.infer<typeof DeviceTokenBody>
/** A Firebase custom token; the device signs in with it (claims: kind, deviceId, role, ward). */
export const DeviceTokenResult = z.object({ token: z.string(), expiresAt: IsoTime })
export type DeviceTokenResult = z.infer<typeof DeviceTokenResult>
