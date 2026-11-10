import { z } from 'zod'
import { IsoTime, Ulid } from './common'

export const Alarm = z.object({
  id: Ulid,
  raisedAt: IsoTime,
  outcome: z.enum(['ack', 'cancel']).optional(),
  ackBy: z.string().optional(),
  ackAt: IsoTime.optional(),
  cancelledAt: IsoTime.optional(),
})
export type Alarm = z.infer<typeof Alarm>

export const AlarmParams = z.object({ visitId: Ulid, alarmId: Ulid })
export type AlarmParams = z.infer<typeof AlarmParams>
