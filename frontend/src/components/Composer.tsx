import { useState } from 'react'
import { useBoard } from '../store.ts'
import { alt, candidates, cn, combined } from '../lib/text.ts'
import type { LogEvent } from '../lib/types.ts'
import { SRC_BM, kindCat } from '../lib/vocab.ts'
import { Icon } from './Icon.tsx'
import { ReplyLine } from './Reply.tsx'
import { Badge, useT } from './ui.tsx'

const EMPTY = { en: 'Your message will appear here', bm: 'Mesej anda akan dipaparkan di sini' }

function Chips() {
  const items = useBoard(s => s.items)
  const lang = useBoard(s => s.lang)
  const removeItem = useBoard(s => s.removeItem)
  const events = useBoard(s => s.events[s.profile])
  const t = useT()
  if (!items.length) {
    return (
      <span className="inline-flex items-center gap-2 text-[14.5px] text-muted">
        <Icon name="tap" className="size-[18px] text-brand-ink" />
        <span className="max-md:hidden">{t('Tap a card, a quick reply, or the body map. Each choice is spoken straight away and added here.', 'Sentuh kad, balas pantas atau peta badan. Setiap pilihan disebut terus dan ditambah di sini.')}</span>
        <span className="md:hidden">{t('Tap a card. It is spoken and added here.', 'Sentuh kad. Ia disebut dan ditambah di sini.')}</span>
      </span>
    )
  }
  return items.map(i => (
    <span key={i.uid} data-cat={i.cat ?? kindCat(i.kind)} className="inline-flex animate-pop items-center gap-2 rounded-full bg-cs py-[3px] pr-[3px] pl-3 text-[14.5px] font-bold text-ink">
      {i.short[lang]} <span className="text-[12.5px] font-medium text-ink-2">· {lang === 'en' ? i.src : (SRC_BM[i.src] ?? i.src)}</span>
      <Status ev={i.ev ? events.find(e => e.n === i.ev) : undefined} />
      <button aria-label={`${t('Remove', 'Buang')} ${i.short[lang]}`} onClick={() => removeItem(i.uid)} className="grid size-[30px] place-items-center rounded-full border-0 bg-surface text-muted transition-colors duration-150 hover:text-no">
        <Icon name="x" className="size-3.5" />
      </button>
    </span>
  ))
}

/** Tick on a chip once staff have seen, then done, that request, so the patient knows it landed. */
function Status({ ev }: { ev?: LogEvent }) {
  const t = useT()
  if (!ev?.seenAt) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[12.5px] font-bold text-yes">
      <Icon name="check" className="size-3.5" />{ev.doneAt ? `${t('Done', 'Selesai')} ${ev.doneAt}` : `${t('Seen', 'Dilihat')} ${ev.seenAt}`}
    </span>
  )
}

function Say() {
  const items = useBoard(s => s.items)
  const aiChoice = useBoard(s => s.aiChoice)
  const lang = useBoard(s => s.lang)
  const t = useT()
  const empty = !items.length
  const main = empty ? EMPTY[lang] : aiChoice ? aiChoice[lang] : combined(items, lang)
  const sub = empty ? EMPTY[alt(lang)] : aiChoice ? aiChoice[alt(lang)] : combined(items, alt(lang))
  const long = !empty && main.length > 90
  // Phones clamp the message to keep the sticky panel short; it can be opened in full.
  // Tied to the text, so a new or changed message starts clamped again.
  const [openFor, setOpenFor] = useState<string | null>(null)
  const open = openFor === main
  const setOpen = (f: (o: boolean) => boolean) => setOpenFor(f(open) ? main : null)
  const clampable = !empty && main.length > 45
  return (
    <div className="min-w-0">
      {!empty && aiChoice && (
        <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-[3px] text-[12.5px] font-bold text-brand-ink">
          <Icon name="check" className="size-3.5" />{t('Wording chosen by the patient', 'Ayat dipilih oleh pesakit')}
        </div>
      )}
      <div onClick={() => clampable && setOpen(o => !o)} className={cn('leading-[1.16] tracking-[-.015em] text-pretty', !open && 'max-md:line-clamp-2', long ? 'text-[28px] max-md:text-[20px]' : 'text-[34px] max-md:text-[24px]', empty ? 'font-semibold text-muted' : 'font-bold')}>{main}</div>
      <div className={cn('mt-1 flex items-baseline gap-3 text-[19px] text-muted max-md:text-[16px]', open && 'flex-col gap-1')}>
        <span className={cn('min-w-0 flex-1', !open && 'max-md:line-clamp-1')}>{sub}</span>
        {clampable && (
          <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="inline-flex min-h-9 flex-none items-center gap-1 text-[14px] font-bold text-brand-ink md:hidden">
            {open ? t('Less', 'Kurang') : t('Full message', 'Mesej penuh')}
            <Icon name="chev" className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} />
          </button>
        )}
      </div>
    </div>
  )
}

