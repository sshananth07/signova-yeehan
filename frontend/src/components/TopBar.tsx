import { useRef, type ReactNode } from 'react'
import { useBoard } from '../store.ts'
import { cn } from '../lib/text.ts'
import { PROFILES } from '../lib/vocab.ts'
import type { IconName } from '../lib/types.ts'
import { Icon } from './Icon.tsx'
import { Badge } from './ui.tsx'

const segGroup = 'inline-flex gap-0.5 rounded-[12px] border border-line bg-surface-2 p-[3px]'
/** One half of the joined Staff control: voice question on the left, tools menu on the right. */
const staffPart = 'inline-flex min-h-11 items-center gap-2 px-3.5 py-2 text-[14.5px] font-bold transition-[background-color] duration-200'

function SegButton({ pressed, icon, onClick, children }: { pressed: boolean; icon?: IconName; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-10 items-center gap-[7px] rounded-[9px] border-0 px-3.5 py-[7px] text-[14.5px] font-bold transition-[background-color,color,box-shadow] duration-200 ease-spring',
        pressed ? 'bg-surface text-ink shadow-[var(--sh)] night:bg-line-2' : 'bg-transparent text-muted hover:text-ink',
      )}
    >
      {icon && <Icon name={icon} className={cn('size-[18px]', pressed && 'text-brand-ink')} />}
      {children}
    </button>
  )
}

/** `pressed` makes it an On/Off toggle; `radio` makes it one choice of a set, ticked when chosen. */
function MenuItem({ icon, title, sub, pressed, radio, onClick }: { icon: IconName; title: string; sub: string; pressed?: boolean; radio?: boolean; onClick: () => void }) {
  const toggle = pressed !== undefined
  return (
    <button
      className="flex min-h-[58px] items-center gap-3 rounded-[11px] border-0 bg-transparent px-3 py-2.5 text-left hover:bg-surface-2"
      role={!toggle ? 'menuitem' : radio ? 'menuitemradio' : 'menuitemcheckbox'}
      aria-checked={toggle ? pressed : undefined}
      onClick={onClick}
    >
      <Icon name={icon} className="size-[22px] text-brand-ink" />
      <span><b className="block text-[15px]">{title}</b><small className="text-[13px] text-muted">{sub}</small></span>
      {toggle && (radio
        ? pressed && <Icon name="check" className="ml-auto size-5 text-yes" />
        : <span className={cn('ml-auto rounded-full px-[9px] py-[3px] text-[12px] font-bold', pressed ? 'bg-yes-soft text-yes' : 'bg-surface-2 text-muted')}>{pressed ? 'On' : 'Off'}</span>)}
    </button>
  )
}

/** Speech-bubble mark; also the favicon (public/favicon.svg). */
export function Logo() {
  return (
    <div className="grid size-[38px] flex-none place-items-center rounded-[11px] bg-brand text-on-brand">
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true"><path d="M3.5 6.5A3 3 0 0 1 6.5 3.5h11a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H12l-4.6 3.6a.6.6 0 0 1-1-.5v-3.1A3 3 0 0 1 3.5 13.5z" fill="currentColor" /><path d="M9 9.2v1.6M12 7.6v4.8M15 9.2v1.6" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" /></svg>
    </div>
  )
}

function StaffMic() {
  const listening = useBoard(s => s.listening)
  const staffAsk = useBoard(s => s.staffAsk)
  return (
    <button className={cn(staffPart, 'rounded-l-[11px] border-r border-line bg-brand-soft text-brand-ink hover:bg-[color-mix(in_srgb,var(--brand-ink)_12%,var(--brand-soft))] disabled:opacity-100')} disabled={listening} onClick={staffAsk}>
      <Icon name="mic" className="size-[18px]" />
      {listening ? (
        <span>Listening <span className="inline-flex h-3.5 items-end gap-[3px]">
          <i className="h-1.5 w-[3px] animate-lbar rounded-[2px] bg-current" />
          <i className="h-1.5 w-[3px] animate-lbar rounded-[2px] bg-current [animation-delay:.15s]" />
          <i className="h-1.5 w-[3px] animate-lbar rounded-[2px] bg-current [animation-delay:.3s]" />
        </span></span>
      ) : <span>Ask by voice</span>}
    </button>
  )
}

