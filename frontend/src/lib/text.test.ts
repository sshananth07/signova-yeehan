import { test } from 'node:test'
import assert from 'node:assert/strict'
import { candidates, currentSite, insertWord, painItem, painSay, suggestions, summary, summaryText } from './text.ts'
import type { Item } from './types.ts'
import { C, catOf, tabCards } from './vocab.ts'

const register: Item = { uid: 1, key: 'register', kind: 'request', say: C.register.say, short: C.register.short, src: 'Card' }
const legSite = { part: 'leg', sub: null, side: 'l', score: 6, type: 'sharp', structure: null } as const
const pain: Item = { uid: 2, kind: 'pain', say: painSay(legSite), short: { en: 'Left leg pain 6/10', bm: 'Sakit kaki kiri 6/10' }, src: 'Body map' }

test('pain sentence matches the mockup wording', () => {
  assert.deepEqual(painSay(legSite), {
    en: 'I have sharp pain in my left leg, rated 6 out of 10.',
    bm: 'Saya mengalami sakit tajam pada kaki kiri, tahap 6 daripada 10.',
  })
})

test('sub-areas change the place words, sides go where each language puts them', () => {
  const knee = { ...legSite, sub: 'knee', type: null, structure: 'Patellar ligament.l' }
  assert.deepEqual(painSay(knee), { en: 'I have pain in my left knee, rated 6 out of 10.', bm: 'Saya mengalami sakit pada lutut kiri, tahap 6 daripada 10.' })
  assert.equal(painItem(knee).short.en, 'Left knee pain 6/10')
  assert.equal(painItem(knee).meta.detail, 'Tapped on 3D body: Patellar ligament (left)')
  const head = { ...knee, part: 'head', sub: 'back', side: null, structure: null } as const
  assert.equal(painSay(head).en, 'I have pain at the back of my head, rated 6 out of 10.')
  assert.equal(painItem(head).meta.detail, undefined)
})

test('pain steps report what is missing', () => {
  const d = { part: null, sub: null, side: null, score: null, type: null, structure: null, sites: [] }
  assert.equal(currentSite(d).ok, false)
  assert.deepEqual(currentSite({ ...d, part: 'arm' }), { ok: false, missing: { en: 'Choose left or right.', bm: 'Pilih kiri atau kanan.' } })
  assert.equal(currentSite({ ...d, part: 'chest', score: 3 }).ok, true) // torso side is optional
  assert.deepEqual(currentSite({ ...d, part: 'head', score: 3 }), { ok: true, site: { part: 'head', sub: null, side: null, score: 3, type: null, structure: null } })
})

test('AI wording needs two content items and the fact guard blocks invented times', () => {
  assert.equal(candidates([register], 'en'), null)
  const cs = candidates([register, pain], 'en')!
  assert.equal(cs.list[0].en, 'I would like to register, and I have sharp pain in my left leg, rated 6 out of 10.')
  assert.equal(cs.uses, 'Left leg pain 6/10 · Register')
  assert.deepEqual(cs.list.map(c => c.tag.en), ['Joined into one', 'Most urgent first', 'Short, for staff'])
  // Already most-urgent-first: no duplicate of the message as it stands.
  assert.equal(candidates([pain, register], 'en')!.list.length, 2)
  assert.equal(cs.blocked?.text, 'I have sharp pain in my left leg, rated 6 out of 10 since yesterday.')
})

test('suggested row follows the last card and skips used ones', () => {
  const s = suggestions('fd', [register], 10)
  assert.deepEqual(s.out, ['appointment', 'directions', 'pharmacy', 'toilet'])
  assert.equal(s.why.en, 'After "Register"')
  assert.equal(suggestions('bs', [], 23).why.en, 'Night-time requests')
})

test('suggested row skips cards on screen and drops common requests when asked', () => {
  assert.deepEqual(suggestions('bs', [], 10, ['water', 'toilet', 'reposition', 'pain']).out, ['hungry', 'rest', 'doctor'])
  assert.deepEqual(suggestions('bs', [], 10, [], false).out, [])
})

test('word chip replaces the partial word', () => {
  assert.equal(insertWord('I need wa', 'water'), 'I need water ')
  assert.equal(insertWord('I need ', 'water'), 'I need water ')
})

test('summary cites events and copies as plain text', () => {
  const lines = summary([
    { n: 1, t: '08:10', kind: 'pain', en: '', bm: '', src: '', seen: true, score: 7, site: 'Lower back' },
    { n: 2, t: '09:00', kind: 'need', en: 'I need water.', bm: '', src: '', seen: false },
  ])
  assert.equal(summaryText(lines), [
    '- Latest pain report: Lower back, patient rated 7/10 at 08:10.#1',
    '- Requests: I need water.#2',
    '- Not yet marked seen: 1 item.#2',
  ].join('\n'))
})

test('every board groups cards by colour in one fixed order', () => {
  const order = ['desk', 'need', 'care', 'health', 'feel', 'ask', 'social']
  for (const p of ['fd', 'bs'] as const) for (const t of ['main', 'health', 'feel', 'ask'] as const) {
    const ranks = tabCards(p, t).filter(k => k !== 'opener').map(k => order.indexOf(catOf(k)))
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), `${p}/${t}`)
  }
  assert.equal(tabCards('bs', 'main')[0], 'opener')
})
