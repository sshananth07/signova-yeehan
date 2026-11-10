import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common'
import { DeviceTokenBody, type DeviceTokenResult, type Me } from '@signova/contracts'
import { Allow, CurrentPrincipal, Public } from '../common/auth/decorators'
import { ANYONE, type Principal } from '../common/auth/principal'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { AuthService } from './auth.service'

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** A device exchanges its secret for a Firebase custom token (1 h). */
  @Public()
  @Post('auth/device-token')
  @HttpCode(200)
  deviceToken(@Body(new ZodValidationPipe(DeviceTokenBody)) body: DeviceTokenBody): Promise<DeviceTokenResult> {
    return this.auth.deviceToken(body)
  }

  /** Who is calling: the device or the staff member. */
  @Allow(...ANYONE)
  @Get('me')
  me(@CurrentPrincipal() principal: Principal): Promise<Me> {
    return this.auth.me(principal)
  }
}
