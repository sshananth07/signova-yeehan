import { Injectable, type PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'
import { todo } from '../todo'

/**
 * Validates a body/params object against a `@signova/contracts` schema:
 *   @Body(new ZodValidationPipe(SendReplyBody)) body: SendReplyBody
 *
 * TODO(B.1):
 *  1. `const r = this.schema.safeParse(value)`.
 *  2. On success return `r.data` (defaults applied, unknown keys stripped).
 *  3. On failure throw `new ApiError('VALIDATION', 'Some fields are not valid.', 400,
 *     r.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })))`.
 *     Never echo the submitted values back.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    return todo('B.1')
  }
}
