import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const c = createRequire(import.meta.url)('../dist/index.js')
const id = '01JCQ7Z8X9V2K3M4N5P6Q7R8S9'

test('a board event parses, and a non-ULID id is rejected', () => {
  assert.ok(c.NewEventBody.safeParse({ kind: 'need', src: 'Card', en: 'I need water.', bm: 'Saya perlukan air.' }).success)
  assert.ok(!c.EventParams.safeParse({ visitId: id, eventId: 'not-a-ulid' }).success)
})

test('a reply due time is bounded, and toEvents defaults to empty', () => {
  const r = c.SendReplyBody.parse({ text: { en: 'Coming', bm: 'Datang' }, icon: 'check' })
  assert.deepEqual(r.toEvents, [])
  assert.ok(!c.SendReplyBody.safeParse({ text: { en: 'a', bm: 'b' }, icon: 'x', dueMin: 999 }).success)
})

test('a question needs 2 to 4 answers', () => {
  const a = { en: 'Yes', bm: 'Ya' }
  assert.ok(!c.AskBody.safeParse({ question: a, answers: [a] }).success)
  assert.ok(c.AskBody.safeParse({ question: a, answers: [a, a] }).success)
})

test('the error shape only allows known codes', () => {
  assert.ok(c.ErrorBody.safeParse({ error: { code: 'NOT_IMPLEMENTED', message: 'x' } }).success)
  assert.ok(!c.ErrorBody.safeParse({ error: { code: 'TEAPOT', message: 'x' } }).success)
})