const ghost = 'flex min-h-[54px] flex-col items-center justify-center gap-[3px] rounded-[12px] border border-line bg-surface p-1.5 text-[13px] font-bold text-ink-2 transition-[background-color,border-color] duration-200 hover:border-line-2 hover:bg-surface-2 max-md:min-h-[52px] max-md:min-w-[52px]'
const ghostLabel = 'max-md:sr-only'

function Controls() {
  const speaking = useBoard(s => s.speaking)
  const lang = useBoard(s => s.lang)
  const t = useT()
  const { speakMessage, replay, stopSpeech, clearItems, setClerk, showToast } = useBoard.getState()
  const show = () => (useBoard.getState().items.length ? setClerk(true) : showToast({ en: 'Nothing to show yet. Tap a card first.', bm: 'Belum ada mesej. Sentuh kad dahulu.' }, 'tap'))
  return (
    <div className="grid w-[264px] content-start gap-2 max-md:w-auto max-md:grid-cols-[1fr_auto]">
      <button onClick={speakMessage} className="flex min-h-[74px] items-center gap-3.5 max-md:min-h-[52px] max-md:gap-2.5 max-md:py-1 max-md:pl-1.5 max-md:text-[17px] rounded-[16px] border-0 bg-brand py-3 pr-[18px] pl-3 text-left text-[19px] font-extrabold text-on-brand shadow-[var(--sh)] transition-[scale,background-color] duration-200 ease-spring hover:bg-brand-ink active:scale-[.98]">
        <span className="grid size-12 flex-none place-items-center rounded-[13px] bg-[rgba(255,255,255,.18)] max-md:size-10">
          {speaking ? (
            <span className="flex h-[22px] items-center gap-[3px]">
              {['', '[animation-delay:.12s]', '[animation-delay:.24s]', '[animation-delay:.36s]'].map(d => <i key={d} className={cn('h-1.5 w-1 animate-bar rounded-[2px] bg-current', d)} />)}
            </span>
          ) : <Icon name="vol" />}
        </span>
        <span><span className="max-sm:hidden">{t('Speak message', 'Sebut mesej')}</span><span className="sm:hidden">{t('Speak', 'Sebut')}</span><small className="block text-[13px] font-medium opacity-[.88] max-sm:hidden">{lang === 'en' ? 'Sebut mesej' : 'Speak message'}</small></span>
      </button>
      <div className="grid grid-cols-4 gap-2">
        <button className={ghost} onClick={replay}><Icon name="replay" className="size-[19px]" /><span className={ghostLabel}>{t('Replay', 'Ulang')}</span></button>
        <button className={ghost} onClick={stopSpeech}><Icon name="stop" className="size-[19px]" /><span className={ghostLabel}>{t('Stop', 'Henti')}</span></button>
        <button className={ghost} onClick={show}><Icon name="users" className="size-[19px]" /><span className={ghostLabel}>{t('Show', 'Tunjuk')}</span></button>
        <button className={ghost} onClick={clearItems}><Icon name="trash" className="size-[19px]" /><span className={ghostLabel}>{t('Clear', 'Padam')}</span></button>
      </div>
    </div>
  )
}

