import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { InviteStaffBody, PatchStaffBody, WardQuery, type InviteStaffResult, type Staff } from '@signova/contracts'
import { Allow, CurrentPrincipal } from '../common/auth/decorators'
import type { StaffPrincipal } from '../common/auth/principal'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { StaffService } from './staff.service'

@Allow('admin')
@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  /** Admin page: staff who work in any of the admin's wards. */
  @Get()
  list(@CurrentPrincipal() admin: StaffPrincipal, @Query(new ZodValidationPipe(WardQuery)) q: WardQuery): Promise<Staff[]> {
    return this.staff.list(admin, q)
  }

  @Post()
  invite(@CurrentPrincipal() admin: StaffPrincipal, @Body(new ZodValidationPipe(InviteStaffBody)) body: InviteStaffBody): Promise<InviteStaffResult> {
    return this.staff.invite(admin, body)
  }

  @Patch(':uid')
  @HttpCode(204)
  patch(@CurrentPrincipal() admin: StaffPrincipal, @Param('uid') uid: string, @Body(new ZodValidationPipe(PatchStaffBody)) body: PatchStaffBody): Promise<void> {
    return this.staff.patch(admin, uid, body)
  }

  @Post(':uid/disable')
  @HttpCode(204)
  disable(@CurrentPrincipal() admin: StaffPrincipal, @Param('uid') uid: string): Promise<void> {
    return this.staff.disable(admin, uid)
  }
}
