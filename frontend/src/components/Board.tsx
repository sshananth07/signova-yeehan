import { useState } from 'react'
import { useBoard } from '../store.ts'
import { alt, cn, suggestions } from '../lib/text.ts'
import { CAT_LABEL, PROFILES, QUICK, TAB_CAT, card, catOf, tabCards, type CardKey, type Quick } from '../lib/vocab.ts'
import { AiStrip } from './Composer.tsx'
import { Icon } from './Icon.tsx'
import { PainCheck, useCheckDue } from './PainScale.tsx'
import { DrawPanel, TypePanel } from './Panels.tsx'
import { Badge, useFlash, useT } from './ui.tsx'

/* ---------- Quick replies (fixed left rail) ---------- */
const qrTone = {
  yes: { btn: 'min-h-16 border-transparent bg-yes-deep text-[22px] text-white hover:border-white/40 max-md:min-h-14 max-md:text-[19px]', qi: 'bg-white/15 text-white' },
  no: { btn: 'min-h-16 border-transparent bg-no-deep text-[22px] text-white hover:border-white/40 max-md:min-h-14 max-md:text-[19px]', qi: 'bg-white/15 text-white' },
}

function QuickReply({ q }: { q: Quick }) {
  const lang = useBoard(s => s.lang)
  const addItem = useBoard(s => s.addItem)
  const flash = useFlash<HTMLButtonElement>(400)
  const tone = q.tone && qrTone[q.tone]
  return (
    <button
      ref={flash.ref}
      onClick={() => { flash.fire(); addItem({ kind: 'reply', say: q.say, short: q.label }, 'Quick reply') }}
      className={cn(
        'flex items-center gap-3 rounded-[14px] border py-2 pr-3 pl-2.5 text-left leading-[1.2] font-bold shadow-[var(--sh-sm)] transition-[scale,border-color] duration-200 ease-spring active:scale-[.97] max-md:flex-none max-md:pr-4',
        tone ? tone.btn : 'min-h-[50px] border-line bg-surface text-[17px] hover:border-line-2',
        flash.on && 'animate-nudge',
      )}
    >
      <span className={cn('grid size-[34px] flex-none place-items-center rounded-[11px]', tone ? tone.qi : 'text-ink-2')}><Icon name={q.icon} className="size-[22px]" /></span>
      <span>{q.label[lang]}<small className={cn('block text-[12.5px] font-medium', tone ? 'text-white/80' : 'text-muted')}>{q.label[alt(lang)]}</small></span>
    </button>
  )
}

function Rail() {
  const t = useT()
  return (
    <aside className="relative flex min-h-0 flex-col gap-1.5 overflow-auto p-0.5 max-md:-mx-5 max-md:flex-row max-md:px-5 max-md:pb-1 max-md:[scrollbar-width:none] max-sm:-mx-3 max-sm:px-3">
      <Badge n={4} />
      <h3 className="p-0.5 text-[14px] font-bold text-muted max-md:sr-only">{t('Quick replies', 'Balas pantas')}</h3>
      {QUICK.map(q => <QuickReply key={q.k} q={q} />)}
    </aside>
  )
}

/* ---------- Staff asked by voice (simulated) ---------- */
function StaffAsk() {
  const q = useBoard(s => s.activeQ)
  const lang = useBoard(s => s.lang)
  const t = useT()
  const { answer, dismissQ } = useBoard.getState()
  if (!q) return null
  return (
    <section className="grid animate-fade-up gap-3 rounded-[20px] bg-brand-soft px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-brand-ink"><Icon name="mic" className="size-[15px]" />{t('Staff asked you', 'Staf bertanya')}</div>
      <div className="flex flex-wrap items-center gap-3">
        <b className="text-[24px]">{q.q[lang]}</b><span className="text-ink-2">{q.q[alt(lang)]}</span>
        <button onClick={dismissQ} className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border-0 bg-surface px-3 py-2 text-[14px] font-bold text-ink-2"><Icon name="x" className="size-4" />{t('Dismiss', 'Tutup')}</button>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {q.a.map((a, i) => (
          <button key={a.en} onClick={() => answer(i)} className="min-h-[62px] min-w-[130px] rounded-[14px] border-[1.5px] border-transparent bg-surface px-[18px] py-2.5 text-left text-[17px] font-bold shadow-[var(--sh)] transition-[border-color,scale] duration-150 ease-spring hover:border-brand-ink active:scale-[.97]">
            {a[lang]}<small className="block text-[13px] font-medium text-muted">{a[alt(lang)]}</small>
          </button>
        ))}
      </div>
    </section>
  )
}

/**
 * One slot above the tabs for things that need an answer, most urgent first (staff question, then
 * the pain check-back), so the cards never get pushed off screen. Staff replies live in the message panel.
 */
