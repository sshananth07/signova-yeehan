import { Body, Controller, Delete, HttpCode, Param, Post, Put } from '@nestjs/common'
import { EventParams, NewEventBody, type Event } from '@signova/contracts'
import { Allow, CurrentPrincipal } from '../common/auth/decorators'
import { STAFF, type DevicePrincipal, type StaffPrincipal } from '../common/auth/principal'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { EventsService } from './events.service'

@Controller('visits/:visitId/events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Allow('board')
  @Put(':eventId')
  add(
    @CurrentPrincipal() board: DevicePrincipal,
    @Param(new ZodValidationPipe(EventParams)) { visitId, eventId }: EventParams,
    @Body(new ZodValidationPipe(NewEventBody)) body: NewEventBody,
  ): Promise<Event> {
    return this.events.add(board, visitId, eventId, body)
  }

  @Allow(...STAFF)
  @Post(':eventId/seen')
  @HttpCode(204)
  seen(@CurrentPrincipal() staff: StaffPrincipal, @Param(new ZodValidationPipe(EventParams)) { visitId, eventId }: EventParams): Promise<void> {
    return this.events.setSeen(staff, visitId, eventId, true)
  }

  @Allow(...STAFF)
  @Delete(':eventId/seen')
  @HttpCode(204)
  unseen(@CurrentPrincipal() staff: StaffPrincipal, @Param(new ZodValidationPipe(EventParams)) { visitId, eventId }: EventParams): Promise<void> {
    return this.events.setSeen(staff, visitId, eventId, false)
  }

  @Allow(...STAFF)
  @Post(':eventId/done')
  @HttpCode(204)
  done(@CurrentPrincipal() staff: StaffPrincipal, @Param(new ZodValidationPipe(EventParams)) { visitId, eventId }: EventParams): Promise<void> {
    return this.events.done(staff, visitId, eventId)
  }
}
