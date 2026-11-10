import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common'
import type { Principal, Role } from './principal'

export const PUBLIC_KEY = 'public'
export const ALLOW_KEY = 'allow'

/** No token needed: health checks and the device token exchange only. */
export const Public = () => SetMetadata(PUBLIC_KEY, true)

/** Which roles may call a route. Every non-public route must declare this; AuthGuard denies otherwise. */
export const Allow = (...roles: Role[]) => SetMetadata(ALLOW_KEY, roles)

/** The caller, as set on the request by AuthGuard. */
export const CurrentPrincipal = createParamDecorator((_: unknown, ctx: ExecutionContext): Principal => ctx.switchToHttp().getRequest().principal)
