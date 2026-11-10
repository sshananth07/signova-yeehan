import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FLOWS, flowResult, visibleSteps } from './flows.ts'

test('register builds one sentence from the steps, skipping unanswered optional ones', () => {
  const r = flowResult(FLOWS.register, { visit: 'first', id: 'ic', with: 'alone' })
  assert.ok(r.ok)
  assert.equal(r.say.en, 'I would like to register. This is my first visit. I have my IC with me. I came alone.')
  assert.equal(r.short.en, 'Register: First visit, MyKad (IC)')
})

test('allergy: a reaction now needs a sign, flags danger signs, and ignores answers from the hidden branch', () => {
  const f = FLOWS.allergy
  const missing = flowResult(f, { now: 'now', to: 'seafood' })
  assert.ok(!missing.ok && missing.missing.k === 'sign')
  const r = flowResult(f, { now: 'now', to: 'seafood', sign: 'throat', since: 'just', usual: 'rash' })
  assert.ok(r.ok)
  assert.equal(r.say.en, 'I am having an allergic reaction now. I am allergic to seafood. My throat feels tight. It started just now.')
  assert.equal(r.short.en, 'Allergy now: Seafood, Throat feels tight')
  assert.equal(f.danger!({ now: 'now', sign: 'throat' }), true)
  assert.equal(f.danger!({ now: 'now', sign: 'rash' }), false)
  // Known allergy: the stale "sign" answer is hidden and must not leak into the message or the danger check.
  const k = flowResult(f, { now: 'known', to: 'penicillin', sign: 'breath', usual: 'rash' })
  assert.ok(k.ok)
  assert.equal(k.say.en, 'I want you to know I have an allergy. I am allergic to penicillin or an antibiotic. My usual reaction: rash or itchy.')
  assert.equal(k.short.en, 'Allergy: Penicillin or antibiotic, Rash or itchy')
  assert.equal(f.danger!({ now: 'known', sign: 'breath' }), false)
})

test('a missing required step is reported, and hidden steps never count', () => {
  const r = flowResult(FLOWS.register, { visit: 'first' })
  assert.equal(r.ok, false)
  assert.equal(!r.ok && r.missing.k, 'id')
  // "When is it?" only shows for today or change; an old answer is dropped once hidden.
  assert.deepEqual(visibleSteps(FLOWS.appointment, { need: 'new' }).map(s => s.k), ['need', 'clinic'])
  const a = flowResult(FLOWS.appointment, { need: 'new', clinic: 'eye', when: 'am' })
  assert.ok(a.ok && !a.say.en.includes('morning'))
})

test('pharmacy queue number is spoken and shown', () => {
  const r = flowResult(FLOWS.pharmacy, { need: 'collect', num: '2041' })
  assert.ok(r.ok)
  assert.equal(r.say.en, 'I would like to collect my medicine. My queue number is 2041.')
  assert.equal(r.short.en, 'Pharmacy: Collect my medicine, #2041')
})

test('sentence suggestions keep inner sentences lower-case when joined', async () => {
  const { candidates } = await import('./text.ts')
  const r = flowResult(FLOWS.register, { visit: 'first', id: 'ic' })
  assert.ok(r.ok)
  const items = [
    { uid: 1, kind: 'request' as const, say: r.say, short: r.short, src: 'Guided steps' },
    { uid: 2, kind: 'need' as const, say: { en: 'I need water.', bm: 'Saya perlukan air.' }, short: { en: 'Water', bm: 'Air' }, src: 'Card' },
  ]
  assert.equal(candidates(items, 'en')!.list[0].en, 'I would like to register, and this is my first visit, and I have my IC with me, and I need water.')
})