function StaffMenu() {
  const menu = useRef<HTMLDivElement>(null)
  const profile = useBoard(s => s.profile)
  const night = useBoard(s => s.night)
  const notes = useBoard(s => s.notes)
  const { setStaffOpen, toggleNight, setNotes, switchProfile, staffAsk, newVisit, setGuide } = useBoard.getState()
  const openStation = () => window.open(location.pathname + location.search + '#station', 'signova-station')
  const pick = (fn: () => void) => () => { menu.current?.hidePopover(); fn() }
  return (
    <div ref={menu} id="staffMenu" popover="auto" role="menu" aria-label="Staff tools"
      className="fixed inset-auto top-[70px] right-4 m-0 w-[310px] max-w-[calc(100vw-24px)] max-sm:right-3 rounded-[16px] border border-line bg-surface p-1.5 text-ink shadow-[var(--sh-lg)] open:grid open:animate-menu-in open:gap-0.5">
      <div className="grid gap-0.5 border-b border-line pb-1 md:hidden">
        <MenuItem icon="mic" title="Ask by voice" sub="Speak a question; the patient answers on the board" onClick={pick(staffAsk)} />
        <MenuItem icon="desk" title="Front desk" sub={PROFILES.fd.ctx.join(' · ')} pressed={profile === 'fd'} radio onClick={pick(() => switchProfile('fd'))} />
        <MenuItem icon="bed" title="Bedside" sub={PROFILES.bs.ctx.join(' · ')} pressed={profile === 'bs'} radio onClick={pick(() => switchProfile('bs'))} />
      </div>
      <MenuItem icon="clip" title={PROFILES[profile].staffBtn} sub="Messages, replies, AI summary, pain reports" onClick={pick(() => setStaffOpen(true))} />
      <MenuItem icon="monitor" title="Nurse station" sub="Opens in a new tab. Alerts and replies sync live." onClick={pick(openStation)} />
      {profile === 'bs' && <MenuItem icon="moon" title="Night mode" sub="Dim the board for the ward" pressed={night} onClick={pick(toggleNight)} />}
      <MenuItem icon="q" title="Staff guide" sub="How to use Signova with a patient" onClick={pick(() => setGuide(true))} />
      <MenuItem icon="info" title="Layout notes" sub="Numbered notes on each zone" pressed={notes} onClick={pick(() => setNotes(!notes))} />
      <div className="mt-0.5 border-t border-line pt-1">
        <MenuItem icon="trash" title="Start new visit" sub={`Clears the message and log for ${PROFILES[profile].where}`} onClick={pick(newVisit)} />
      </div>
    </div>
  )
}

export function TopBar() {
  const profile = useBoard(s => s.profile)
  const lang = useBoard(s => s.lang)
  const { switchProfile, setLang } = useBoard.getState()
  const [ctxStrong, ctxRest] = PROFILES[profile].ctx
  return (
    <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-2.5 max-sm:gap-2 max-sm:px-3">
      <div className="mr-1.5 flex items-center gap-2.5">
        <Logo />
        <div><b className="block text-[18px] leading-[1.1] font-extrabold tracking-[-.02em]">Signova</b><small className="text-[12.5px] text-muted max-lg:hidden">Communication board</small></div>
      </div>
      <div className="relative max-md:hidden"><Badge n={1} />
        <div className={segGroup} role="group" aria-label="Context profile">
          <SegButton pressed={profile === 'fd'} icon="desk" onClick={() => switchProfile('fd')}>Front desk</SegButton>
          <SegButton pressed={profile === 'bs'} icon="bed" onClick={() => switchProfile('bs')}>Bedside</SegButton>
        </div>
      </div>
      <div className="inline-flex items-center gap-[7px] rounded-[10px] bg-surface-2 px-3 py-[9px] text-[14px] text-muted max-lg:hidden">
        <Icon name="pin" className="size-4 text-brand-ink" /><b className="text-ink">{ctxStrong}</b> · {ctxRest}
      </div>
      <div className="flex-1" />
      <div className={segGroup} role="group" aria-label="Language">
        <SegButton pressed={lang === 'en'} onClick={() => setLang('en')}>EN</SegButton>
        <SegButton pressed={lang === 'bm'} onClick={() => setLang('bm')}>BM</SegButton>
      </div>
      <div className="flex rounded-[12px] border border-line bg-surface shadow-[var(--sh-sm)]" role="group" aria-label="Staff">
        <div className="relative max-md:hidden"><Badge n={5} /><StaffMic /></div>
        <div className="relative"><Badge n={10} />
          <button className={cn(staffPart, 'rounded-[11px] hover:bg-surface-2 md:rounded-l-none')} popoverTarget="staffMenu" aria-haspopup="menu" aria-label="Staff menu">
            <Icon name="clip" className="size-[18px]" /><span className="max-md:hidden">Staff</span><Icon name="chev" className="size-[18px] text-muted" />
          </button>
        </div>
      </div>
      <StaffMenu />
    </header>
  )
}
