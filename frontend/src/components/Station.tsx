import { useEffect, useState } from 'react'
import { useBoard } from '../store.ts'
import { soundOn, startBeep, unlockSound } from '../lib/speech.ts'
import { cn, isOpenable } from '../lib/text.ts'
import type { LogEvent, Profile } from '../lib/types.ts'
import { PROFILES, kindCat } from '../lib/vocab.ts'
import { Icon } from './Icon.tsx'
import { ReplyPicker } from './Reply.tsx'
import { Logo } from './TopBar.tsx'
import { Tip, elapsed, tbtnPlain, useNow } from './ui.tsx'

/*
 * Nurse station (open with #station). Reads the same saved state as the boards, so in this demo a
 * second tab on the same device stands in for the station; a real ward would sync through a server.
 */
const smallBtn = 'inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-line-2 bg-surface px-3 text-[14px] font-bold whitespace-nowrap transition-[border-color] duration-150 hover:border-brand-ink'
const clock = (ms: number) => new Date(ms).toTimeString().slice(0, 5)

/** Browsers mute a tab until it is clicked; an unattended station must say so instead of staying silent. */
function SoundBanner() {
  const [on, setOn] = useState(soundOn)
  useEffect(() => {
    if (on) return
    const unlock = () => void unlockSound().then(setOn)
    document.addEventListener('pointerdown', unlock)
    document.addEventListener('keydown', unlock)
    return () => { document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock) }
  }, [on])
  return on ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-yes-soft px-3 py-1 text-[13px] font-bold text-yes"><Icon name="vol" className="size-4" />Alarm sound on</span>
  ) : (
    <button onClick={() => void unlockSound().then(setOn)} className="inline-flex min-h-11 items-center gap-2 rounded-[12px] border-0 bg-[#F2B705] px-4 text-[14.5px] font-extrabold text-[#1b1400]">
      <Icon name="vol" className="size-5" />Alarm sound is off. Click to turn it on
    </button>
  )
}

function AlarmBanner() {
  const alarm = useBoard(s => s.alarm)
  const t = useNow(1000)
  const ms = alarm ? t - alarm.at : 0
  const loud = ms >= 60_000
  useEffect(() => (alarm ? startBeep(loud) : undefined), [alarm, loud])
  if (!alarm) return null
  const ack = () => {
    const { stopAlarm, sendReply } = useBoard.getState()
    stopAlarm('ack')
    sendReply(alarm.profile, { en: 'A nurse is coming now.', bm: 'Jururawat sedang datang.' }, 'users', undefined, 5)
  }
  return (
    <section role="alert" className={cn('mx-5 mt-4 flex flex-wrap items-center gap-4 rounded-[20px] bg-danger px-5 py-4 text-white shadow-[0_6px_16px_rgba(217,45,32,.32)] max-sm:mx-3', loud && 'animate-flash')}>
      <span className="grid size-14 flex-none animate-ring place-items-center rounded-full bg-white/20"><Icon name="alert" className="size-8" /></span>
      <div className="min-w-0 flex-1">
        <b className="block text-[26px] leading-[1.15]">Emergency · {PROFILES[alarm.profile].where}</b>
        <span className="text-[16px]">Pressed at {clock(alarm.at)} · waiting {elapsed(ms)}{loud && ' · not answered for over a minute'}</span>
      </div>
      <button onClick={ack} className="inline-flex min-h-[60px] items-center gap-2 rounded-[14px] border-0 bg-white px-6 text-[18px] font-extrabold text-danger-ink">
        <Icon name="check" />I'm going · tell the patient
      </button>
    </section>
  )
}

/** New → Seen → (Due → Overdue) → Done. */
function status(e: LogEvent, t: number) {
  if (e.due && t > e.due) return { label: `Overdue since ${clock(e.due)}`, tone: 'bg-no-soft text-no', rank: 0 }
  if (!e.seen) return { label: 'New', tone: 'bg-brand-soft text-brand-ink', rank: 1 }
  if (e.due) return { label: `Due ${clock(e.due)}`, tone: 'bg-cs text-c', rank: 2, cat: 'feel' }
  return { label: `Seen ${e.seenAt ?? ''}`, tone: 'bg-yes-soft text-yes', rank: 3 }
}

