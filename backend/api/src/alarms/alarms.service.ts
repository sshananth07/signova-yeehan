import { Injectable } from '@nestjs/common'
import type { Alarm } from '@signova/contracts'
import type { DevicePrincipal, StaffPrincipal } from '../common/auth/principal'
import { Clock } from '../common/clock'
import { todo } from '../common/todo'
import { VisitsRepository } from '../visits/visits.repository'
import { AlarmsRepository } from './alarms.repository'

/**
 * Emergency. The board raises and sounds the alarm locally FIRST (never waits on the network);
 * this records it and lets the Station's listener raise it there.
 */
@Injectable()
export class AlarmsService {
  constructor(
    private readonly alarms: AlarmsRepository,
    private readonly visits: VisitsRepository,
    private readonly clock: Clock,
  ) {}

  /** TODO(B.8): load visit; `assertWard(board, visit)`; ended visits still accept alarms (safety first); `alarms.raise(...)`. */
  async raise(board: DevicePrincipal, visitId: string, alarmId: string): Promise<Alarm> {
    return todo('B.8')
  }

  /** TODO(B.8): ward check; `alarms.close(visitId, alarmId, 'ack', staff.uid, now)`. Test: ack after cancel → 409. */
  async ack(staff: StaffPrincipal, visitId: string, alarmId: string): Promise<void> {
    return todo('B.8')
  }

  /** TODO(B.8): ward check; `alarms.close(visitId, alarmId, 'cancel', board.deviceId, now)` (patient's 2 s hold-to-cancel). */
  async cancel(board: DevicePrincipal, visitId: string, alarmId: string): Promise<void> {
    return todo('B.8')
  }
}
