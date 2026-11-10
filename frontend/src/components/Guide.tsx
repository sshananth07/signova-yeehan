import { useEffect, useRef, useState } from 'react'
import { useBoard } from '../store.ts'
import { Icon } from './Icon.tsx'
import { CloseButton, SheetTitle, btnAlt, btnPrimary, elapsed, sheetHead, useNow } from './ui.tsx'

/** Short, task-based staff guide. Searchable, opened from the Staff menu or the nurse station. */
const GUIDE: [title: string, steps: string[]][] = [
  ['Start or end a visit', [
    'Front desk: the patient taps cards or uses the guided steps (Register, Appointment, Directions, Pharmacy).',
    'Staff menu → Start new visit clears the message and log for the next patient (Undo is offered).',
    'If the front-desk board sits untouched for 10 minutes it asks "Still with this patient?" and clears itself after 30 seconds without an answer.',
    'Bedside keeps its message and log for the whole stay.',
  ]],
  ['Read what the patient said', [
    'The large text in the message panel is the whole message, in the patient\'s language with the other language underneath.',
    'Tap Show for a full-screen version you can read across the counter, with reply buttons.',
    'Each chip shows how it was chosen, and a tick once staff have seen or finished it.',
  ]],
  ['Reply to the patient', [
    'Reply from the counter view (Show), from Visit summary / Shift handover, or from the nurse station.',
    'The reply appears in the patient\'s message panel and is read aloud. Replies with a number ask for it first.',
    'A reply with a time ("in 10 minutes") makes that request due then; it turns overdue at the station if not marked Done.',
  ]],
  ['Seen and Done', [
    'Mark seen: the patient gets a tick, so they know the request landed.',
    'Done: the request is dealt with. It leaves the station\'s open list and the patient sees "Done".',
    'If the patient asks for the same thing again before it is done, the station shows "Asked 2×" instead of a new row.',
  ]],
  ['Nurse station', [
    'Staff menu → Nurse station opens it in a new tab. Keep that tab open.',
    'Click the yellow banner once so the alarm sound is on; browsers keep a tab silent until it is clicked.',
    'Open requests are sorted overdue first, then new, then due.',
  ]],
  ['Emergency', [
    'The patient\'s Emergency button fills their screen and rings at the nurse station.',
    'After one minute without an answer both get louder and show "Not answered yet".',
    'Acknowledge at the bed, or tap "I\'m going" at the station to tell the patient a nurse is coming.',
    'Cancelling needs a 2-second hold. The alarm does not call an ambulance.',
  ]],
  ['Pain reports', [
    'Pain opens the body map: where, how much (0–10 face scale) and what it feels like.',
    '45 minutes after a pain report or a Medicine request the board asks "How is your pain now?". Answers go into the pain trend in Shift handover.',
  ]],
  ['Ask the patient by voice', [
    'Ask by voice shows your question on the board with answer buttons the patient can tap. In this demo the questions are a fixed set.',
  ]],
  ['If something goes wrong', [
    'No sound from the board: the device has no voice for that language. Tap Show so the message can be read instead.',
    '"Could not save": the device is full or blocks saving. The board still works; start a new visit to free space.',
    'Station silent: click its yellow sound banner.',
  ]],
]

export function GuideDrawer() {
  const setGuide = useBoard(s => s.setGuide)
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = GUIDE.filter(([title, steps]) => !needle || [title, ...steps].some(x => x.toLowerCase().includes(needle)))
  return (
    <aside role="dialog" aria-modal="false" aria-labelledby="guideT" className="fixed top-0 right-0 bottom-(--foot) z-80 flex w-[min(440px,94vw)] animate-drawer-in flex-col border-l border-line bg-surface shadow-[-10px_0_30px_rgba(14,18,40,.12)]">
      <div className={`${sheetHead} items-start`}>
        <SheetTitle id="guideT" title="Staff guide" sub="How to use Signova with a patient." />
        <CloseButton label="Close guide" onClick={() => setGuide(false)} />
      </div>
      <div className="grid content-start gap-4 overflow-auto px-5 py-4">
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search the guide, e.g. reply, emergency" aria-label="Search the guide"
          className="min-h-11 w-full rounded-[12px] border border-line-2 bg-surface-2 px-3.5 text-[15px] focus:border-brand-ink focus:outline-none" />
        {shown.length ? shown.map(([title, steps]) => (
          <section key={title}>
            <h3 className="mb-1.5 text-[16px]">{title}</h3>
            <ul className="m-0 grid list-disc gap-1 pl-[18px] text-[14.5px] marker:text-brand-ink">{steps.map(x => <li key={x}>{x}</li>)}</ul>
          </section>
        )) : <p className="text-[14.5px] text-muted">Nothing matches "{q}". Try "reply", "seen", "station" or "pain".</p>}
      </div>
    </aside>
  )
}

/** Front-desk boards are shared: after a quiet spell, check before the next patient sees the last one's message. */
const IDLE_MS = (Number(new URLSearchParams(location.search).get('idle')) || 600) * 1000 // ?idle=seconds, for demos
const GRACE_MS = 30_000

export function IdleGuard() {
  const busy = useBoard(s => s.profile === 'fd' && !s.alarm && (s.items.length > 0 || s.events.fd.length > 0))
  const newVisit = useBoard(s => s.newVisit)
  const last = useRef(Date.now())
  const [deadline, setDeadline] = useState<number | null>(null)
  const t = useNow(1000)
  useEffect(() => {
    const mark = () => { last.current = Date.now() }
    document.addEventListener('pointerdown', mark)
    document.addEventListener('keydown', mark)
    return () => { document.removeEventListener('pointerdown', mark); document.removeEventListener('keydown', mark) }
  }, [])
  useEffect(() => {
    if (!busy) return setDeadline(null)
    if (deadline === null && t - last.current > IDLE_MS) setDeadline(t + GRACE_MS)
    if (deadline !== null && t >= deadline) { setDeadline(null); last.current = Date.now(); newVisit() }
  }, [t, busy, deadline, newVisit])
  if (deadline === null) return null
  const keep = () => { last.current = Date.now(); setDeadline(null) }
  return (
    <div className="fixed inset-x-0 top-0 bottom-(--foot) z-90 grid animate-fade place-items-center bg-[rgba(14,18,40,.42)] p-4">
      <div role="alertdialog" aria-labelledby="idleT" className="w-[min(520px,100%)] animate-sheet-in rounded-[24px] bg-surface p-6 text-center shadow-[0_24px_60px_rgba(14,18,40,.28)]">
        <Icon name="clock" className="mx-auto size-10 text-brand-ink" />
        <h2 id="idleT" className="mt-2 text-[24px]">Still with this patient?</h2>
        <p className="mt-1 text-[17px] text-ink-2">Masih dengan pesakit ini?</p>
        <p className="mt-3 text-[15px] text-muted">The message clears for the next patient in <b className="text-ink tabular-nums">{elapsed(deadline - t)}</b>.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <button className={btnPrimary} onClick={keep}><Icon name="check" className="size-[19px]" />Keep · Teruskan</button>
          <button className={btnAlt} onClick={() => { setDeadline(null); newVisit() }}><Icon name="trash" className="size-[19px]" />New visit · Lawatan baru</button>
        </div>
      </div>
    </div>
  )
}
