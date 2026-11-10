import type { Side } from './types.ts'
import type { PartKey, SubKey } from './vocab.ts'

/**
 * Body-map zones for the anatomy model (Z-Anatomy / BodyParts3D, model units = metres).
 * +x = patient's left, +y = up, +z = front.
 *
 * Landmarks are fractions of standing height, measured from the skeleton
 * (patella, humerus, radius, sternum, …). They are the calibration knob: if a tap lands in the
 * wrong zone, nudge the number here and re-run `npm test`.
 */
export const MODEL = { floor: 0.009, height: 1.696 }
export const LM = {
  head: 0.885, headTop: 0.965, jaw: 0.915, neck: 0.83,
  ribs: 0.705, navel: 0.6, groin: 0.52, upperBack: 0.65, lowerBack: 0.53,
  shoulder: 0.77, elbowTop: 0.665, elbowBottom: 0.615, wristTop: 0.515, hand: 0.49, fingers: 0.445,
  hip: 0.47, kneeTop: 0.29, kneeBottom: 0.22, ankle: 0.06, ankleBottom: 0.035, sole: 0.012,
  // front/back splits (z as a fraction of height)
  torsoZ: -0.015, headZ: -0.005, neckZ: -0.01, shinZ: -0.015, heelZ: -0.012, toesZ: 0.05, palmZ: 0.016,
  midline: 0.015,
}

export type Segment = 'axial' | 'arm' | 'leg'
export type Zone = { part: PartKey; sub: SubKey | null; side: Side | null }

/** Which body segment a whole structure belongs to, from its centre (model units). */
export function segmentOf(cx: number, cy: number): Segment {
  const a = Math.abs(cx) / MODEL.height, y = (cy - MODEL.floor) / MODEL.height
  if (a > 0.095 && y > 0.4 && y < 0.84) return 'arm'
  if (y < LM.hip || (y < 0.57 && a > 0.045)) return 'leg'
  return 'axial'
}

/** Zone of one point on a structure of the given segment (model units). */
export function zoneAt(seg: Segment, x: number, y: number, z: number): Zone {
  const fx = x / MODEL.height, fy = (y - MODEL.floor) / MODEL.height, fz = z / MODEL.height
  const side: Side = fx > 0 ? 'l' : 'r'

  if (seg === 'arm') {
    if (fy < LM.hand) return { part: 'hand', sub: fy < LM.fingers ? 'fingers' : fz > LM.palmZ ? 'palm' : 'backofhand', side }
    const sub = fy > LM.shoulder ? 'shoulder' : fy > LM.elbowTop ? 'upperarm' : fy > LM.elbowBottom ? 'elbow' : fy > LM.wristTop ? 'forearm' : 'wrist'
    return { part: 'arm', sub, side }
  }
  if (seg === 'leg') {
    if (fy < LM.ankle) {
      const sub = fy > LM.ankleBottom ? 'ankle' : fz < LM.heelZ ? 'heel' : fz > LM.toesZ ? 'toes' : fy < LM.sole ? 'sole' : 'top'
      return { part: 'foot', sub, side }
    }
    const sub = fy > LM.hip ? 'hip' : fy > LM.kneeTop ? 'thigh' : fy > LM.kneeBottom ? 'knee' : fz > LM.shinZ ? 'shin' : 'calf'
    return { part: 'leg', sub, side }
  }

  if (fy > LM.head) {
    const sub = fy > LM.headTop ? 'top' : fz < LM.headZ ? 'back' : fy < LM.jaw ? 'jaw' : 'face'
    return { part: 'head', sub, side: null }
  }
  if (fy > LM.neck) return { part: 'neck', sub: fz > LM.neckZ ? 'front' : 'back', side: null }

  const torsoSide = Math.abs(fx) < LM.midline ? null : side
  if (fz > LM.torsoZ) {
    if (fy > LM.ribs) return { part: 'chest', sub: null, side: torsoSide }
    return { part: 'stomach', sub: fy < LM.groin ? 'groin' : fy > LM.navel ? 'upper' : 'lower', side: torsoSide }
  }
  if (fy > LM.upperBack) return { part: 'upperback', sub: null, side: torsoSide }
  if (fy > LM.lowerBack) return { part: 'lowerback', sub: null, side: torsoSide }
  return { part: 'leg', sub: 'hip', side } // buttock
}

/** Does a zone fall inside a (possibly partial) selection? Missing sub/side match any. */
export const zoneMatches = (z: Zone, sel: { part: PartKey; sub: SubKey | null; side: Side | null }) =>
  z.part === sel.part && (sel.sub === null || z.sub === sel.sub) && (sel.side === null || z.side === sel.side)

/** Zones that face away from the viewer in Front view. */
export const facesBack = (z: { part: PartKey; sub: SubKey | null }) =>
  z.part === 'upperback' || z.part === 'lowerback' || (z.sub !== null && ['back', 'calf', 'heel', 'backofhand', 'hip'].includes(z.sub))

/** Anatomy name for the staff record: "Gastrocnemius.l" → "Gastrocnemius (left)". */
export function structureLabel(raw: string) {
  const m = raw.trim().match(/^(.*?)(?:\.(l|r|[a-z]))?(?:\.\d{3})?$/i)!
  const name = m[1].replace(/^\((.*)\)$/, '$1')
  return m[2] === 'l' ? `${name} (left)` : m[2] === 'r' ? `${name} (right)` : name
}
