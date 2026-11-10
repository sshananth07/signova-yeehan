import { Module } from '@nestjs/common'
import { VisitsController } from './visits.controller'
import { VisitsRepository } from './visits.repository'
import { VisitsService } from './visits.service'

@Module({
  controllers: [VisitsController],
  providers: [VisitsService, VisitsRepository],
  exports: [VisitsRepository],
})
export class VisitsModule {}
