import { useEffect, useRef, useState } from 'react'
import { useBoard } from '../store.ts'
import { startBeep } from '../lib/speech.ts'
import { cn, combined } from '../lib/text.ts'
import { PROFILES, kindCat } from '../lib/vocab.ts'
import { Icon } from './Icon.tsx'
import { ReplyPicker } from './Reply.tsx'
import { Badge, CloseButton, SheetTitle, Tip, btnPrimary, elapsed, sheetHead, useNow } from './ui.tsx'

export function Footer() {
  const profile = useBoard(s => s.profile)
  const startAlarm = useBoard(s => s.startAlarm)
  const first = useBoard(s => s.events[s.profile][0]?.t)
  const [title, loc] = PROFILES[profile].loc
  // The front-desk visit starts at its first logged message; New visit clears the log.
  const sub = profile === 'fd' ? `${loc} · ${first ? `Visit started ${first}` : 'New visit'}` : loc
  return (
    <footer className="relative z-70 flex h-(--foot) items-center gap-4 border-t border-line bg-surface px-5 max-md:sticky max-md:bottom-0 max-sm:px-3">
      <div className="flex min-w-0 items-center gap-2.5 text-[14px] max-sm:hidden">
        <Icon name="pin" className="size-[22px] text-brand-ink" />
        <div><b className="block">{title}</b><span className="text-muted max-md:hidden">{sub}</span></div>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-[7px] text-[13px] text-muted max-md:hidden">
        <span className="size-2 rounded-full bg-yes shadow-[0_0_0_3px_var(--yes-soft)]" />Speech ready · English and Malay
      </div>
      <div className="relative ml-auto max-sm:flex-1"><Badge n={9} />
        <button onClick={startAlarm} className="flex min-h-[60px] items-center gap-3 rounded-[16px] border-0 bg-danger py-2 pr-6 pl-2 text-left text-[19px] font-extrabold tracking-[.03em] text-white shadow-[0_6px_16px_rgba(217,45,32,.32)] transition-[background-color,scale] duration-200 ease-spring hover:bg-danger-ink active:scale-[.98] max-sm:w-full max-sm:pr-4">
          <span className="grid size-11 place-items-center rounded-[12px] bg-[rgba(255,255,255,.2)]"><Icon name="alert" /></span>
          <span>EMERGENCY<small className="block text-[12px] font-medium tracking-normal">KECEMASAN</small></span>
        </button>
      </div>
    </footer>
  )
}

/** Cancel needs a 2-second hold, so a second panicked tap cannot silence the alarm. */
function HoldToCancel({ onDone }: { onDone: () => void }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const start = () => { setHolding(true); timer.current = window.setTimeout(onDone, 2000) }
  const stop = () => { setHolding(false); clearTimeout(timer.current) }
  return (
    <button onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={e => e.preventDefault()}
      onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start() } }} onKeyUp={stop}
      className="inline-flex min-h-[52px] touch-none items-center gap-3 rounded-[14px] border border-white/50 bg-transparent px-5 text-[16px] font-bold text-white select-none">
      <svg viewBox="0 0 24 24" className="size-7 -rotate-90" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="3" />
        <circle cx="12" cy="12" r="10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" pathLength={100} strokeDasharray={100}
          strokeDashoffset={holding ? 0 : 100} style={{ transition: holding ? 'stroke-dashoffset 2s linear' : 'stroke-dashoffset .2s' }} />
      </svg>
      Hold to cancel · Tahan untuk batal
    </button>
  )
}

export function Alarm() {
  const alarm = useBoard(s => s.alarm)
  const stopAlarm = useBoard(s => s.stopAlarm)
  const t = useNow(1000)
  const ms = alarm ? t - alarm.at : 0
  const loud = ms >= 60_000
  useEffect(() => startBeep(loud), [loud])
  if (!alarm) return null
  return (
    <div role="alertdialog" aria-labelledby="alarmT" className="fixed inset-0 z-100 grid animate-flash place-items-center overflow-auto bg-danger p-6 text-center text-white">
      <div>
        <div className="mx-auto mb-5 grid size-[104px] animate-ring place-items-center rounded-full bg-[rgba(255,255,255,.18)]"><Icon name="alert" className="size-14" /></div>
        <h2 id="alarmT" className="text-[56px] font-extrabold tracking-[-.02em] text-white max-sm:text-[36px]">PATIENT NEEDS HELP NOW</h2>
        <p className="my-2 text-[24px] max-sm:text-[19px]">PESAKIT PERLUKAN BANTUAN SEGERA</p>
        <p className="my-2 text-[20px] opacity-95">{PROFILES[alarm.profile].where} · calling for {elapsed(ms)}</p>
        {loud && <p role="status" className="mx-auto mt-3 inline-block rounded-[12px] bg-white px-4 py-2 text-[18px] font-extrabold text-danger-ink">Not answered yet. Calling louder. · Belum dijawab.</p>}
        <div className="mt-7 flex justify-center">
          <button onClick={() => stopAlarm('ack')} className="inline-flex min-h-[72px] items-center gap-2.5 rounded-[16px] border-0 bg-white px-7 py-[18px] text-[20px] font-extrabold text-danger-ink">
            <Icon name="check" />Staff acknowledged · Staf sudah lihat
          </button>
        </div>
        <div className="mt-10"><HoldToCancel onDone={() => stopAlarm('cancel')} /></div>
        <p className="mt-[22px] mb-2 text-[15px] opacity-[.92]">Sounds here and on the nurse station screen (in this demo, another tab on this device). It does not call an ambulance.</p>
      </div>
    </div>
  )
}

