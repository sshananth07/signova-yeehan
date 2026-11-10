import { Controller, HttpCode, Param, Post, Put } from '@nestjs/common'
import { AlarmParams, type Alarm } from '@signova/contracts'
import { Allow, CurrentPrincipal } from '../common/auth/decorators'
import { STAFF, type DevicePrincipal, type StaffPrincipal } from '../common/auth/principal'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { AlarmsService } from './alarms.service'

@Controller('visits/:visitId/alarms')
export class AlarmsController {
  constructor(private readonly alarms: AlarmsService) {}

  @Allow('board')
  @Put(':alarmId')
  raise(@CurrentPrincipal() board: DevicePrincipal, @Param(new ZodValidationPipe(AlarmParams)) { visitId, alarmId }: AlarmParams): Promise<Alarm> {
    return this.alarms.raise(board, visitId, alarmId)
  }

  @Allow(...STAFF)
  @Post(':alarmId/ack')
  @HttpCode(204)
  ack(@CurrentPrincipal() staff: StaffPrincipal, @Param(new ZodValidationPipe(AlarmParams)) { visitId, alarmId }: AlarmParams): Promise<void> {
    return this.alarms.ack(staff, visitId, alarmId)
  }

  @Allow('board')
  @Post(':alarmId/cancel')
  @HttpCode(204)
  cancel(@CurrentPrincipal() board: DevicePrincipal, @Param(new ZodValidationPipe(AlarmParams)) { visitId, alarmId }: AlarmParams): Promise<void> {
    return this.alarms.cancel(board, visitId, alarmId)
  }
}