function Slot() {
  const q = useBoard(s => s.activeQ)
  const due = useCheckDue()
  const t = useT()
  const [second, setSecond] = useState(false)
  const list = [q ? 'ask' : null, due ? 'check' : null].filter(Boolean)
  if (!list.length) return null
  const cur = list[second && list.length > 1 ? 1 : 0]
  return (
    <div className="relative">
      {cur === 'ask' ? <StaffAsk /> : <PainCheck />}
      {list.length > 1 && (
        <button onClick={() => setSecond(!second)} className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 min-h-8 items-center gap-1 rounded-full border border-line-2 bg-surface px-3 text-[12.5px] font-bold text-ink-2 shadow-[var(--sh-sm)]">
          {second ? t('Back', 'Kembali') : t('+1 more', '+1 lagi')}
        </button>
      )}
    </div>
  )
}

/* ---------- Tabs ---------- */
function Tabs() {
  const profile = useBoard(s => s.profile)
  const tab = useBoard(s => s.tab)
  const lang = useBoard(s => s.lang)
  const setTab = useBoard(s => s.setTab)
  return (
    <nav role="tablist" className="relative inline-flex max-w-full flex-wrap gap-1 self-start rounded-[14px] border border-line bg-surface-2 p-1 max-md:flex-nowrap max-md:overflow-x-auto max-md:[scrollbar-width:none]">
      <Badge n={7} />
      {PROFILES[profile].tabs.map(t => {
        const on = tab === t.k
        return (
          <button key={t.k} role="tab" aria-selected={on} data-cat={TAB_CAT[t.k] ?? 'base'} onClick={() => setTab(t.k)}
            className={cn('flex min-h-[46px] flex-none items-center gap-2 rounded-[10px] border-0 py-1.5 pr-3.5 pl-3 text-[15px] font-bold transition-[background-color,color,box-shadow] duration-200 ease-spring', on ? 'bg-surface text-ink shadow-[var(--sh)] night:bg-line-2' : 'bg-transparent text-muted hover:text-ink')}>
            <Icon name={t.icon} className="size-5 text-c" />
            {t.label[lang]} <small className="text-[13px] font-medium max-sm:hidden">{t.label[alt(lang)]}</small>
          </button>
        )
      })}
    </nav>
  )
}

/* ---------- Suggested row ---------- */
function Suggest() {
  const profile = useBoard(s => s.profile)
  const tab = useBoard(s => s.tab)
  const items = useBoard(s => s.items)
  const lang = useBoard(s => s.lang)
  const addCard = useBoard(s => s.addCard)
  // Only the card tabs get time-of-day requests; Feelings, Ask staff, Type and Draw keep follow-ups to the last choice.
  const { out, why } = suggestions(profile, items, new Date().getHours(), tabCards(profile, tab), tab === 'main' || tab === 'health')
  if (!out.length) return null
  return (
    <section className="relative flex flex-wrap items-center gap-2 max-md:-mx-5 max-md:flex-nowrap max-md:overflow-x-auto max-md:px-5 max-md:pb-1 max-md:[scrollbar-width:none] max-sm:-mx-3 max-sm:px-3">
      <Badge n={6} />
      <div className="mr-1.5 flex min-w-[110px] flex-none flex-col text-[12.5px] text-muted">
        <b className="text-[13.5px] text-brand-ink">{lang === 'en' ? 'Suggested' : 'Cadangan'}</b>{why[lang]}
      </div>
      {out.map(k => (
        <button key={k} data-cat={catOf(k)} onClick={() => addCard(k, 'Suggested row')}
          className="inline-flex min-h-12 flex-none items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--c)_22%,var(--line))] bg-cs py-[5px] pr-4 pl-3 text-[15px] font-bold transition-[border-color,scale] duration-150 ease-spring hover:border-c active:scale-[.97]">
          <Icon name={card(k).icon} className="size-[22px] text-c" />{card(k).label[lang]}
        </button>
      ))}
    </section>
  )
}

/* ---------- Card grid ---------- */
/** The patient's introduction, styled as an ID strip rather than a card: it is who they are, not a request. */
function Opener() {
  const lang = useBoard(s => s.lang)
  const addCard = useBoard(s => s.addCard)
  const flash = useFlash<HTMLButtonElement>(1000)
  const c = card('opener')
  return (
    <button
      ref={flash.ref}
      onClick={() => { flash.fire(); addCard('opener') }}
      className={cn(
        'relative col-span-2 flex min-h-[132px] items-stretch overflow-hidden rounded-[14px] border bg-surface text-left shadow-[var(--sh-sm)] transition-[scale,border-color] duration-200 ease-spring active:scale-[.98] max-sm:col-span-full max-sm:min-h-[72px]',
        flash.on ? 'border-yes' : 'border-line-2 hover:border-brand-ink',
      )}
    >
      <span className="grid w-[104px] flex-none place-items-center bg-brand text-on-brand max-sm:w-[64px]">
        <Icon name={c.icon} className="size-14 max-sm:size-9" />
      </span>
      <span className="flex flex-col justify-center gap-1 px-5 py-3 max-sm:gap-0.5 max-sm:px-3.5 max-sm:py-2">
        <b className="text-[24px] leading-[1.15] tracking-[-.01em] max-sm:text-[20px]">{c.label[lang]}</b>
        <small className="text-[15px] text-ink-2">{c.label[alt(lang)]}</small>
      </span>
      <span className={cn('pointer-events-none absolute top-3 right-3 grid size-8 scale-40 place-items-center rounded-full bg-yes text-on-solid opacity-0', flash.on && 'animate-tick')}>
        <Icon name="check" className="size-[18px]" />
      </span>
    </button>
  )
}

