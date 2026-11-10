import { Module } from '@nestjs/common'
import { StaffController } from './staff.controller'
import { StaffRepository } from './staff.repository'
import { StaffService } from './staff.service'

@Module({
  controllers: [StaffController],
  providers: [StaffService, StaffRepository],
  exports: [StaffRepository],
})
export class StaffModule {}
