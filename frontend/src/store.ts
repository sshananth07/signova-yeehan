import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { cancelSpeech, speakText } from './lib/speech.ts'
import { combined, isOpenable, now, painItem } from './lib/text.ts'
import type { Bi, IconName, Item, Kind, Lang, LogEvent, NewItem, Profile, Reply, TabKey } from './lib/types.ts'
import { C, PROFILES, STAFF_Q, catOf, card, type CardKey, type FlowKey, type StaffQuestion } from './lib/vocab.ts'

/** `msg` as Bi when the patient reads it; a plain string for staff-only notices. */
type Toast = { id: number; msg: string | Bi; icon: IconName; action?: { label: Bi; run: () => void } }
const B = (en: string, bm: string): Bi => ({ en, bm })
const UNDO = B('Undo', 'Buat asal')
/** A repeat of the same request within this window bumps the first one instead of adding a new row. */
const REPEAT_MS = 10 * 60_000
/** Emergency in progress: when it was pressed and at which board. */
type Alarm = { at: number; profile: Profile }
/** Next "How is your pain now?" prompt. */
type Check = { at: number; profile: Profile; site?: string }

/** Pain check-back delay after a pain report or a medicine request. */
export const CHECK_MS = 45 * 60_000
const SNOOZE_MS = 15 * 60_000

type BoardState = {
  profile: Profile
  lang: Lang
  tab: TabKey
  items: Item[]
  aiChoice: Bi | null
  lastSpoken: string | null
  speaking: boolean
  listening: boolean
  staffQIdx: Record<Profile, number>
  activeQ: StaffQuestion | null
  events: Record<Profile, LogEvent[]>
  night: boolean
  notes: boolean
  modal: 'pain' | FlowKey | null
  staffOpen: boolean
  /** Full-screen "show to clerk" view. */
  clerk: boolean
  /** Staff guide drawer. */
  guide: boolean
  alarm: Alarm | null
  reply: Reply | null
  check: Check | null
  bigImage: string | null
  toast: Toast | null
}

type BoardActions = {
  showToast: (msg: string | Bi, icon?: IconName, action?: Toast['action']) => void
  speak: (text: string) => void
  stopSpeech: () => void
  /** Adds a staff-log row (to `profile`, default the current board) and returns its number. */
  logEvent: (kind: Kind, say: Bi, src: string, extra?: Partial<LogEvent>, profile?: Profile) => number
  addItem: (item: NewItem, src: string, silent?: boolean) => void
  addCard: (key: CardKey, src?: string) => void
  removeItem: (uid: number) => void
  clearItems: () => void
  speakMessage: () => void
  replay: () => void
  chooseCandidate: (c: Bi) => void
  staffAsk: () => void
  answer: (i: number) => void
  dismissQ: () => void
  switchProfile: (p: Profile) => void
  setLang: (l: Lang) => void
  setTab: (t: TabKey) => void
  toggleNight: () => void
  setNotes: (on: boolean) => void
  setModal: (m: BoardState['modal']) => void
  setStaffOpen: (open: boolean) => void
  toggleSeen: (n: number, profile?: Profile) => void
  /** `to`: the log row(s) being answered; they count as seen. */
  sendReply: (profile: Profile, text: Bi, icon: IconName, to?: number | number[], dueMin?: number) => void
  markDone: (n: number, profile?: Profile) => void
  setGuide: (open: boolean) => void
  dismissReply: () => void
  setClerk: (open: boolean) => void
  newVisit: () => void
  checkPain: (score: number) => void
  snoozeCheck: () => void
  startAlarm: () => void
  stopAlarm: (outcome: 'ack' | 'cancel') => void
  setBigImage: (src: string | null) => void
}

// Seeded from the clock so chips stay unique after a reload restores saved ones.
let uid = Date.now()
let speakId = 0
let toastId = 0

const cardItem = (key: CardKey): NewItem => {
  const c = card(key)
  if ('action' in c) throw new Error(`${key} opens a guided flow, not a message`)
  return { key, kind: c.kind, cat: catOf(key), say: c.say, short: c.short }
}

