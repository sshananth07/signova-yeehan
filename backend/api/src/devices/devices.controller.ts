import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { EnrolDeviceBody, PatchDeviceBody, WardQuery, type ConfigSet, type Device, type EnrolDeviceResult } from '@signova/contracts'
import { Allow, CurrentPrincipal } from '../common/auth/decorators'
import type { DevicePrincipal, StaffPrincipal } from '../common/auth/principal'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { DevicesService } from './devices.service'

@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Allow('admin')
  @Post()
  enrol(@CurrentPrincipal() admin: StaffPrincipal, @Body(new ZodValidationPipe(EnrolDeviceBody)) body: EnrolDeviceBody): Promise<EnrolDeviceResult> {
    return this.devices.enrol(admin, body)
  }

  /** Admin page: devices in the admin's wards. */
  @Allow('admin')
  @Get()
  list(@CurrentPrincipal() admin: StaffPrincipal, @Query(new ZodValidationPipe(WardQuery)) q: WardQuery): Promise<Device[]> {
    return this.devices.list(admin, q)
  }

  /** Declared before `:deviceId` routes so "me" is never read as an id. */
  @Allow('board', 'station')
  @Get('me/config')
  myConfig(@CurrentPrincipal() device: DevicePrincipal): Promise<ConfigSet> {
    return this.devices.myConfig(device)
  }

  @Allow('admin')
  @Patch(':deviceId')
  @HttpCode(204)
  patch(@CurrentPrincipal() admin: StaffPrincipal, @Param('deviceId') deviceId: string, @Body(new ZodValidationPipe(PatchDeviceBody)) body: PatchDeviceBody): Promise<void> {
    return this.devices.patch(admin, deviceId, body)
  }

  @Allow('admin')
  @Post(':deviceId/rotate')
  rotate(@CurrentPrincipal() admin: StaffPrincipal, @Param('deviceId') deviceId: string): Promise<EnrolDeviceResult> {
    return this.devices.rotate(admin, deviceId)
  }

  @Allow('admin')
  @Post(':deviceId/revoke')
  @HttpCode(204)
  revoke(@CurrentPrincipal() admin: StaffPrincipal, @Param('deviceId') deviceId: string): Promise<void> {
    return this.devices.revoke(admin, deviceId)
  }
}
