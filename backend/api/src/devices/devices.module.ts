import { Module } from '@nestjs/common'
import { ConfigSetsModule } from '../config/config-sets.module'
import { DevicesController } from './devices.controller'
import { DevicesRepository } from './devices.repository'
import { DevicesService } from './devices.service'

@Module({
  imports: [ConfigSetsModule],
  controllers: [DevicesController],
  providers: [DevicesService, DevicesRepository],
  exports: [DevicesRepository],
})
export class DevicesModule {}
