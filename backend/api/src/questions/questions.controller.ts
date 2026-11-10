import { Body, Controller, HttpCode, Param, Post, Put } from '@nestjs/common'
import { AnswerBody, AskBody, QuestionParams, type Question } from '@signova/contracts'
import { Allow, CurrentPrincipal } from '../common/auth/decorators'
import { STAFF, type DevicePrincipal, type StaffPrincipal } from '../common/auth/principal'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { QuestionsService } from './questions.service'

@Controller('visits/:visitId/questions')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Allow(...STAFF)
  @Put(':qId')
  ask(
    @CurrentPrincipal() staff: StaffPrincipal,
    @Param(new ZodValidationPipe(QuestionParams)) { visitId, qId }: QuestionParams,
    @Body(new ZodValidationPipe(AskBody)) body: AskBody,
  ): Promise<Question> {
    return this.questions.ask(staff, visitId, qId, body)
  }

  @Allow('board')
  @Post(':qId/answer')
  @HttpCode(204)
  answer(
    @CurrentPrincipal() board: DevicePrincipal,
    @Param(new ZodValidationPipe(QuestionParams)) { visitId, qId }: QuestionParams,
    @Body(new ZodValidationPipe(AnswerBody)) body: AnswerBody,
  ): Promise<void> {
    return this.questions.answer(board, visitId, qId, body)
  }

  @Allow('board')
  @Post(':qId/dismiss')
  @HttpCode(204)
  dismiss(@CurrentPrincipal() board: DevicePrincipal, @Param(new ZodValidationPipe(QuestionParams)) { visitId, qId }: QuestionParams): Promise<void> {
    return this.questions.dismiss(board, visitId, qId)
  }
}