// Seeded bedside history (earlier in the stay), timed back from now so it never sits in the future.
const BEDSIDE_HISTORY: LogEvent[] = [
  { n: 1, t: now(690), kind: 'need', en: 'I need water.', bm: 'Saya perlukan air.', src: 'Card', seen: true, seenAt: now(688), doneAt: now(680) },
  { n: 2, t: now(600), kind: 'pain', en: 'I have sharp pain in my lower back, rated 7 out of 10.', bm: 'Saya mengalami sakit tajam pada belakang bawah, tahap 7 daripada 10.', src: 'Body map', seen: true, score: 7, site: 'Lower back', doneAt: now(580) },
  { n: 3, t: now(520), kind: 'answer', en: 'Staff asked "Have you eaten?" → A little.', bm: 'Staf tanya "Dah makan?" → Sedikit.', src: 'Staff question', seen: true },
  { n: 4, t: now(485), kind: 'need', en: 'Please help me change position.', bm: 'Tolong ubah posisi saya.', src: 'Suggested row', seen: true, doneAt: now(475) },
  { n: 5, t: now(340), kind: 'pain', en: 'I have pain in my lower back, rated 5 out of 10.', bm: 'Saya mengalami sakit pada belakang bawah, tahap 5 daripada 10.', src: 'Body map', seen: true, score: 5, site: 'Lower back', doneAt: now(325) },
  { n: 6, t: now(215), kind: 'feeling', en: 'I feel scared.', bm: 'Saya rasa takut.', src: 'Card', seen: false },
  { n: 7, t: now(20), kind: 'pain', en: 'I have dull pain in my lower back, rated 4 out of 10.', bm: 'Saya mengalami sakit tumpul pada belakang bawah, tahap 4 daripada 10.', src: 'Body map', seen: true, score: 4, site: 'Lower back', doneAt: now(5) },
]

// Start in a realistic working state: a front-desk visit with two items already chosen.
const demoPain = painItem({ part: 'leg', sub: null, side: 'l', score: 6, type: 'sharp', structure: null })
const DEMO_ITEMS: Item[] = [
  { ...cardItem('register'), uid: uid++, src: 'Card', ev: 1 },
  { ...demoPain, uid: uid++, src: 'Body map', ev: 2 },
]
const DEMO_EVENTS: LogEvent[] = [
  { n: 1, t: now(), kind: 'request', ...C.register.say, src: 'Card', seen: false },
  { n: 2, t: now(), kind: 'pain', ...demoPain.say, src: 'Body map', seen: false, ...demoPain.meta },
]

const STORE_KEY = 'signova-board'

/** localStorage that tells staff once when the device stops saving (full or blocked) instead of failing silently. */
let warnedSave = false
const safeStorage = {
  getItem: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  removeItem: (k: string) => { try { localStorage.removeItem(k) } catch { /* nothing to remove */ } },
  setItem: (k: string, v: string) => {
    try { localStorage.setItem(k, v) } catch {
      if (warnedSave) return
      warnedSave = true
      setTimeout(() => useBoard.getState().showToast('This device could not save the board. It still works, but a refresh will lose the message. Start a new visit to free space.', 'alert'))
    }
  },
}

