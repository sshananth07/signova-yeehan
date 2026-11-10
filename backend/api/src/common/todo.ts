import { NotImplementedException } from '@nestjs/common'

/**
 * Phase A stub marker. Every unimplemented body ends in `return todo('B.x')`, where B.x is the
 * plan 00 task that fills it. The ErrorFilter turns it into 501 `NOT_IMPLEMENTED`.
 * Phase B is done when `grep -r "todo('" src` finds nothing.
 */
export function todo(task: string): never {
  throw new NotImplementedException(`Not implemented yet (plan 00 Task ${task})`)
}
