import { ArgumentsHost, Catch, HttpException, HttpStatus, type ExceptionFilter } from '@nestjs/common'
import type { ErrorBody, ErrorCode } from '@signova/contracts'
import type { Response } from 'express'
import { ApiError } from '../api-error'

const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: 'VALIDATION',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'TOO_LARGE',
  429: 'RATE_LIMITED',
  501: 'NOT_IMPLEMENTED',
}

/**
 * Every error leaves as `{ error: { code, message, details? } }` (plan 00, API conventions).
 * Messages are for staff; never a stack trace, never request data.
 *
 * TODO(B.1):
 *  1. Log unknown (non-HttpException) errors at `error` level through the pino logger with the
 *     requestId, then answer 500 INTERNAL "Something went wrong. Please try again."
 *  2. Unit test: one case per status above, plus ApiError's custom code and details.
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const code = exception instanceof ApiError ? exception.code : (CODE_BY_STATUS[status] ?? 'INTERNAL')
    const message = exception instanceof HttpException ? exception.message : 'Something went wrong. Please try again.'
    const details = exception instanceof ApiError ? exception.details : undefined
    const body: ErrorBody = { error: { code, message, ...(details !== undefined && { details }) } }
    res.status(status).json(body)
  }
}
