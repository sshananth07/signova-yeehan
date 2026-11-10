import { Module } from '@nestjs/common'
import { VisitsModule } from '../visits/visits.module'
import { ConsentsController } from './consents.controller'
import { ConsentsRepository } from './consents.repository'
import { ConsentsService } from './consents.service'

@Module({
  imports: [VisitsModule],
  controllers: [ConsentsController],
  providers: [ConsentsService, ConsentsRepository],
  exports: [ConsentsRepository],
})
export class ConsentsModule {}
