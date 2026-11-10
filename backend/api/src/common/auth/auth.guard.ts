import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Auth } from 'firebase-admin/auth'
import { FIREBASE_AUTH } from '../../firebase/firebase.module'
import { todo } from '../todo'
import { ALLOW_KEY, PUBLIC_KEY } from './decorators'
import type { Role } from './principal'

/**
 * Global guard (registered as APP_GUARD in AppModule). Runs before every route.
 *
 * TODO(B.3, B.4):
 *  1. `@Public()` routes: return true.
 *  2. Read `Authorization: Bearer <idToken>`; missing → 401 UNAUTHENTICATED.
 *  3. `this.auth.verifyIdToken(token, true)` (checkRevoked) → claims.
 *  4. claims.kind === 'device' (B.3):
 *       - load devices/{claims.deviceId} (cache 60 s); revokedAt set → 401 "This device was removed. Ask IT."
 *       - principal = { kind: 'device', deviceId, role: claims.role, ward: claims.ward }
 *  5. claims.kind === 'staff' (B.4):
 *       - load staff/{uid} (cache 60 s); missing or !active → 403 (disabling works immediately)
 *       - principal = { kind: 'staff', uid, role, wards, deviceId: req.header('x-device-id') }
 *  6. Route roles from `@Allow(...)`: none declared → 403 (fail closed); principal.role not listed → 403.
 *  7. `req.principal = principal`; return true.
 *  Ward checks need the target visit, so they happen in services via `assertWard()` (common/auth/ward.ts).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(FIREBASE_AUTH) private readonly auth: Auth,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()]
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true
    const allowed = this.reflector.getAllAndOverride<Role[] | undefined>(ALLOW_KEY, targets)
    return todo('B.3/B.4')
  }
}