function Location({ p }: { p: Profile }) {
  const ev = useBoard(s => s.events[p])
  const reply = useBoard(s => s.reply)
  const { toggleSeen, markDone, setBigImage } = useBoard.getState()
  const t = useNow(15_000)
  const [replyFor, setReplyFor] = useState<number | null>(null)
  const open = ev.filter(e => isOpenable(e) && !e.doneAt).map(e => ({ e, st: status(e, t) })).sort((a, b) => a.st.rank - b.st.rank || b.e.n - a.e.n)
  const late = open.filter(o => o.st.rank === 0).length
  const pain = ev.findLast(e => e.kind === 'pain' && e.score !== undefined)
  const last = reply?.profile === p ? reply : null
  return (
    <section className="rounded-[20px] border border-line bg-surface p-4 shadow-[var(--sh-sm)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-line pb-3">
        <Icon name={p === 'bs' ? 'bed' : 'desk'} className="size-7 text-brand-ink" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px]">{PROFILES[p].where}</h2>
          <p className="m-0 text-[13.5px] text-muted">
            {pain ? `Pain ${pain.score}/10 at ${pain.t}` : 'No pain reports'}{last && ` · Last reply ${last.t}: ${last.text.en}`}
          </p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-[14px] font-bold', late ? 'bg-no text-white' : open.length ? 'bg-no-soft text-no' : 'bg-yes-soft text-yes')}>
          {late ? `${late} overdue` : open.length ? `${open.length} open` : 'All done'}
        </span>
      </header>
      <ul className="m-0 list-none p-0">
        {open.length ? open.map(({ e, st }) => (
          <li key={e.n} className="border-b border-line py-3 last:border-b-0">
            <div className="flex flex-wrap items-start gap-3">
              <span className="w-12 pt-0.5 text-muted tabular-nums">{e.t}</span>
              <div className="min-w-[200px] flex-1 text-[15.5px]">
                <span data-cat={kindCat(e.kind)} className="mr-1.5 inline-block rounded-[6px] bg-cs px-2 py-0.5 text-[12px] font-bold text-c capitalize">{e.kind}</span>{e.en}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span data-cat={st.cat} className={cn('rounded-[6px] px-2 py-0.5 text-[12px] font-bold', st.tone)}>{st.label}</span>
                  {(e.asks ?? 1) > 1 && <span className="rounded-[6px] bg-no-soft px-2 py-0.5 text-[12px] font-bold text-no">Asked {e.asks}×</span>}
                </div>
                {e.img && <button onClick={() => setBigImage(e.img!)} className="mt-2 block rounded-[10px] border border-line"><img src={e.img} alt="Patient drawing" className="h-20 rounded-[10px]" /></button>}
              </div>
              <div className="flex flex-wrap gap-2">
                {!e.seen && <button onClick={() => toggleSeen(e.n, p)} className={smallBtn}>Mark seen</button>}
                <button onClick={() => setReplyFor(replyFor === e.n ? null : e.n)} aria-expanded={replyFor === e.n} className={smallBtn}><Icon name="chat" className="size-4" />Reply</button>
                <button onClick={() => markDone(e.n, p)} className={smallBtn}><Icon name="check" className="size-4" />Done</button>
              </div>
            </div>
            {replyFor === e.n && <div className="mt-3 rounded-[14px] bg-surface-2 p-3"><ReplyPicker profile={p} to={e.n} onSent={() => setReplyFor(null)} /></div>}
          </li>
        )) : (
          <li className="py-8 text-center text-[15px] text-muted">Nothing open.{ev.length > 0 && ` Last activity ${ev.at(-1)!.t}.`}</li>
        )}
      </ul>
    </section>
  )
}

export function Station() {
  const setGuide = useBoard(s => s.setGuide)
  useEffect(() => { document.title = 'Nurse station · Signova' }, [])
  return (
    <div className="min-h-full bg-bg pb-6">
      <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-2.5 max-sm:px-3">
        <Logo />
        <div className="min-w-0 flex-1">
          <b className="block text-[18px] leading-[1.1] font-extrabold tracking-[-.02em]">Nurse station</b>
          <small className="text-[12.5px] text-muted">Hospital Kuala Lumpur · live from the boards on this device (demo)</small>
        </div>
        <SoundBanner />
        <button className={tbtnPlain} onClick={() => setGuide(true)}><Icon name="info" className="size-[18px]" />Guide</button>
      </header>
      <AlarmBanner />
      <div className="px-5 pt-4 max-sm:px-3">
        <Tip id="station">Requests from each bed and counter appear here as they happen. <b>Reply</b> sends a short answer to the patient's screen; a reply with a time ("in 10 minutes") turns the row <b>overdue</b> if it is not marked <b>Done</b> by then. Keep this tab open with the sound on.</Tip>
      </div>
      <main className="grid grid-cols-2 items-start gap-4 p-5 max-md:grid-cols-1 max-sm:p-3">
        <Location p="bs" />
        <Location p="fd" />
      </main>
    </div>
  )
}
