import { Module } from '@nestjs/common'
import { VisitsModule } from '../visits/visits.module'
import { EventsController } from './events.controller'
import { EventsRepository } from './events.repository'
import { EventsService } from './events.service'

@Module({
  imports: [VisitsModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
  exports: [EventsRepository],
})
export class EventsModule {}
