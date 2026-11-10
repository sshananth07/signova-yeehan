import { Module } from '@nestjs/common'
import { EventsModule } from '../events/events.module'
import { VisitsModule } from '../visits/visits.module'
import { RepliesController } from './replies.controller'
import { RepliesRepository } from './replies.repository'
import { RepliesService } from './replies.service'

@Module({
  imports: [VisitsModule, EventsModule],
  controllers: [RepliesController],
  providers: [RepliesService, RepliesRepository],
})
export class RepliesModule {}
