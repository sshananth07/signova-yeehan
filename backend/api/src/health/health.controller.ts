import { Controller, Get, Inject } from '@nestjs/common'
import type { Firestore } from 'firebase-admin/firestore'
import { Public } from '../common/auth/decorators'
import { todo } from '../common/todo'
import { FIRESTORE } from '../firebase/firebase.module'

/** Outside the /v1 prefix (see app.setup.ts). Cloud Run probes these. */
@Public()
@Controller()
export class HealthController {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  /** Liveness: the process is up. Real in Phase A, so Cloud Run can start the container. */
  @Get('healthz')
  healthz() {
    return { status: 'ok' }
  }

  /**
   * Readiness: dependencies answer.
   * TODO(B.1):
   *  1. `await this.db.collection('wards').limit(1).get()` with a 2 s timeout.
   *  2. Ok → { status: 'ok' }; failure → 503 { error: { code: 'INTERNAL', message: 'Database unavailable' } }.
   */
  @Get('readyz')
  async readyz() {
    return todo('B.1')
  }
}
