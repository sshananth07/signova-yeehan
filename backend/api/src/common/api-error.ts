import { HttpException, HttpStatus } from '@nestjs/common'
import type { ErrorCode } from '@signova/contracts'

/** For codes HTTP status alone can't express, e.g. 409 CONSENT_REQUIRED vs 409 CONFLICT. */
export class ApiError extends HttpException {
  constructor(readonly code: ErrorCode, message: string, status: HttpStatus, readonly details?: unknown) {
    super(message, status)
  }
}
