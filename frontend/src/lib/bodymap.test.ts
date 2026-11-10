import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MODEL, segmentOf, structureLabel, zoneAt } from './bodymap.ts'

// Points given as fractions of height (x: + = patient's left, z: + = front), like the landmark table.
const H = MODEL.height
const at = (seg: Parameters<typeof zoneAt>[0], fx: number, fy: number, fz: number) => zoneAt(seg, fx * H, MODEL.floor + fy * H, fz * H)

test('landmarks from the skeleton land in the right zone', () => {
  assert.deepEqual(at('leg', 0.05, 0.256, 0.005), { part: 'leg', sub: 'knee', side: 'l' }) // patella
  assert.deepEqual(at('leg', -0.05, 0.15, -0.045), { part: 'leg', sub: 'calf', side: 'r' })
  assert.deepEqual(at('leg', 0.045, 0.01, -0.04), { part: 'foot', sub: 'heel', side: 'l' }) // calcaneus
  assert.deepEqual(at('arm', -0.13, 0.64, 0), { part: 'arm', sub: 'elbow', side: 'r' })
  assert.deepEqual(at('arm', 0.16, 0.42, 0.05), { part: 'hand', sub: 'fingers', side: 'l' })
  assert.deepEqual(at('axial', 0, 0.95, 0.05), { part: 'head', sub: 'face', side: null })
  assert.deepEqual(at('axial', 0, 0.94, -0.06), { part: 'head', sub: 'back', side: null }) // occipital
  assert.deepEqual(at('axial', 0.05, 0.76, 0.06), { part: 'chest', sub: null, side: 'l' })
  assert.deepEqual(at('axial', -0.05, 0.62, 0.05), { part: 'stomach', sub: 'upper', side: 'r' })
  assert.deepEqual(at('axial', 0, 0.6, -0.06), { part: 'lowerback', sub: null, side: null })
  assert.deepEqual(at('axial', 0.04, 0.5, -0.06), { part: 'leg', sub: 'hip', side: 'l' }) // buttock
})

test('structures are sorted into arm, leg or trunk by their centre', () => {
  assert.equal(segmentOf(0.13 * H, MODEL.floor + 0.7 * H), 'arm') // biceps
  assert.equal(segmentOf(0.06 * H, MODEL.floor + 0.4 * H), 'leg') // thigh
  assert.equal(segmentOf(0.06 * H, MODEL.floor + 0.5 * H), 'leg') // gluteus maximus
  assert.equal(segmentOf(0.02 * H, MODEL.floor + 0.49 * H), 'axial') // pelvic floor
  assert.equal(segmentOf(0.06 * H, MODEL.floor + 0.75 * H), 'axial') // pectoralis
})

test('anatomy names read cleanly for staff', () => {
  assert.equal(structureLabel('Lateral head of gastrocnemius.l'), 'Lateral head of gastrocnemius (left)')
  assert.equal(structureLabel('(Adductor minimus).r'), 'Adductor minimus (right)')
  assert.equal(structureLabel('Pharynx.j'), 'Pharynx')
})