export const useBoard = create<BoardState & BoardActions>()(persist((set, get) => ({
  profile: 'fd',
  lang: 'en',
  tab: 'main',
  items: DEMO_ITEMS,
  aiChoice: null,
  lastSpoken: null,
  speaking: false,
  listening: false,
  staffQIdx: { fd: 0, bs: 0 },
  activeQ: null,
  events: { fd: DEMO_EVENTS, bs: BEDSIDE_HISTORY },
  night: false,
  notes: false,
  modal: null,
  staffOpen: false,
  clerk: false,
  guide: false,
  alarm: null,
  reply: null,
  check: null,
  bigImage: null,
  toast: null,

  showToast: (msg, icon = 'check', action) => set({ toast: { id: ++toastId, msg, icon, action } }),

  speak: text => {
    const id = ++speakId
    const done = () => { if (id === speakId) set({ speaking: false }) }
    set({ lastSpoken: text, speaking: true })
    const cannot = () => get().showToast(B('Speech is not available on this device. Tap Show so staff can read it.', 'Suara tidak tersedia pada peranti ini. Tekan Tunjuk supaya staf boleh membaca.'), 'info', { label: B('Show', 'Tunjuk'), run: () => set({ clerk: true }) })
    const ok = speakText(text, get().lang, done, cannot)
    // ponytail: fixed fallback timers; some browsers never fire onend
    setTimeout(done, ok ? 15000 : 1400)
    if (ok) get().showToast(B('Speaking: ' + text, 'Bercakap: ' + text), 'vol')
    else cannot()
  },

  stopSpeech: () => {
    speakId++
    cancelSpeech()
    set({ speaking: false })
    get().showToast(B('Speech stopped.', 'Suara dihentikan.'), 'stop')
  },

  logEvent: (kind, say, src, extra, profile = get().profile) => {
    const n = get().events[profile].length + 1
    const row: LogEvent = { n, t: now(), at: Date.now(), kind, en: say.en, bm: say.bm, src, seen: false, ...extra }
    set(s => ({ events: { ...s.events, [profile]: [...s.events[profile], row] } }))
    return n
  },

  addItem: (item, src, silent) => {
    const profile = get().profile
    // Asking again for something not yet done re-flags the first request (station shows "asked 2×") instead of a new row.
    const prev = silent ? undefined : get().events[profile].findLast(e => e.en === item.say.en && !e.doneAt && !!e.at && Date.now() - e.at < REPEAT_MS && isOpenable(e))
    let ev: number | undefined
    if (prev) {
      ev = prev.n
      set(s => ({ events: { ...s.events, [profile]: s.events[profile].map(e => (e.n === prev.n ? { ...e, asks: (e.asks ?? 1) + 1, seen: false, seenAt: undefined, at: Date.now() } : e)) } }))
    } else if (!silent) ev = get().logEvent(item.kind, item.say, src, item.meta)
    // A repeat whose chip is still in the message is re-flagged and spoken, not added twice.
    if (!(prev && get().items.some(i => i.ev === prev.n))) set(s => ({ items: [...s.items, { ...item, uid: uid++, src, ev }], aiChoice: null }))
    if (silent) return
    get().speak(item.say[get().lang])
    if (prev) get().showToast(prev.seenAt
      ? B(`Asked again. Staff saw your first request at ${prev.seenAt}.`, `Diminta semula. Staf melihat permintaan pertama pada ${prev.seenAt}.`)
      : B('Asked again. Staff have been told it is the second time.', 'Diminta semula. Staf dimaklumkan ini kali kedua.'), 'repeat')
    // Ask again later how the pain is, after a pain report or a medicine request.
    if (item.kind === 'pain' || item.key === 'medicine') {
      const site = item.meta?.site || get().events[get().profile].findLast(e => e.kind === 'pain')?.site
      set({ check: item.meta?.score === 0 ? null : { at: Date.now() + CHECK_MS, profile: get().profile, site } })
    }
  },

  addCard: (key, src = 'Card') => {
    const c = card(key)
    if ('action' in c) return set({ modal: c.action })
    if (c.flow) return set({ modal: c.flow })
    get().addItem(cardItem(key), src)
  },

  removeItem: id => set(s => ({ items: s.items.filter(i => i.uid !== id), aiChoice: null })),

  clearItems: () => {
    const { items, aiChoice } = get()
    if (!items.length) return
    set({ items: [], aiChoice: null })
    get().showToast(B('Message cleared.', 'Mesej dipadam.'), 'trash', { label: UNDO, run: () => set({ items, aiChoice }) })
  },

  speakMessage: () => {
    const { items, aiChoice, lang, speak, logEvent, showToast } = get()
    if (!items.length) return showToast(B('Nothing to speak yet. Tap a card first.', 'Belum ada mesej. Sentuh kad dahulu.'), 'tap')
    speak(aiChoice ? aiChoice[lang] : combined(items, lang))
    logEvent('message', aiChoice ?? { en: combined(items, 'en'), bm: combined(items, 'bm') }, 'Speak message')
  },

  replay: () => {
    const { lastSpoken, speak, showToast } = get()
    if (lastSpoken) speak(lastSpoken)
    else showToast(B('Nothing spoken yet.', 'Belum ada yang disebut.'), 'info')
  },

  chooseCandidate: c => {
    set({ aiChoice: c })
    get().speak(c[get().lang])
    get().logEvent('message', c, 'AI wording (patient chose)')
  },

  // Simulated speech-to-answers: the browser frame blocks the microphone.
  staffAsk: () => {
    set({ listening: true })
    setTimeout(() => {
      const { profile, staffQIdx } = get()
      const list = STAFF_Q[profile]
      set({ listening: false, activeQ: list[staffQIdx[profile] % list.length], staffQIdx: { ...staffQIdx, [profile]: staffQIdx[profile] + 1 } })
    }, 1100)
  },

  answer: i => {
    const { activeQ: q, lang, addItem, speak, logEvent } = get()
    if (!q) return
    const a = q.a[i]
    addItem({ kind: 'answer', say: { en: a.en + '.', bm: a.bm + '.' }, short: a }, 'Staff question', true)
    speak(a[lang] + '.')
    logEvent('answer', { en: `Staff asked "${q.q.en}" → ${a.en}.`, bm: `Staf tanya "${q.q.bm}" → ${a.bm}.` }, 'Staff question')
    set({ activeQ: null })
  },

  dismissQ: () => set({ activeQ: null }),

  switchProfile: p => {
    if (get().profile === p) return
    set(s => ({ profile: p, tab: 'main', items: [], aiChoice: null, activeQ: null, night: p === 'fd' ? false : s.night }))
    get().showToast(PROFILES[p].switchToast)
  },

  setLang: lang => set({ lang }),
  setTab: tab => set({ tab }),
  toggleNight: () => set(s => ({ night: !s.night })),
  setNotes: notes => set({ notes }),
  setModal: modal => set({ modal }),
  setStaffOpen: staffOpen => set({ staffOpen }),

  toggleSeen: (n, profile = get().profile) =>
    set(s => ({ events: { ...s.events, [profile]: s.events[profile].map(e => (e.n === n ? { ...e, seen: !e.seen, seenAt: e.seen ? undefined : now() } : e)) } })),

  sendReply: (profile, text, icon, to, dueMin) => {
    // Answering a request marks it seen; a reply with a time ("in 10 minutes") makes it due then.
    const answered = new Set([to ?? []].flat())
    const due = dueMin ? Date.now() + dueMin * 60_000 : undefined
    set(s => ({ events: { ...s.events, [profile]: s.events[profile].map(e => (answered.has(e.n) ? { ...e, seen: true, seenAt: e.seenAt ?? now(), ...(due && { due }) } : e)) } }))
    get().logEvent('staff', { en: 'Staff replied: ' + text.en, bm: 'Staf membalas: ' + text.bm }, 'Staff reply', { seen: true }, profile)
    set({ reply: { id: Date.now(), profile, t: now(), text, icon, due } })
    get().showToast('Reply sent to the patient.', 'chat')
  },

  markDone: (n, profile = get().profile) =>
    set(s => ({ events: { ...s.events, [profile]: s.events[profile].map(e => (e.n === n ? { ...e, seen: true, seenAt: e.seenAt ?? now(), doneAt: now(), due: undefined } : e)) } })),

  setGuide: guide => set({ guide }),
  dismissReply: () => set({ reply: null }),
  setClerk: clerk => set({ clerk }),

  newVisit: () => {
    const { profile, items, aiChoice, events, reply, check } = get()
    const keep = { items, aiChoice, events, reply, check }
    set({ items: [], aiChoice: null, activeQ: null, events: { ...events, [profile]: [] }, reply: reply?.profile === profile ? null : reply, check: check?.profile === profile ? null : check, staffOpen: false })
    get().showToast('New visit started. Message and log cleared.', 'trash', { label: UNDO, run: () => set(keep) })
  },

  checkPain: score => {
    const site = get().check?.site
    get().addItem({
      kind: 'pain',
      say: { en: `My pain${site ? ' in my ' + site.toLowerCase() : ''} is now ${score} out of 10.`, bm: `Tahap sakit saya sekarang ${score} daripada 10.` },
      short: { en: `Pain now ${score}/10`, bm: `Sakit sekarang ${score}/10` },
      meta: { score, site: site ?? '' },
    }, 'Pain check')
  },

  snoozeCheck: () => set(s => ({ check: s.check && { ...s.check, at: Date.now() + SNOOZE_MS } })),

  startAlarm: () => {
    cancelSpeech()
    const profile = get().profile
    set({ alarm: { at: Date.now(), profile } })
    get().logEvent('alert', { en: 'Emergency button pressed.', bm: 'Butang kecemasan ditekan.' }, 'Emergency button')
  },

  stopAlarm: outcome => {
    const ack = outcome === 'ack'
    const profile = get().alarm?.profile ?? get().profile
    // Acknowledging or cancelling closes the open alert rows, so they stop counting as waiting.
    set(s => ({ alarm: null, events: { ...s.events, [profile]: s.events[profile].map(e => (e.kind === 'alert' && !e.seen ? { ...e, seen: true, seenAt: now() } : e)) } }))
    get().logEvent('alert', ack ? { en: 'Alert acknowledged by staff.', bm: 'Amaran diakui oleh staf.' } : { en: 'Alert cancelled: pressed by mistake.', bm: 'Amaran dibatalkan: tertekan.' }, ack ? 'Staff' : 'Patient', { seen: true }, profile)
    get().showToast(ack ? B('Alert acknowledged. Message kept.', 'Amaran diakui. Mesej disimpan.') : B('Alert cancelled. Message kept.', 'Amaran dibatalkan. Mesej disimpan.'))
  },

  setBigImage: bigImage => set({ bigImage }),
}), {
  name: STORE_KEY,
  version: 1,
  storage: createJSONStorage(() => safeStorage),
  // Only what a refresh should keep; open windows, toasts and speech state start fresh.
  partialize: s => ({ profile: s.profile, lang: s.lang, tab: s.tab, items: s.items, aiChoice: s.aiChoice, lastSpoken: s.lastSpoken, staffQIdx: s.staffQIdx, events: s.events, night: s.night, alarm: s.alarm, reply: s.reply, check: s.check }),
}))

// Boards and the nurse-station tab share one saved state; pick up writes from other tabs.
// ponytail: last write wins across tabs; fine for one device, a server replaces this for real wards.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => { if (e.key === STORE_KEY) void useBoard.persist.rehydrate() })
}