/** Full-screen message for the counter, with one-tap replies back to the patient. */
export function ClerkView() {
  const items = useBoard(s => s.items)
  const aiChoice = useBoard(s => s.aiChoice)
  const profile = useBoard(s => s.profile)
  const setClerk = useBoard(s => s.setClerk)
  const msg = aiChoice ?? { en: combined(items, 'en'), bm: combined(items, 'bm') }
  return (
    <section role="dialog" aria-modal="true" aria-labelledby="clerkT" className="fixed inset-x-0 top-0 bottom-(--foot) z-58 flex animate-fade flex-col overflow-auto bg-surface">
      <div className={cn(sheetHead, 'items-center')}>
        <SheetTitle id="clerkT" title="For the counter" sub="Untuk kaunter · Read the patient's message, then reply below." />
        <CloseButton label="Back to board" onClick={() => setClerk(false)} />
      </div>
      <div className="mx-auto grid w-full max-w-[1000px] content-start gap-6 px-[22px] py-6 max-sm:px-4">
        <Tip id="counter">Read the patient's message (English, then Malay). Tap a reply below: their board shows it and reads it aloud, and their request is ticked as seen.</Tip>
        {items.length ? (
          <div>
            <p className="text-[38px] leading-[1.2] font-bold tracking-[-.015em] text-pretty max-sm:text-[26px]">{msg.en}</p>
            <p className="mt-2 text-[24px] text-ink-2 max-sm:text-[19px]">{msg.bm}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {items.map(i => <span key={i.uid} data-cat={i.cat ?? kindCat(i.kind)} className="rounded-full bg-cs px-3 py-1 text-[14px] font-bold">{i.short.en}</span>)}
            </div>
          </div>
        ) : <p className="text-[20px] text-muted">Nothing in the message yet.</p>}
        <div className="rounded-[20px] border border-line bg-surface-2 p-4">
          <h3 className="mb-3 text-[17px]">Reply to the patient <small className="text-[14px] font-medium text-muted">· Balas kepada pesakit. Shown and spoken on their board.</small></h3>
          <ReplyPicker profile={profile} to={items.flatMap(i => (i.ev ? [i.ev] : []))} onSent={() => setClerk(false)} />
        </div>
      </div>
    </section>
  )
}

export function BigDrawing({ src }: { src: string }) {
  const setBigImage = useBoard(s => s.setBigImage)
  return (
    <div className="fixed inset-x-0 top-0 bottom-(--foot) z-58 grid place-items-center bg-white p-5">
      <div className="text-center">
        <img src={src} alt="Patient drawing shown to staff" className="inline max-h-[85%] max-w-full rounded-[14px] border border-line" />
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5"><button className={btnPrimary} onClick={() => setBigImage(null)}>Back to board · Kembali</button></div>
      </div>
    </div>
  )
}

