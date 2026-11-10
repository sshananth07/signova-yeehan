import { Body, Controller, HttpCode, Param, Post, Put } from '@nestjs/common'
import { AnswerCheckBody, CheckParams, StartCheckBody, type Check } from '@signova/contracts'
import { Allow, CurrentPrincipal } from '../common/auth/decorators'
import type { DevicePrincipal } from '../common/auth/principal'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { ChecksService } from './checks.service'

@Allow('board')
@Controller('visits/:visitId/checks')
export class ChecksController {
  constructor(private readonly checks: ChecksService) {}

  @Put(':checkId')
  start(
    @CurrentPrincipal() board: DevicePrincipal,
    @Param(new ZodValidationPipe(CheckParams)) { visitId, checkId }: CheckParams,
    @Body(new ZodValidationPipe(StartCheckBody)) body: StartCheckBody,
  ): Promise<Check> {
    return this.checks.start(board, visitId, checkId, body)
  }

  @Post(':checkId/snooze')
  @HttpCode(204)
  snooze(@CurrentPrincipal() board: DevicePrincipal, @Param(new ZodValidationPipe(CheckParams)) { visitId, checkId }: CheckParams): Promise<void> {
    return this.checks.snooze(board, visitId, checkId)
  }

  @Post(':checkId/answer')
  @HttpCode(204)
  answer(
    @CurrentPrincipal() board: DevicePrincipal,
    @Param(new ZodValidationPipe(CheckParams)) { visitId, checkId }: CheckParams,
    @Body(new ZodValidationPipe(AnswerCheckBody)) body: AnswerCheckBody,
  ): Promise<void> {
    return this.checks.answer(board, visitId, checkId, body)
  }
}
