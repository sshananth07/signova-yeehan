import { Body, Controller, HttpCode, Param, Post, Put } from '@nestjs/common'
import { EndVisitBody, StartVisitBody, VisitParams, type Visit } from '@signova/contracts'
import { Allow, CurrentPrincipal } from '../common/auth/decorators'
import type { DevicePrincipal, Principal } from '../common/auth/principal'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { VisitsService } from './visits.service'

@Controller('visits')
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  @Allow('board')
  @Put(':visitId')
  start(
    @CurrentPrincipal() board: DevicePrincipal,
    @Param(new ZodValidationPipe(VisitParams)) { visitId }: VisitParams,
    @Body(new ZodValidationPipe(StartVisitBody)) body: StartVisitBody,
  ): Promise<Visit> {
    return this.visits.start(board, visitId, body)
  }

  @Allow('board', 'nurse', 'clerk', 'admin')
  @Post(':visitId/end')
  @HttpCode(204)
  end(
    @CurrentPrincipal() caller: Principal,
    @Param(new ZodValidationPipe(VisitParams)) { visitId }: VisitParams,
    @Body(new ZodValidationPipe(EndVisitBody)) body: EndVisitBody,
  ): Promise<void> {
    return this.visits.end(caller, visitId, body)
  }
}
