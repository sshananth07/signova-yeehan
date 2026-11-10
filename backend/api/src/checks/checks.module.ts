import { Module } from '@nestjs/common'
import { EventsModule } from '../events/events.module'
import { VisitsModule } from '../visits/visits.module'
import { ChecksController } from './checks.controller'
import { ChecksRepository } from './checks.repository'
import { ChecksService } from './checks.service'

@Module({
  imports: [VisitsModule, EventsModule],
  controllers: [ChecksController],
  providers: [ChecksService, ChecksRepository],
})
export class ChecksModule {}
