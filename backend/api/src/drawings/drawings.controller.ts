import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { EventParams, type DrawingUrl } from '@signova/contracts'
import { Allow, CurrentPrincipal } from '../common/auth/decorators'
import { STAFF, type DevicePrincipal, type Principal } from '../common/auth/principal'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { DrawingsService } from './drawings.service'

/**
 * Upload is a raw `image/jpeg` body, not JSON. TODO(B.9): register the raw parser for this path in
 * app.setup.ts: `app.useBodyParser('raw', { type: 'image/jpeg', limit: MAX_DRAWING_BYTES })`.
 */
@Controller('visits/:visitId/drawings')
export class DrawingsController {
  constructor(private readonly drawings: DrawingsService) {}

  @Allow('board')
  @Post(':eventId')
  @HttpCode(204)
  upload(@CurrentPrincipal() board: DevicePrincipal, @Param(new ZodValidationPipe(EventParams)) { visitId, eventId }: EventParams, @Body() bytes: Buffer): Promise<void> {
    return this.drawings.upload(board, visitId, eventId, bytes)
  }

  @Allow('station', ...STAFF)
  @Get(':eventId')
  url(@CurrentPrincipal() caller: Principal, @Param(new ZodValidationPipe(EventParams)) { visitId, eventId }: EventParams): Promise<DrawingUrl> {
    return this.drawings.url(caller, visitId, eventId)
  }
}
