import { Inject, Injectable } from '@nestjs/common'
import type { ConfigSet } from '@signova/contracts'
import type { Firestore } from 'firebase-admin/firestore'
import { todo } from '../common/todo'
import { FIRESTORE } from '../firebase/firebase.module'

/** Firestore access for `configSets/{id}`. */
@Injectable()
export class ConfigSetsRepository {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  /** TODO(B.15): read every configSets doc's id + version (small collection; no paging needed). */
  async list(): Promise<{ id: string; version: number }[]> {
    return todo('B.15')
  }

  /** TODO(B.10): read configSets/{id}; undefined if missing. */
  async get(id: string): Promise<ConfigSet | undefined> {
    return todo('B.10')
  }

  /** TODO(B.10): `.create()` (never `.set()`): a published version is immutable, so an existing id → 409. */
  async create(id: string, set: ConfigSet): Promise<void> {
    return todo('B.10')
  }
}
