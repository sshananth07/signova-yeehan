import { Body, Controller, Delete, HttpCode, Param, Put } from '@nestjs/common'
import { ConsentBody, ConsentParams, type Consent } from '@signova/contracts'
import { Allow, CurrentPrincipal } from '../common/auth/decorators'
import { STAFF, type StaffPrincipal } from '../common/auth/principal'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { ConsentsService } from './consents.service'

@Allow(...STAFF)
@Controller('visits/:visitId/consents')
export class ConsentsController {
  constructor(private readonly consents: ConsentsService) {}

  @Put(':feature')
  enable(
    @CurrentPrincipal() staff: StaffPrincipal,
    @Param(new ZodValidationPipe(ConsentParams)) { visitId, feature }: ConsentParams,
    @Body(new ZodValidationPipe(ConsentBody)) body: ConsentBody,
  ): Promise<Consent> {
    return this.consents.enable(staff, visitId, feature, body)
  }

  @Delete(':feature')
  @HttpCode(204)
  revoke(@CurrentPrincipal() staff: StaffPrincipal, @Param(new ZodValidationPipe(ConsentParams)) { visitId, feature }: ConsentParams): Promise<void> {
    return this.consents.revoke(staff, visitId, feature)
  }
}
