import { Inject, Injectable } from '@nestjs/common'
import type { Event, NewEventBody } from '@signova/contracts'
import type { Firestore } from 'firebase-admin/firestore'
import { todo } from '../common/todo'
import { FIRESTORE } from '../firebase/firebase.module'

/** Same window as today's REPEAT_MS in frontend/src/store.ts. */
export const REPEAT_MS = 2 * 60_000

/** Firestore access for `visits/{visitId}/events/{eventId}`. */
@Injectable()
export class EventsRepository {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  /**
   * TODO(B.6): in ONE transaction:
   *  1. events/{eventId} already exists → return it unchanged (idempotent retry).
   *  2. Look for an open repeat: same `en`, no doneAt, createdAt within REPEAT_MS.
   *     Found → increment `asks`, set seen=false, clear seenAt/seenBy, return that event (no new row).
   *     (Mirrors the store's repeat merge, so the Station shows "Asked 3×".)
   *  3. Otherwise n = visit.nextN; create { ...body, id: eventId, n, createdAt: at, seen: false, asks: 1 };
   *     set visit.nextN = n + 1.
   */
  async add(visitId: string, eventId: string, body: NewEventBody, at: Date): Promise<Event> {
    return todo('B.6')
  }

  /** TODO(B.6): read one event; undefined if missing. */
  async get(visitId: string, eventId: string): Promise<Event | undefined> {
    return todo('B.6')
  }

  /**
   * TODO(B.6): transaction. on=true and not yet seen → set seen, seenAt=at, seenBy=by (first writer wins;
   * already seen → no change). on=false → clear seen/seenAt/seenBy (staff "unsee" mistake fix).
   */
  async setSeen(visitId: string, eventId: string, on: boolean, by: string, at: Date): Promise<void> {
    return todo('B.6')
  }

  /** TODO(B.6): transaction. Not done → doneAt, doneBy, seen=true (keep seenAt if set, else at), clear dueAt. Done → no change. */
  async setDone(visitId: string, eventId: string, by: string, at: Date): Promise<void> {
    return todo('B.6')
  }

  /** TODO(B.7): set `dueAt` on several events in one batch (used by a reply with a due time). */
  async setDue(visitId: string, eventIds: string[], dueAt: Date): Promise<void> {
    return todo('B.7')
  }
}