/**
 * Simulated AI: offers full sentences once two or more content items are chosen.
 * Rendered twice: inside the message panel on wide screens, and under it on phones so it
 * scrolls away instead of riding along in the sticky panel.
 */
export function AiStrip({ phone }: { phone?: boolean }) {
  const items = useBoard(s => s.items)
  const lang = useBoard(s => s.lang)
  const chooseCandidate = useBoard(s => s.chooseCandidate)
  const t = useT()
  const cs = candidates(items, lang)
  if (!cs) return null
  const guard = (
    <span className="flex items-center gap-[5px] text-[12.5px] font-medium text-yes">
      <Icon name="shield" className="size-[13px] flex-none" />{t('Uses only what you chose', 'Guna pilihan anda sahaja')}
    </span>
  )
  const list = cs.list.map((c, i) => (
    <button key={i} title={c[lang]} onClick={() => chooseCandidate({ en: c.en, bm: c.bm })} className="min-w-60 flex-[1_1_300px] rounded-[14px] max-md:min-w-[220px] max-md:flex-[0_0_240px] border border-line bg-surface-2 px-3 py-2 text-left text-[14.5px] leading-[1.3] font-semibold transition-[background-color,border-color] duration-200 hover:border-brand-ink hover:bg-brand-soft">
      <span className="line-clamp-2">{c[lang]}</span>
      <span className="mt-1 block text-[12px] font-bold text-muted">{c.tag[lang]}</span>
    </button>
  ))
  // Phones: one chip that opens the choices, so the cards stay near the top of the screen.
  if (phone) return (
    <details className="group relative animate-fade-up md:hidden">
      <Badge n={3} />
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface py-2 pr-3 pl-4 text-[14.5px] font-bold text-brand-ink [&::-webkit-details-marker]:hidden">
        {t('Say it as one sentence', 'Sebut dalam satu ayat')}<span className="rounded-full bg-brand-soft px-2 py-0.5 text-[12.5px]">{cs.list.length}</span>
        <Icon name="chev" className="size-4 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="mt-2 grid gap-2">
        {guard}
        <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 [scrollbar-width:none] max-sm:-mx-3 max-sm:px-3">{list}</div>
      </div>
    </details>
  )
  return (
    <div className="relative col-span-full flex animate-fade-up items-stretch gap-2.5 overflow-x-auto border-t border-dashed border-line-2 pt-2.5 [scrollbar-width:none] max-md:hidden">
      <Badge n={3} />
      <div className="flex flex-[0_0_170px] flex-col justify-center gap-1 text-[14px] leading-[1.25] font-bold text-brand-ink">
        {t('Say it as one sentence', 'Sebut dalam satu ayat')}{guard}
      </div>
      {list}
    </div>
  )
}

export function Composer() {
  return (
    <section aria-live="polite" className="relative z-40 mx-5 mt-3 grid max-md:sticky max-md:top-2 max-md:gap-y-2 max-md:py-3 grid-cols-[1fr_auto] gap-x-[22px] gap-y-3 rounded-[20px] border border-line bg-surface px-[18px] py-3.5 shadow-[var(--sh)] max-md:grid-cols-1 max-sm:mx-3">
      <Badge n={2} />
      <div className="grid min-w-0 content-start gap-2.5">
        <div className="flex min-h-[34px] flex-wrap items-center gap-2 max-md:flex-nowrap max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:[&>*]:flex-none"><Chips /></div>
        <Say />
        <ReplyLine />
      </div>
      <Controls />
      <AiStrip />
    </section>
  )
}
