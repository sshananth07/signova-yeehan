import { Module } from '@nestjs/common'
import { VisitsModule } from '../visits/visits.module'
import { AlarmsController } from './alarms.controller'
import { AlarmsRepository } from './alarms.repository'
import { AlarmsService } from './alarms.service'

@Module({
  imports: [VisitsModule],
  controllers: [AlarmsController],
  providers: [AlarmsService, AlarmsRepository],
})
export class AlarmsModule {}
