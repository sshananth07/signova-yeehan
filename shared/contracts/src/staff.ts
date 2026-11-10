import { z } from 'zod'
import { IsoTime } from './common'
import { DeviceProfile } from './device'

export const StaffRole = z.enum(['nurse', 'clerk', 'admin'])
export type StaffRole = z.infer<typeof StaffRole>

export const Staff = z.object({
  uid: z.string(),
  displayName: z.string().min(1).max(80),
  staffNo: z.string().min(1).max(20),
  role: StaffRole,
  wards: z.array(z.string()).min(1),
  active: z.boolean(),
  createdBy: z.string(),
  createdAt: IsoTime,
})
export type Staff = z.infer<typeof Staff>

export const InviteStaffBody = Staff.pick({ displayName: true, staffNo: true, role: true, wards: true }).extend({ email: z.email() })
export type InviteStaffBody = z.infer<typeof InviteStaffBody>
/** The admin hands the password-set link to the new staff member (no email service yet). */
export const InviteStaffResult = z.object({ uid: z.string(), passwordLink: z.url() })
export type InviteStaffResult = z.infer<typeof InviteStaffResult>

export const PatchStaffBody = Staff.pick({ displayName: true, role: true, wards: true }).partial()
export type PatchStaffBody = z.infer<typeof PatchStaffBody>

/** `GET /v1/me`: whoever is calling, device or staff. */
export const Me = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('device'), deviceId: z.string(), role: z.enum(['board', 'station']), profile: DeviceProfile, ward: z.string() }),
  z.object({ kind: z.literal('staff'), uid: z.string(), displayName: z.string(), staffNo: z.string(), role: StaffRole, wards: z.array(z.string()) }),
])
export type Me = z.infer<typeof Me>
