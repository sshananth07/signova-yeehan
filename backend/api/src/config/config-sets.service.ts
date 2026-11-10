import { Injectable } from '@nestjs/common'
import type { ConfigSet, ConfigSetSummary } from '@signova/contracts'
import type { StaffPrincipal } from '../common/auth/principal'
import { todo } from '../common/todo'
import { ConfigSetsRepository } from './config-sets.repository'

@Injectable()
export class ConfigSetsService {
  constructor(private readonly sets: ConfigSetsRepository) {}

  /**
   * TODO(B.15):
   *  1. `sets.list()` → ids and versions.
   *  2. Count devices per configSetId (`devices` collection `count()` aggregate per id) so the admin
   *     sees which sets are in use before publishing a replacement.
   */
  async list(): Promise<ConfigSetSummary[]> {
    return todo('B.15')
  }

  /** TODO(B.10): `sets.get(id)`; missing → 404. */
  async get(id: string): Promise<ConfigSet> {
    return todo('B.10')
  }

  /**
   * TODO(B.10):
   *  1. `sets.create(id, body)`; the id already exists → 409 "Publish a new version instead".
   *  2. Audit { action: 'config.publish', target: id } via StaffRepository.audit.
   *  Devices switch to it only when an admin points `devices.configSetId` at it (PATCH /v1/devices/:id).
   */
  async publish(admin: StaffPrincipal, id: string, body: ConfigSet): Promise<void> {
    return todo('B.10')
  }
}
