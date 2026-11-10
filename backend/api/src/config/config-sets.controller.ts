import { Body, Controller, Get, HttpCode, Param, Put } from '@nestjs/common'
import { ConfigSet, ConfigSetParams, type ConfigSetSummary } from '@signova/contracts'
import { Allow, CurrentPrincipal } from '../common/auth/decorators'
import type { StaffPrincipal } from '../common/auth/principal'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { ConfigSetsService } from './config-sets.service'

@Allow('admin')
@Controller('config-sets')
export class ConfigSetsController {
  constructor(private readonly sets: ConfigSetsService) {}

  /** Admin page: every published set, with how many devices use it. */
  @Get()
  list(): Promise<ConfigSetSummary[]> {
    return this.sets.list()
  }

  @Get(':id')
  get(@Param(new ZodValidationPipe(ConfigSetParams)) { id }: ConfigSetParams): Promise<ConfigSet> {
    return this.sets.get(id)
  }

  /** Publish a new version. Versions are immutable once published. */
  @Put(':id')
  @HttpCode(204)
  publish(
    @CurrentPrincipal() admin: StaffPrincipal,
    @Param(new ZodValidationPipe(ConfigSetParams)) { id }: ConfigSetParams,
    @Body(new ZodValidationPipe(ConfigSet)) body: ConfigSet,
  ): Promise<void> {
    return this.sets.publish(admin, id, body)
  }
}
