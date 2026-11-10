import type { StaffRole } from '@signova/contracts'

/** A board or the Station, signed in with a custom token from POST /v1/auth/device-token. */
export type DevicePrincipal = { kind: 'device'; deviceId: string; role: 'board' | 'station'; ward: string }

/**
 * A staff member (Firebase Auth user). On a shared patient tablet the request also carries
 * `X-Device-Id`, so the API knows which board the staff action happened on.
 */
export type StaffPrincipal = { kind: 'staff'; uid: string; role: StaffRole; wards: string[]; deviceId?: string }

export type Principal = DevicePrincipal | StaffPrincipal

/** Device roles and staff roles share one namespace, so `@Allow('board', 'nurse')` reads naturally. */
export type Role = DevicePrincipal['role'] | StaffRole

export const STAFF: Role[] = ['nurse', 'clerk', 'admin']
export const ANYONE: Role[] = ['board', 'station', 'nurse', 'clerk', 'admin']
