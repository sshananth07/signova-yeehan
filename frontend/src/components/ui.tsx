import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useBoard } from '../store.ts'
import { cn } from '../lib/text.ts'
import type { Cat, Lang } from '../lib/types.ts'
import { Icon } from './Icon.tsx'

/** Yellow layout-note number; only visible while "Layout notes" is on. */
export function Badge({ n }: { n: number }) {
  const notes = useBoard(s => s.notes)
  return notes ? (
    <span className="absolute -top-2.5 -left-2.5 z-5 grid size-[26px] place-items-center rounded-full bg-[#F2B705] text-[13px] font-extrabold text-[#1b1400] shadow-[0_2px_4px_rgba(0,0,0,.25)]">{n}</span>
  ) : null
}

/**
 * Brief "sent" feedback on a tap target. Re-tapping restarts the CSS animation,
 * like the mockup's remove-class/reflow/re-add trick.
 */
/** Picks the patient's language: `t('Replay', 'Ulang')`. Patient-facing text goes through this; staff screens stay English. */
export function useT() {
  const lang = useBoard(s => s.lang)
  return (en: string, bm: string) => (lang === 'en' ? en : bm)
}

/** "just now", "12 min ago", "3 h ago" in either language. */
export function ago(ms: number, lang: Lang) {
  const min = Math.floor(ms / 60_000)
  if (min < 1) return lang === 'en' ? 'just now' : 'baru sahaja'
  if (min < 60) return lang === 'en' ? `${min} min ago` : `${min} minit lalu`
  const h = Math.floor(min / 60)
  return lang === 'en' ? `${h} h ago` : `${h} jam lalu`
}

/** A first-time tip for staff, shown until dismissed on this device. */
export function Tip({ id, children }: { id: string; children: ReactNode }) {
  const [hidden, setHidden] = useState(() => { try { return !!localStorage.getItem('signova-tip-' + id) } catch { return false } })
  if (hidden) return null
  const close = () => { try { localStorage.setItem('signova-tip-' + id, '1') } catch { /* private mode: hide for this visit only */ } setHidden(true) }
  return (
    <div role="note" className="flex items-start gap-3 rounded-[14px] border border-[color-mix(in_srgb,var(--brand-ink)_25%,transparent)] bg-brand-soft px-4 py-3 text-[14.5px]">
      <Icon name="info" className="mt-0.5 size-5 flex-none text-brand-ink" />
      <div className="min-w-0 flex-1">{children}</div>
      <button onClick={close} className="min-h-10 flex-none rounded-[10px] border-0 bg-surface px-3 text-[13.5px] font-bold text-ink-2">Got it</button>
    </div>
  )
}

/** Current time, refreshed every `ms`; for countdowns and timed prompts. */
export function useNow(ms: number) {
  const [t, setT] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return t
}

