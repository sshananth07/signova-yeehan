import { Fragment, useState } from 'react'
import { useBoard } from '../store.ts'
import { candidates, cn, isOpenable, summary, summaryText } from '../lib/text.ts'
import type { LogEvent } from '../lib/types.ts'
import { PROFILES, kindCat } from '../lib/vocab.ts'
import { Icon } from './Icon.tsx'
import { ReplyPicker } from './Reply.tsx'
import { CloseButton, SheetTitle, Tip, note, sheetHead, sheetIcon, tbtnPlain } from './ui.tsx'

const panel = 'rounded-[20px] border border-line bg-surface px-[18px] py-4 shadow-[var(--sh-sm)]'
const panelTitle = 'mb-3 flex items-center gap-2 text-[16.5px]'
const panelIcon = 'size-[19px] text-brand-ink'
const td = 'border-b border-line px-2 py-2.5 align-top'
const tdT = 'tabular-nums whitespace-nowrap text-muted'
const th = 'border-b border-line p-2 text-left text-[12.5px] font-bold text-muted'

function Trend({ ev }: { ev: LogEvent[] }) {
  const pts = ev.filter(e => e.kind === 'pain' && e.score !== undefined) as (LogEvent & { score: number })[]
  if (pts.length < 2) return <p className={cn(note, 'my-[1em]')}>Two or more pain reports needed for a trend.</p>
  const W = 460, H = 170, l = 34, r = 16, t = 14, b = 30
  const x = (i: number) => l + (i * (W - l - r)) / (pts.length - 1)
  const y = (v: number) => t + ((10 - v) * (H - t - b)) / 10
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.score)}`).join('')
  const area = line + `L${x(pts.length - 1)},${y(0)}L${x(0)},${y(0)}Z`
  const last = pts.length - 1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Patient-reported pain scores over the stay" className="inline h-auto w-full align-baseline">
      {[0, 5, 10].map(v => (
        <g key={v}>
          <line className="stroke-line" x1={l} x2={W - r} y1={y(v)} y2={y(v)} />
          <text className="fill-muted" x={l - 8} y={y(v) + 4} textAnchor="end" fontSize="11">{v}</text>
        </g>
      ))}
      <path className="fill-c-health [fill-opacity:.12]" d={area} />
      <path className="stroke-c-health" d={line} fill="none" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={p.n}>
          <circle className={cn('stroke-c-health', i === last ? 'fill-c-health' : 'fill-surface')} cx={x(i)} cy={y(p.score)} r={i === last ? 5 : 3.5} strokeWidth="2" />
          <text className="fill-muted" x={x(i)} y={H - 10} textAnchor="middle" fontSize="11">{p.t}</text>
        </g>
      ))}
      <text className="fill-ink" x={x(last) - 8} y={y(pts[last].score) - 10} textAnchor="end" fontSize="12" fontWeight="700">{pts[last].score}/10 now</text>
    </svg>
  )
}

export function StaffView() {
  const profile = useBoard(s => s.profile)
  const lang = useBoard(s => s.lang)
  const ev = useBoard(s => s.events[s.profile])
  const items = useBoard(s => s.items)
  const { setStaffOpen, toggleSeen, markDone, showToast, setBigImage } = useBoard.getState()
  const [replyFor, setReplyFor] = useState<number | null>(null)
  const P = PROFILES[profile]
  const lines = summary(ev)
  const blocked = candidates(items, 'en')?.blocked

  const copy = () => {
    try {
      navigator.clipboard.writeText(summaryText(lines)).then(() => showToast('Summary copied.', 'copy'), () => showToast('Copy was blocked by the browser.'))
    } catch {
      showToast('Copy was blocked by the browser.')
    }
  }

  return (
    <section className="fixed inset-x-0 top-0 bottom-(--foot) z-55 flex animate-fade flex-col bg-bg">
      <div className={cn(sheetHead, 'items-center bg-surface')}>
        <span className={cn(sheetIcon, 'text-brand-ink')}><Icon name="clip" className="size-8" /></span>
        <SheetTitle title={P.staffTitle} sub={P.staffPrefix + 'Signed in as staff SN-104 (simulated) · no patient name stored'} />
        <button className={cn(tbtnPlain, 'ml-auto')} onClick={copy}><Icon name="copy" className="size-[18px]" />Copy summary</button>
        <CloseButton label="Close staff view" className="ml-0" onClick={() => setStaffOpen(false)} />
      </div>

      {/* Panels fill the sheet on wide screens, so a short log does not float above empty page. */}
      <div className="grid min-h-0 flex-1 grid-cols-[1.35fr_1fr] grid-rows-[auto_1fr] gap-4 overflow-auto px-[22px] py-[18px] max-md:grid-cols-1 max-md:grid-rows-none max-md:content-start">
        <div className="col-span-full"><Tip id="handover">Each row is something the patient said. <b>Mark seen</b> puts a tick on the patient's screen; <b>Done</b> means it is dealt with; <b>Reply</b> sends a short answer that is shown and spoken on their board.</Tip></div>
        <div className={panel}>
          <h3 className={panelTitle}><Icon name="chat" className={panelIcon} />Messages and requests</h3>
          <table className="w-full border-collapse text-[14.5px]">
            <thead><tr><th className={th}>#</th><th className={th}>Time</th><th className={th}>What the patient said</th><th className={th}>How</th><th className={th}>Status</th></tr></thead>
            <tbody className="[&_tr:hover_td]:bg-surface-2 [&_tr:last-child_td]:border-b-0">
              {ev.length ? ev.toReversed().map(e => (
                <Fragment key={e.n}>
                <tr>
                  <td className={cn(td, tdT)}>#{e.n}</td>
                  <td className={cn(td, tdT)}>{e.t}</td>
                  <td className={td}>
                    <span data-cat={kindCat(e.kind)} className="mr-1 inline-block rounded-[6px] bg-cs px-2 py-0.5 text-[12px] font-bold text-c capitalize">{e.kind}</span> {e[lang]}
                    {(e.asks ?? 1) > 1 && <span className="ml-1.5 rounded-[6px] bg-no-soft px-1.5 py-0.5 text-[12px] font-bold text-no">Asked {e.asks}×</span>}
                    {e.detail && <small className="mt-0.5 block text-[12.5px] text-muted">{e.detail}</small>}
                    {e.img && <button onClick={() => setBigImage(e.img!)} className="mt-2 block rounded-[10px] border border-line"><img src={e.img} alt="Patient drawing" className="h-20 rounded-[10px]" /></button>}
                  </td>
                  <td className={cn(td, tdT)}>{e.src}</td>
                  <td className={td}>
                    {e.doneAt ? (
                      <span className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] bg-yes-soft px-3 text-[13px] font-bold whitespace-nowrap text-yes"><Icon name="check" className="size-[15px]" />Done {e.doneAt}</span>
                    ) : isOpenable(e) && (
                      <div className="flex gap-1.5">
                        <button onClick={() => toggleSeen(e.n)} className={cn('inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-[13px] font-bold whitespace-nowrap transition-[background-color] duration-200', e.seen ? 'border-transparent bg-yes-soft text-yes' : 'border-line-2 bg-surface')}>
                          {e.seen ? <><Icon name="check" className="size-[15px]" />Seen{e.seenAt && ' ' + e.seenAt}</> : 'Mark seen'}
                        </button>
                        <button onClick={() => setReplyFor(replyFor === e.n ? null : e.n)} aria-expanded={replyFor === e.n} className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-bold">
                          <Icon name="chat" className="size-[15px]" />Reply
                        </button>
                        <button onClick={() => markDone(e.n)} className="inline-flex min-h-10 items-center rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-bold">Done</button>
                      </div>
                    )}
                  </td>
                </tr>
                {replyFor === e.n && (
                  <tr><td colSpan={5} className={cn(td, 'bg-surface-2')}><ReplyPicker profile={profile} to={e.n} onSent={() => setReplyFor(null)} /></td></tr>
                )}
                </Fragment>
              )) : (
                <tr><td colSpan={5} className={cn(td, note)}>No messages yet in this visit. Messages appear here as the patient uses the board.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 md:[&>:last-child]:flex-1">
          <div className={panel}>
            <h3 className={panelTitle}><Icon name="clip" className={panelIcon} /><span>{P.sumTitle}</span></h3>
            <ul className="m-0 grid list-disc gap-2 pl-[18px] text-[15px] marker:text-brand-ink">
              {lines.length ? lines.map(li => (
                <li key={li.text}>
                  {li.lead && <b>{li.lead}</b>}{li.text}
                  {li.refs.map(n => <span key={n} className="ml-1 inline-block rounded-[5px] bg-brand-soft px-1.5 py-px text-[11.5px] font-bold text-brand-ink tabular-nums">#{n}</span>)}
                </li>
              )) : <li className={note}>Nothing to summarise yet.</li>}
            </ul>
            <p className={cn(note, 'my-[1em]')}>Simulated AI output. Every line must cite at least one logged event (#); lines without a source are dropped. No triage labels.</p>
            {blocked && <p className={cn(note, 'my-[1em]')}>Sentence suggestion hidden from the patient: <s>{blocked.text}</s>, because it {blocked.why}.</p>}
          </div>
          {profile === 'bs' && (
            <div className={panel}>
              <h3 className={panelTitle}><Icon name="pulse" className={panelIcon} />Pain reports this stay</h3>
              <Trend ev={ev} />
              <p className={cn(note, 'my-[1em]')}>Patient-reported scores only. Display aid, not a clinical score.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
