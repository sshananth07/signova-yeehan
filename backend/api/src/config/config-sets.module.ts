import { Module } from '@nestjs/common'
import { ConfigSetsController } from './config-sets.controller'
import { ConfigSetsRepository } from './config-sets.repository'
import { ConfigSetsService } from './config-sets.service'

@Module({
  controllers: [ConfigSetsController],
  providers: [ConfigSetsService, ConfigSetsRepository],
  exports: [ConfigSetsRepository],
})
export class ConfigSetsModule {}
