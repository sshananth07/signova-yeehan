import { Body, Controller, HttpCode, Param, Post, Put } from '@nestjs/common'
import { ReplyParams, SendReplyBody, type Reply } from '@signova/contracts'
import { Allow, CurrentPrincipal } from '../common/auth/decorators'
import { STAFF, type DevicePrincipal, type StaffPrincipal } from '../common/auth/principal'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { RepliesService } from './replies.service'

@Controller('visits/:visitId/replies')
export class RepliesController {
  constructor(private readonly replies: RepliesService) {}

  @Allow(...STAFF)
  @Put(':replyId')
  send(
    @CurrentPrincipal() staff: StaffPrincipal,
    @Param(new ZodValidationPipe(ReplyParams)) { visitId, replyId }: ReplyParams,
    @Body(new ZodValidationPipe(SendReplyBody)) body: SendReplyBody,
  ): Promise<Reply> {
    return this.replies.send(staff, visitId, replyId, body)
  }

  @Allow('board')
  @Post(':replyId/dismiss')
  @HttpCode(204)
  dismiss(@CurrentPrincipal() board: DevicePrincipal, @Param(new ZodValidationPipe(ReplyParams)) { visitId, replyId }: ReplyParams): Promise<void> {
    return this.replies.dismiss(board, visitId, replyId)
  }
}
