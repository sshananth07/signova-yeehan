import { Module } from '@nestjs/common'
import { EventsModule } from '../events/events.module'
import { VisitsModule } from '../visits/visits.module'
import { DrawingsController } from './drawings.controller'
import { DrawingsRepository } from './drawings.repository'
import { DrawingsService } from './drawings.service'

@Module({
  imports: [VisitsModule, EventsModule],
  controllers: [DrawingsController],
  providers: [DrawingsService, DrawingsRepository],
  exports: [DrawingsRepository],
})
export class DrawingsModule {}