const NOTES = [
  ['Context profile.', 'One switch changes cards, header, session rules and alerts between front desk and bedside. Everything else stays in the same place.'],
  ['Message bar.', 'The largest text on screen so staff can read it across a counter or from the doorway. Chips show each part of the message and how it was entered; any part can be removed.'],
  ['AI wording.', 'Appears inside the message bar only when two or more items are selected. Offers full sentences; nothing is spoken until the patient taps one. The fact guard hides suggestions that add things the patient never chose.'],
  ['Quick replies.', 'Fixed on the left in every tab and profile, so patients can answer staff without searching. "Not sure" avoids forced Yes/No answers.'],
  ['Staff asks by voice.', 'Staff speak a question; answer cards appear above the grid. Simulated here: the browser frame blocks the microphone.'],
  ['Suggested row.', 'Next likely cards from recent use and time of day. Separate from the grid so the grid never reshuffles.'],
  ['Tabs.', 'Main cards per profile, Health, and bedside-only Feelings and Ask staff. Type and Draw cover anything the cards cannot.'],
  ['Card grid.', 'Whole card is the tap target (no small "+" buttons). Pain, Symptoms and the front-desk services open guided steps instead of adding a half sentence. Colour shows the card\'s group.'],
  ['Emergency.', 'Stays visible and tappable above every pop-up, including the pain map. Also rings on the nurse station screen and gets louder if not answered within a minute; cancelling needs a 2-second hold.'],
  ['Staff menu.', 'Staff-only tools in one place: visit summary or shift handover (mark seen, reply to the patient), the nurse station, night mode, these notes and Start new visit.'],
]
const CHANGES = [
  'Message text enlarged from caption size to 34px, with the translation underneath.',
  'Small "+" buttons on cards removed; the whole card is one tap.',
  '"Moderate / Severe" pain bands removed; only the patient\'s own number is shown.',
  'Pain is confirmed before it enters the message, instead of syncing live.',
  'Patient name replaced by counter or bed number.',
  'Ward-only layout replaced by a front desk / bedside switch.',
  'Emergency kept above pop-ups instead of being dimmed behind them.',
  'Score buttons enlarged; the 3D body sits beside the location buttons.',
  'Cards and tabs colour-coded by group: needs, care, health, feelings, questions, front desk.',
  'AI sentence suggestions moved into the message bar; staff-only tools grouped under one Staff menu.',
  'Every tap answers: a tick on the card, the new chip pops into the message, and Speak shows sound bars while talking.',
  'Guided steps tick off as each one is done.',
]

export function NotesDrawer() {
  const setNotes = useBoard(s => s.setNotes)
  return (
    <aside className="fixed top-0 right-0 bottom-(--foot) z-80 flex w-[min(400px,92vw)] animate-drawer-in flex-col border-l border-line bg-surface shadow-[-10px_0_30px_rgba(14,18,40,.12)]">
      <div className={`${sheetHead} items-start`}>
        <SheetTitle title="Layout notes" sub="Yellow numbers on the screen match this list." />
        <CloseButton label="Close notes" onClick={() => setNotes(false)} />
      </div>
      <div className="grid gap-3 overflow-auto px-5 py-4">
        <ol className="m-0 grid list-none gap-3 p-0">
          {NOTES.map(([title, body], i) => (
            <li key={title} className="grid grid-cols-[28px_1fr] gap-2 text-[14px]">
              <span className="grid size-6 place-items-center rounded-full bg-[#F2B705] text-[12px] font-extrabold text-[#1b1400]">{i + 1}</span>
              <div><b>{title}</b> {body}</div>
            </li>
          ))}
        </ol>
        <h3 className="mt-2 text-[15px]">Changes from the current design</h3>
        <ul className="m-0 grid list-disc gap-1.5 pl-[18px] text-[14px]">
          {CHANGES.map(c => <li key={c}>{c}</li>)}
        </ul>
      </div>
    </aside>
  )
}

export function Toast() {
  const toast = useBoard(s => s.toast)
  const lang = useBoard(s => s.lang)
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => useBoard.setState(s => (s.toast?.id === toast.id ? { toast: null } : s)), toast.action ? 6000 : 2600)
    return () => clearTimeout(id)
  }, [toast])
  return (
    <div role="status" hidden={!toast} className="fixed bottom-[calc(var(--foot)+16px)] left-1/2 z-90 flex max-w-[80vw] -translate-x-1/2 animate-toast-in items-center gap-2.5 rounded-[14px] bg-ink py-[9px] pr-4 pl-[9px] text-[14.5px] font-semibold text-surface shadow-[var(--sh-lg)]">
      {toast && (
        <>
          <span className="grid size-7 flex-none place-items-center rounded-[8px] bg-[rgba(255,255,255,.14)] night:bg-[rgba(0,0,0,.08)]"><Icon name={toast.icon} className="size-4" /></span>
          <span>{typeof toast.msg === 'string' ? toast.msg : toast.msg[lang]}</span>
          {toast.action && (
            <button onClick={() => { toast.action?.run(); useBoard.setState({ toast: null }) }}
              className="-my-1 ml-1.5 min-h-9 flex-none rounded-[9px] border-0 bg-[rgba(255,255,255,.16)] px-3 text-[14px] font-bold text-surface underline-offset-2 hover:underline night:bg-[rgba(0,0,0,.1)]">
              {toast.action.label[lang]}
            </button>
          )}
        </>
      )}
    </div>
  )
}
