import { Module } from '@nestjs/common'
import { EventsModule } from '../events/events.module'
import { VisitsModule } from '../visits/visits.module'
import { QuestionsController } from './questions.controller'
import { QuestionsRepository } from './questions.repository'
import { QuestionsService } from './questions.service'

@Module({
  imports: [VisitsModule, EventsModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, QuestionsRepository],
})
export class QuestionsModule {}
