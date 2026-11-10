import type { Bi, Item, Lang, LogEvent, Profile, Side } from './types.ts'
import { structureLabel } from './bodymap.ts'
import { C, DICT, NEXT, PART, SYM_HOW, SYM_WHAT, SYM_WHEN, isCardKey, painType, subOf, type CardKey, type PainType, type PartKey, type SubKey } from './vocab.ts'

export const alt = (l: Lang): Lang => (l === 'en' ? 'bm' : 'en')
/** "HH:MM" for now, or `ago` minutes before now. */
export const now = (ago = 0) => {
  const d = new Date(Date.now() - ago * 60_000)
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ---------- Message ---------- */
export const combined = (items: Item[], lang: Lang) => items.map(i => i.say[lang]).join(' ')

/* ---------- Pain ---------- */
/** `structure` is the anatomy name tapped on the 3D body (staff record only, never spoken). */
export type PainSite = { part: PartKey; sub: SubKey | null; side: Side | null; score: number; type: PainType | null; structure: string | null }
export type PainDraft = Omit<PainSite, 'part' | 'score'> & { part: PartKey | null; score: number | null; sites: PainSite[] }

const sideWord = (side: Side | null, lang: Lang) => (!side ? '' : lang === 'en' ? (side === 'l' ? 'left ' : 'right ') : side === 'l' ? ' kiri' : ' kanan')

/** "Left knee" / "lutut kiri": the sub-area when chosen, else the part. */
export function placeLabel(part: PartKey, sub: SubKey | null, side: Side | null, lang: Lang) {
  const p = (subOf(part, sub)?.l ?? PART[part].l)[lang]
  if (!side) return p
  return lang === 'en' ? sideWord(side, lang) + p.toLowerCase() : p.toLowerCase() + sideWord(side, lang)
}
export function painSay(site: PainSite): Bi {
  const ty = site.type ? painType(site.type) : null
  const sub = subOf(site.part, site.sub)
  const where = (lang: Lang) => (sub ? sub.say[lang].replace('{s}', sideWord(site.side, lang)) : (lang === 'en' ? 'in my ' : '') + placeLabel(site.part, null, site.side, lang).toLowerCase())
  return {
    en: `I have ${ty ? ty.en.toLowerCase() + ' ' : ''}pain ${where('en')}, rated ${site.score} out of 10.`,
    bm: `Saya mengalami sakit${ty ? ' ' + ty.bm.toLowerCase() : ''} pada ${where('bm')}, tahap ${site.score} daripada 10.`,
  }
}
export function painShort(site: PainSite): Bi {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return { en: `${cap(placeLabel(site.part, site.sub, site.side, 'en'))} pain ${site.score}/10`, bm: `Sakit ${placeLabel(site.part, site.sub, site.side, 'bm').toLowerCase()} ${site.score}/10` }
}
const B = (en: string, bm: string): Bi => ({ en, bm })
export function currentSite(d: PainDraft): { ok: true; site: PainSite } | { ok: false; missing: Bi } {
  if (!d.part) return { ok: false, missing: d.sites.length ? B('Add another spot, or save.', 'Tambah tempat lain, atau simpan.') : B('Choose where it hurts.', 'Pilih tempat yang sakit.') }
  if (PART[d.part].side === 'need' && !d.side) return { ok: false, missing: B('Choose left or right.', 'Pilih kiri atau kanan.') }
  if (d.score === null) return { ok: false, missing: B('Choose a number from 0 to 10.', 'Pilih nombor 0 hingga 10.') }
  return { ok: true, site: { part: d.part, sub: d.sub, side: d.side, score: d.score, type: d.type, structure: d.structure } }
}
export const painItem = (site: PainSite) => ({
  kind: 'pain' as const,
  say: painSay(site),
  short: painShort(site),
  meta: {
    score: site.score,
    site: painShort(site).en.replace(/ pain.*/, ''),
    ...(site.structure && { detail: 'Tapped on 3D body: ' + structureLabel(site.structure) }),
  },
})

/* ---------- Symptoms ---------- */
export type SymDraft = { what: string | null; when: string | null; how: string | null }
export function symSay(s: SymDraft): Bi {
  const w = SYM_WHAT.find(x => x.k === s.what)!, t = SYM_WHEN.find(x => x.k === s.when)!, h = SYM_HOW.find(x => x.k === s.how)
  return { en: `I have had ${w.say.en} ${t.say.en}.${h ? ' ' + h.say.en : ''}`, bm: `Saya mengalami ${w.say.bm} ${t.say.bm}.${h ? ' ' + h.say.bm : ''}` }
}
export function symShort(s: SymDraft): Bi {
  const lab = SYM_WHAT.find(x => x.k === s.what)!.label, wh = SYM_WHEN.find(x => x.k === s.when)!.label
  return { en: `${lab.en}, ${wh.en.toLowerCase()}`, bm: `${lab.bm}, ${wh.bm.toLowerCase()}` }
}

/* ---------- AI wording (simulated) ---------- */
const PRI: Partial<Record<Item['kind'], number>> = { pain: 0, symptom: 1, answer: 2, need: 3, request: 3, question: 4, feeling: 5 }
const lc = (s: string) => (/^I[ ']/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1))
const strip = (s: string) => s.replace(/[.?!]+$/, '')
function joinClauses(list: Item[], lang: Lang) {
  const and = lang === 'en' ? ', and ' : ', dan '
  const parts = list.map(i => strip(i.say[lang]).split(/(?<=[.?!])\s+/).map((x, j) => (j ? lc(strip(x)) : strip(x))).join(and))
  return parts.map((p, idx) => (idx === 0 ? p : lc(p))).join(and) + '.'
}
/** A suggested sentence plus what makes it different from the others. */
export type Candidate = Bi & { tag: Bi }
export type Candidates = { list: Candidate[]; uses: string; blocked: { text: string; why: string } | null }
export function candidates(items: Item[], lang: Lang): Candidates | null {
  const content = items.filter(i => i.kind !== 'reply')
  if (content.length < 2) return null
  const sorted = content.toSorted((a, b) => (PRI[a.kind] ?? 9) - (PRI[b.kind] ?? 9))
  // "Most urgent first" only when it actually reorders; otherwise it is the message as it stands.
  const reordered = sorted.some((i, k) => i !== content[k])
  const list: Candidate[] = [
    { en: joinClauses(content, 'en'), bm: joinClauses(content, 'bm'), tag: { en: 'Joined into one', bm: 'Digabung jadi satu' } },
    ...(reordered ? [{ en: sorted.map(i => i.say.en).join(' '), bm: sorted.map(i => i.say.bm).join(' '), tag: { en: 'Most urgent first', bm: 'Paling penting dahulu' } }] : []),
    { en: 'For staff: ' + sorted.map(i => i.short.en).join(' · '), bm: 'Untuk staf: ' + sorted.map(i => i.short.bm).join(' · '), tag: { en: 'Short, for staff', bm: 'Ringkas, untuk staf' } },
  ]
  const uses = sorted.map(i => i.short[lang]).join(' · ')
  // Fact guard: a suggestion that adds a time the patient never chose is hidden, not offered.
  const hasTime = content.some(i => /since|for a few days|just now/i.test(i.say.en))
  const painish = sorted.find(i => i.kind === 'pain' || i.kind === 'symptom')
  const blocked = !hasTime && painish ? { text: strip(painish.say.en) + ' since yesterday.', why: 'adds a time ("since yesterday") the patient did not choose' } : null
  return { list, uses, blocked }
}

/* ---------- Suggested row ---------- */
/**
 * Up to four shortcuts: follow-ups to the last choice first, then common requests for the
 * setting and time. Cards already on screen are skipped, so the row only offers new choices.
 */
export function suggestions(profile: Profile, items: Item[], hour: number, onScreen: CardKey[] = [], common = true) {
  const night = hour >= 21 || hour < 6
  const base: CardKey[] = !common ? [] : profile === 'fd' ? ['register', 'appointment', 'pharmacy', 'toilet', 'medicine', 'doctor', 'nurse'] : night ? ['toilet', 'water', 'cold', 'lights', 'rest', 'doctor'] : ['water', 'toilet', 'reposition', 'pain', 'hungry', 'rest', 'doctor']
  const lastItem = items.at(-1)
  const lastKey = lastItem ? (lastItem.key ?? (lastItem.kind === 'pain' ? 'pain' : undefined)) : undefined
  const last = isCardKey(lastKey) ? lastKey : null
  const after = (last && NEXT[last]) || []
  const skip = new Set<string | undefined>([...items.map(i => i.key), ...onScreen])
  const out = [...new Set([...after, ...base])].filter(k => !skip.has(k)).slice(0, 4)
  const why: Bi = last && out.some(k => after.includes(k)) ? B(`After "${C[last].label.en}"`, `Selepas "${C[last].label.bm}"`) : profile === 'bs' && night ? B('Night-time requests', 'Permintaan waktu malam') : B('Common at this time', 'Biasa pada waktu ini')
  return { out, why }
}

/* ---------- Type tab word suggestions ---------- */
export function wordSuggestions(value: string) {
  const w = (value.split(/\s+/).pop() || '').toLowerCase()
  return (w ? DICT.filter(d => d.startsWith(w) && d !== w) : ['I need', 'Please', 'My', 'It hurts', 'Saya perlukan', 'Tolong']).slice(0, 6)
}
/** Replaces the word being typed with the chosen suggestion. */
export function insertWord(value: string, word: string) {
  const parts = value.split(/(\s+)/)
  if (value && !/\s$/.test(value)) parts.pop()
  return parts.join('') + word + ' '
}

/** Rows staff act on (seen → done). Staff replies, alerts, answers and whole-message repeats are not requests. */
export const isOpenable = (e: LogEvent) => !['staff', 'alert', 'answer'].includes(e.kind) && !(e.kind === 'message' && (e.src === 'Speak message' || e.src.startsWith('AI wording')))

/* ---------- Staff summary (simulated AI: every line cites log events) ---------- */
export type SummaryLine = { lead?: string; text: string; refs: number[] }
export function summary(ev: LogEvent[]): SummaryLine[] {
  const out: SummaryLine[] = []
  const ns = (list: LogEvent[]) => list.map(e => e.n)
  const pains = ev.filter(e => e.kind === 'pain')
  if (pains.length) {
    const last = pains[pains.length - 1]
    out.push({ text: `Latest pain report: ${last.site || 'see message'}, patient rated ${last.score}/10 at ${last.t}.`, refs: [last.n] })
    if (pains.length > 1) {
      const first = pains[0]
      out.push({ text: `Patient's own scores went from ${first.score}/10 (${first.t}) to ${last.score}/10 (${last.t}).`, refs: [first.n, last.n] })
    }
  }
  // A detailed request ("I would like to register. This is my first visit…") replaces the bare one before it.
  const asked = ev.filter(e => e.kind === 'need' || e.kind === 'request')
  const needs = asked.filter((e, i) => !asked.slice(i + 1).some(o => o.en.startsWith(e.en.replace(/\.$/, ''))))
  const end = (t: string) => (/[.?!]$/.test(t) ? t : t + '.')
  if (needs.length) out.push({ text: end(`Requests: ${needs.map(e => e.en.replace(/\.$/, '')).join('; ')}`), refs: ns(needs) })
  const ans = ev.filter(e => e.kind === 'answer')
  if (ans.length) out.push({ text: `Answers to staff: ${ans.map(e => e.en).join(' ')}`, refs: ns(ans) })
  const feel = ev.filter(e => e.kind === 'feeling' || e.kind === 'question' || e.kind === 'symptom')
  if (feel.length) out.push({ text: `Also said: ${feel.map(e => e.en).join(' ')}`, refs: ns(feel) })
  const alerts = ev.filter(e => e.kind === 'alert')
  if (alerts.length) out.push({ text: `Emergency button used: ${alerts.map(e => e.en).join(' ')}`, refs: ns(alerts) })
  const unseen = ev.filter(e => !e.seen)
  if (unseen.length) out.push({ lead: 'Not yet marked seen:', text: ` ${unseen.length} item${unseen.length > 1 ? 's' : ''}.`, refs: ns(unseen) })
  return out
}
/** Plain-text form, matching what the mockup copied (li.textContent). */
export const summaryText = (lines: SummaryLine[]) => lines.map(l => '- ' + (l.lead ?? '') + l.text + l.refs.map(n => '#' + n).join('')).join('\n')