function Card({ k }: { k: CardKey }) {
  const lang = useBoard(s => s.lang)
  const addCard = useBoard(s => s.addCard)
  const flash = useFlash<HTMLButtonElement>(1000)
  const c = card(k)
  const action = 'action' in c ? c.action : (c.flow ?? null)
  return (
    <button
      ref={flash.ref}
      data-cat={catOf(k)}
      onClick={() => { if (!action) flash.fire(); addCard(k) }}
      className={cn(
        'group relative flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-[14px] border bg-cs px-3 pt-4 pb-3 text-center transition-[scale,border-color] duration-200 ease-spring active:scale-[.97] max-sm:min-h-[104px] max-sm:gap-1.5 max-sm:pt-3 max-sm:pb-2.5',
        flash.on ? 'border-yes' : 'border-[color-mix(in_srgb,var(--c)_20%,transparent)] hover:border-c',
      )}
    >
      {!action && (
        <span className={cn('pointer-events-none absolute top-2.5 right-2.5 grid size-8 scale-40 place-items-center rounded-full bg-yes text-on-solid opacity-0', flash.on && 'animate-tick')}>
          <Icon name="check" className="size-[18px]" />
        </span>
      )}
      <Icon name={c.icon} className="size-14 text-c transition-[scale] duration-250 ease-spring group-hover:scale-[1.06] max-sm:size-10" />
      <span>
        <b className="block text-[18px] leading-[1.2]">{c.label[lang]}</b>
        <small className="text-[14px] text-[color-mix(in_srgb,var(--c)_35%,var(--ink-2))]">{c.label[alt(lang)]}</small>
        {action && (
          <span className="mt-1 flex items-center justify-center gap-[3px] text-[12.5px] font-bold text-c">
            {action === 'pain' ? (lang === 'en' ? 'Opens body map' : 'Buka peta badan') : lang === 'en' ? 'Guided steps' : 'Langkah berpandu'}<Icon name="arrow" className="size-[13px]" />
          </span>
        )}
      </span>
    </button>
  )
}

/** Colour key for the categories on screen, so colour means something a patient can learn. */
function Legend({ keys }: { keys: CardKey[] }) {
  const lang = useBoard(s => s.lang)
  const cats = [...new Set(keys.filter(k => k !== 'opener').map(catOf))].filter(c => CAT_LABEL[c])
  if (cats.length < 2) return null
  return (
    <ul aria-label="Colour key" className="m-0 mb-2.5 max-md:hidden flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[13px] font-semibold text-ink-2">
      {cats.map(c => (
        <li key={c} data-cat={c} className="inline-flex items-center gap-1.5"><span className="size-3 rounded-[4px] bg-c" />{CAT_LABEL[c]![lang]}</li>
      ))}
    </ul>
  )
}

function Content() {
  const profile = useBoard(s => s.profile)
  const tab = useBoard(s => s.tab)
  const keys = tabCards(profile, tab)
  return (
    <div className="relative -m-1 min-h-0 flex-1 overflow-auto px-1 pt-1 pb-2.5 max-md:overflow-visible">
      <Badge n={8} />
      {tab === 'type' ? <TypePanel /> : tab === 'draw' ? <DrawPanel /> : (
        <>
          <Legend keys={keys} />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 max-sm:grid-cols-2 max-sm:gap-2.5">
            {keys.map(k => k === 'opener' ? <Opener key={k} /> : <Card key={k} k={k} />)}
          </div>
        </>
      )}
    </div>
  )
}

export function Board() {
  return (
    <div className="grid min-h-0 grid-cols-[200px_1fr] gap-5 overflow-hidden px-5 pt-3.5 pb-3 max-md:grid-cols-1 max-md:gap-3 max-md:overflow-visible max-sm:px-3 max-sm:py-3">
      <AiStrip phone />
      <Rail />
      <main className="flex min-h-0 min-w-0 flex-col gap-2.5 overflow-hidden max-md:overflow-visible">
        <Slot />
        <Tabs />
        <Suggest />
        <Content />
      </main>
    </div>
  )
}
