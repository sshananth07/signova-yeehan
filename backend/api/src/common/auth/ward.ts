import { todo } from '../todo'
import type { Principal } from './principal'

/** The fields of a visit (or device) that decide who may touch it. */
export type Scoped = { ward: string; deviceId: string }

/**
 * Throws 403 unless the caller may act on this visit.
 *
 * TODO(B.4):
 *  - board:   target.deviceId === principal.deviceId (a board only touches its own visits)
 *  - station: target.ward === principal.ward
 *  - staff:   principal.wards.includes(target.ward); a clerk may only act on `fd` (front desk)
 *             visits, so callers pass the visit's profile and clerks on `bs` get 403
 *  Unit test every branch, including "clerk replying on a bedside board → 403".
 */
export function assertWard(principal: Principal, target: Scoped & { profile?: 'fd' | 'bs' }): void {
  return todo('B.4')
}