/** "1:05" from milliseconds. */
export const elapsed = (ms: number) => { const sec = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` }

export function useFlash<T extends HTMLElement>(ms: number) {
  const ref = useRef<T>(null)
  const timer = useRef(0)
  const [on, setOn] = useState(false)
  useEffect(() => () => clearTimeout(timer.current), [])
  const fire = () => {
    ref.current?.getAnimations({ subtree: true }).forEach(a => { if (a instanceof CSSAnimation) a.currentTime = 0 })
    setOn(true)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOn(false), ms)
  }
  return { ref, on, fire }
}

export const btn = 'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[12px] px-5 py-3 font-bold transition-[background-color,scale] duration-200 ease-spring active:scale-[.98] disabled:scale-100 disabled:opacity-45'
export const btnPrimary = cn(btn, 'border-0 bg-brand text-on-brand hover:bg-brand-ink')
export const btnAlt = cn(btn, 'border border-line-2 bg-surface text-ink hover:bg-surface-2')

export const tbtn = 'inline-flex min-h-11 items-center gap-2 rounded-[12px] border px-3.5 py-2 text-[14.5px] font-bold shadow-[var(--sh-sm)] transition-[background-color,border-color] duration-200'
export const tbtnPlain = cn(tbtn, 'border-line bg-surface hover:border-line-2 hover:bg-surface-2')

export const note = 'text-[13px] text-muted'

export function CloseButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button className={cn('grid size-[46px] flex-none place-items-center rounded-[12px] border border-line bg-surface text-ink-2 transition-[background-color] duration-200 hover:bg-surface-2', className ?? 'ml-auto')} aria-label={label} onClick={onClick}>
      <Icon name="x" className="size-5" />
    </button>
  )
}

export const sheetHead = 'flex gap-3.5 border-b border-line px-[22px] py-[18px] max-sm:px-4 max-sm:py-3'
export function SheetTitle({ id, title, sub }: { id?: string; title: string; sub: ReactNode }) {
  return (
    <div>
      <h2 id={id} className="text-[23px]">{title}</h2>
      <p className="mt-[3px] mb-0 text-[14.5px] text-muted">{sub}</p>
    </div>
  )
}

/** Numbered guided step that ticks off when done. */
export function Step({ n, done, title, sub, children }: { n: number; done: boolean; title: string; sub: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 flex items-center gap-2.5 text-[17px]">
        <span className={cn('grid size-7 flex-none place-items-center rounded-full border-[1.5px] text-[13.5px] font-extrabold transition-[background-color,border-color] duration-250', done ? 'animate-nudge-step border-yes bg-yes text-on-solid' : 'border-line-2 bg-surface-2 text-ink-2')}>
          {done ? <Icon name="check" className="size-[15px]" /> : <b>{n}</b>}
        </span>
        {title} <small className="text-[14px] font-medium text-muted">{sub}</small>
      </h3>
      {children}
    </div>
  )
}

/**
 * Selectable option button used by the guided steps (parts, sides, scores, types, symptoms).
 * Hover/active styles are left out while pressed so the pressed look always wins.
 */
export const optBase = 'border-[1.5px] font-bold transition-[background-color,border-color,box-shadow,scale] duration-[180ms] ease-spring'
export const optIdle = 'border-line-2 bg-surface text-ink hover:border-c'
export const optOn = 'border-c bg-cs text-c shadow-[0_0_0_3px_var(--cs)]'

/** 3D viewer frame, shared by the lazy Body3D and its loading fallback. */
export const bodyBox = 'relative h-[440px] overflow-hidden rounded-[18px] border border-line bg-[radial-gradient(circle_at_50%_30%,#FFFFFF,#E7EAF5)] night:bg-[radial-gradient(circle_at_50%_30%,#232A44,#111527)]'
export const bodyTip = 'absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-[5px] text-[12.5px] font-bold text-ink-2 shadow-[var(--sh-sm)]'

/** Dimmed backdrop + sheet; stops above the footer so Emergency stays tappable. */
export function Sheet({ labelledBy, wide, cat = 'health', children }: { labelledBy: string; wide?: boolean; cat?: Cat; children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 top-0 bottom-(--foot) z-50 grid animate-fade place-items-center bg-[rgba(14,18,40,.42)] p-4 backdrop-blur-[3px]">
      <div data-cat={cat} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        className={cn('flex max-h-full animate-sheet-in flex-col overflow-hidden rounded-[24px] bg-surface shadow-[0_24px_60px_rgba(14,18,40,.28)]', wide ? 'w-[min(1160px,100%)]' : 'w-[min(900px,100%)]')}>
        {children}
      </div>
    </div>
  )
}
export const sheetIcon = 'grid size-[46px] flex-none place-items-center max-sm:hidden'
export const sheetFoot = 'flex flex-wrap items-center gap-2.5 border-t border-line bg-surface-2 px-[22px] py-3.5'
export const preview = 'min-w-[200px] flex-1 text-[16px] font-semibold max-sm:basis-full'
export const previewSub = 'block font-medium text-muted [font-size:smaller]'
export function Todo({ err, children }: { err?: boolean; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-[14.5px] font-bold', err ? 'text-no' : 'text-ink-2')}>
      <Icon name={err ? 'alert' : 'arrow'} className={cn('size-[18px]', !err && 'text-brand-ink')} />{children}
    </span>
  )
}
