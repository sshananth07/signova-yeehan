import { Module } from '@nestjs/common'
import { DevicesModule } from '../devices/devices.module'
import { StaffModule } from '../staff/staff.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  imports: [DevicesModule, StaffModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
