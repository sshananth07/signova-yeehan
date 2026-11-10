import { Injectable } from '@nestjs/common'
import type { Consent, ConsentBody, Feature } from '@signova/contracts'
import type { StaffPrincipal } from '../common/auth/principal'
import { Clock } from '../common/clock'
import { todo } from '../common/todo'
import { VisitsRepository } from '../visits/visits.repository'
import { ConsentsRepository } from './consents.repository'

/** Opt-in for camera features: `gaze` (plan 02) and `face` (plan 03). Ending a visit revokes all (B.5). */
@Injectable()
export class ConsentsService {
  constructor(
    private readonly consents: ConsentsRepository,
    private readonly visits: VisitsRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * TODO(B.10):
   *  1. Load the visit (404); `assertWard(staff, visit)`; ended visit → 409.
   *  2. Validate body.settings with the feature's schema once plans 02/03 add them (until then accept {}).
   *  3. `consents.put(visitId, { feature, ...body, enabledBy: staff.uid, enabledAt: now })`.
   */
  async enable(staff: StaffPrincipal, visitId: string, feature: Feature, body: ConsentBody): Promise<Consent> {
    return todo('B.10')
  }

  /** TODO(B.10): ward check; `consents.revoke(visitId, feature, now)`. Revoking twice is fine (204). */
  async revoke(staff: StaffPrincipal, visitId: string, feature: Feature): Promise<void> {
    return todo('B.10')
  }
}
