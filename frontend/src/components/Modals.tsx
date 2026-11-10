import { lazy, Suspense, useState } from 'react'
import { useBoard } from '../store.ts'
import { alt, cn, currentSite, painItem, painSay, painShort, type PainDraft } from '../lib/text.ts'
import { FLOWS, flowResult, visibleSteps, type Draft, type FlowOpt } from '../lib/flows.ts'
import { PART, PARTS, SUBS, TYPES, painType, type FlowKey } from '../lib/vocab.ts'
import type { Zone } from '../lib/bodymap.ts'
import { Icon } from './Icon.tsx'
import { PainScale } from './PainScale.tsx'
import { CloseButton, Sheet, useT, SheetTitle, Step, Todo, bodyBox, bodyTip, btnAlt, btnPrimary, note, optBase, optIdle, optOn, preview, previewSub, sheetFoot, sheetHead, sheetIcon } from './ui.tsx'

// three.js is only downloaded the first time the pain map opens.
const Body3D = lazy(() => import('./Body3D.tsx'))

const EMPTY_PAIN: PainDraft = { part: null, sub: null, side: null, score: null, type: null, structure: null, sites: [] }
const SIDES = [{ k: 'l', en: 'Left', bm: 'Kiri' }, { k: 'r', en: 'Right', bm: 'Kanan' }] as const

export function PainModal() {
  const lang = useBoard(s => s.lang)
  const t = useT()
  const { setModal, addItem, showToast } = useBoard.getState()
  const [d, setD] = useState(EMPTY_PAIN)

  const update = (patch: Partial<PainDraft>) => setD(x => ({ ...x, ...patch }))
  // A tap on the 3D body fills part, area and side at once; the buttons fill one level at a time.
  const pickFromBody = (z: Zone, structure: string) => update({ part: z.part, sub: z.sub, side: PART[z.part].side === 'none' ? null : z.side, structure })
  const sideRule = d.part ? PART[d.part].side : 'none'
  const subs = d.part ? SUBS[d.part] : []
  const recorded = new Set(d.sites.map(s => s.part))
  const recordedSub = new Set(d.sites.filter(s => s.part === d.part).map(s => s.sub))
  const cur = currentSite(d)
  const close = () => setModal(null)

  const addSite = () => { if (cur.ok) update({ ...EMPTY_PAIN, sites: [...d.sites, cur.site] }) }
  // Save only works once there is something complete to save; the preview says what is missing.
  const canSave = cur.ok || (d.sites.length > 0 && !d.part)
  const save = () => {
    if (!canSave) return
    const sites = cur.ok ? [...d.sites, cur.site] : d.sites
    sites.forEach(site => addItem(painItem(site), 'Body map'))
    close()
    showToast({ en: 'Pain report added to your message.', bm: 'Laporan sakit ditambah ke mesej anda.' })
  }

  return (
    <Sheet labelledBy="painTitle" wide>
      <div className={cn(sheetHead, 'items-start')}>
        <span className={cn(sheetIcon, 'text-c')}><Icon name="pulse" className="size-8" /></span>
        <SheetTitle id="painTitle" title={t('Where does it hurt?', 'Di manakah rasa sakit?')} sub={<>{t('Di manakah rasa sakit?', 'Where does it hurt?')}<span className="max-sm:hidden"> {t('Tap the body or a button. Both stay in sync.', 'Sentuh badan atau butang. Kedua-duanya selari.')}</span></>} />
        <CloseButton label={t('Close', 'Tutup')} onClick={close} />
      </div>

      <div className="grid min-h-0 grid-cols-[minmax(320px,500px)_1fr] gap-6 overflow-auto px-[22px] py-[18px] max-md:grid-cols-1">
        <div className="flex flex-col gap-2.5">
          <Suspense fallback={<><div className={bodyBox}><span className={bodyTip}>{t('Loading 3D body…', 'Memuatkan badan 3D…')}</span></div><div className="h-[94px]" /></>}>
            <Body3D draft={d} onPick={pickFromBody} />
          </Suspense>
          <p className={cn(note, 'my-[1em]')}>{t('Tap the body to choose; drag to turn it, or use the buttons. Your left is shown on the right in Front view. "Inside" shows the organs.', 'Sentuh badan untuk memilih; seret untuk memusing, atau guna butang. Kiri anda dipaparkan di sebelah kanan dalam paparan Depan. "Dalaman" menunjukkan organ.')}</p>
        </div>

        <div className="grid content-start gap-5">
          <Step n={1} done={!!d.part && (sideRule !== 'need' || !!d.side)} title={t('Where?', 'Di mana?')} sub={t('Di mana?', 'Where?')}>
            <div className="grid grid-cols-5 gap-2 max-md:grid-cols-3">
              {PARTS.map(p => {
                const on = d.part === p.k
                return (
                  <button key={p.k} aria-pressed={on} onClick={() => update({ part: p.k, sub: null, side: null, structure: null })}
                    className={cn(optBase, 'relative min-h-[62px] rounded-[12px] p-2.5 text-left text-[15px] active:scale-[.96]', on ? optOn : optIdle,
                      recorded.has(p.k) && "after:absolute after:top-2 after:right-2 after:size-[9px] after:rounded-full after:bg-c-health after:content-['']")}>
                    {p.l[lang]}<small className={cn('block text-[12.5px] font-medium', on ? 'text-inherit' : 'text-muted')}>{p.l[alt(lang)]}</small>
                  </button>
                )
              })}
            </div>
            {subs.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[13.5px] text-muted">{t('Area', 'Kawasan')} <small className="text-[12px]">· {t('optional', 'pilihan')}</small></span>
                {subs.map(s => {
                  const on = d.sub === s.k
                  return (
                    <button key={s.k} aria-pressed={on} onClick={() => update({ sub: on ? null : s.k, structure: null })}
                      className={cn(optBase, 'relative min-h-12 rounded-full px-4 py-2 active:scale-[.96]', on ? optOn : optIdle,
                        recordedSub.has(s.k) && "after:absolute after:top-1 after:right-2 after:size-[9px] after:rounded-full after:bg-c-health after:content-['']")}>
                      {s.l[lang]} <small className={cn('font-medium [font-size:smaller]', on ? 'text-inherit' : 'text-muted')}>{s.l[alt(lang)]}</small>
                    </button>
                  )
                })}
              </div>
            )}
            <div className="mt-2.5 flex items-center gap-2">
              <span className="mr-1 text-[13.5px] text-muted">{t('Side', 'Sisi')}{sideRule === 'optional' && <small className="text-[12px]"> · {t('optional', 'pilihan')}</small>}</span>
              {SIDES.map(s => {
                const enabled = sideRule !== 'none'
                const on = enabled && d.side === s.k
                return (
                  <button key={s.k} disabled={!enabled} aria-pressed={on}
                    onClick={() => update({ side: on && sideRule === 'optional' ? null : s.k, structure: null })}
                    className={cn(optBase, 'min-h-12 rounded-[12px] px-5 py-2 disabled:opacity-40', on ? optOn : 'border-line-2 bg-surface text-ink', enabled && !on && 'hover:border-c', sideRule === 'need' && !d.side && 'animate-pulse-need')}>
                    {s[lang]} <small className="font-medium [font-size:smaller]">{s[alt(lang)]}</small>
                  </button>
                )
              })}
            </div>
          </Step>

          <Step n={2} done={d.score !== null} title={t('How much does it hurt?', 'Tahap kesakitan')} sub={t('Tahap kesakitan', 'How much does it hurt?')}>
            <PainScale value={d.score} onPick={n => update({ score: n })} />
          </Step>

          <Step n={3} done={!!d.type} title={t('What does it feel like?', 'Rasanya bagaimana?')} sub={t('Optional · Pilihan', 'Pilihan · Optional')}>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(ty => {
                const on = d.type === ty.k
                return (
                  <button key={ty.k} aria-pressed={on} onClick={() => update({ type: on ? null : ty.k })}
                    className={cn(optBase, 'min-h-12 rounded-full px-4 py-2 active:scale-[.96]', on ? optOn : optIdle)}>
                    {ty.l[lang]} <small className={cn('font-medium [font-size:smaller]', on ? 'text-inherit' : 'text-muted')}>{ty.l[alt(lang)]}</small>
                  </button>
                )
              })}
            </div>
          </Step>

          <div className="grid gap-1.5">
            {d.sites.length > 0 && <b className="text-[14px]">{t('Spots added', 'Tempat ditambah')}</b>}
            {d.sites.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-[12px] bg-c-health-s py-1.5 pr-1.5 pl-3 text-[14.5px] font-semibold before:size-[9px] before:flex-none before:rounded-full before:bg-c-health before:content-['']">
                {painShort(s)[lang]}{s.type ? ' · ' + painType(s.type)[lang] : ''}
                <button onClick={() => update({ sites: d.sites.filter((_, j) => j !== i) })} className="ml-auto min-h-9 rounded-[9px] border-0 bg-surface px-3 py-1.5 text-[13px] font-bold">{t('Remove', 'Buang')}</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={sheetFoot}>
        <div className={preview}>
          {cur.ok ? <>{painSay(cur.site)[lang]}<small className={previewSub}>{painSay(cur.site)[alt(lang)]}</small></> : <Todo>{cur.missing[lang]}</Todo>}
        </div>
        <button className={cn(btnAlt, footCompact)} disabled={!cur.ok} onClick={addSite}><Icon name="plus" className="size-[19px]" /><span className="max-sm:sr-only">{t('Add another spot', 'Tambah tempat lain')}</span></button>
        <CancelButton onClick={close} />
        <SaveButton onClick={save} disabled={!canSave} />
      </div>
    </Sheet>
  )
}

/** Choice buttons for one guided step; long lists where every option has an icon show as picture tiles. */
function Options({ opts, value, onPick }: { opts: FlowOpt[]; value: string | undefined; onPick: (k: string) => void }) {
  const lang = useBoard(s => s.lang)
  const tiles = opts.length > 6 && opts.every(o => o.icon)
  return (
    <div className={tiles ? 'grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2' : 'flex flex-wrap gap-2'}>
      {opts.map(o => {
        const on = value === o.k
        return (
          <button key={o.k} aria-pressed={on} onClick={() => onPick(o.k)}
            className={cn(optBase, 'rounded-[12px] px-4 py-2.5 text-[16px] active:scale-[.96]', on ? optOn : optIdle,
              tiles ? 'flex min-h-[104px] flex-col items-center justify-center gap-1.5 text-center' : 'flex min-h-[62px] min-w-[132px] items-center gap-2.5 text-left')}>
            {o.icon && <Icon name={o.icon} className={cn('flex-none text-c', tiles ? 'size-9' : 'size-6')} />}
            <span>{o.label[lang]}{o.label.en !== o.label.bm && <small className={cn('block text-[13px] font-medium', on ? 'text-inherit' : 'text-muted')}>{o.label[alt(lang)]}</small>}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Guided steps for Register, Appointment, Directions, Pharmacy, Symptoms and Allergy (see lib/flows.ts). */
export function FlowModal({ k }: { k: FlowKey }) {
  const f = FLOWS[k]
  const lang = useBoard(s => s.lang)
  const t = useT()
  const { setModal, addItem, showToast, setClerk, startAlarm } = useBoard.getState()
  const [d, setD] = useState<Draft>({})
  const steps = visibleSteps(f, d)
  const res = flowResult(f, d)
  const close = () => setModal(null)
  const set = (key: string, v: string | undefined) => setD(x => ({ ...x, [key]: v }))
  const save = () => {
    if (!res.ok) return
    // The detailed counter request replaces a plain one already in the message (e.g. a bare "Register").
    if (f.clerk) useBoard.setState(s => ({ items: s.items.filter(i => i.key !== f.card) }))
    addItem({ key: f.card, kind: f.kind, cat: f.cat, say: res.say, short: res.short }, 'Guided steps')
    close()
    if (f.clerk) setClerk(true)
    else showToast(f.done)
  }
  // Danger sign: the patient decides; what they chose so far goes into the message first so staff see why.
  const emergency = () => {
    if (res.ok) addItem({ key: f.card, kind: f.kind, cat: f.cat, say: res.say, short: res.short }, 'Guided steps')
    close()
    startAlarm()
  }

  return (
    <Sheet labelledBy="flowTitle" cat={f.cat}>
      <div className={cn(sheetHead, 'items-start')}>
        <span className={cn(sheetIcon, 'text-c')}><Icon name={f.icon} className="size-9" /></span>
        <SheetTitle id="flowTitle" title={f.title[lang]} sub={`${f.title[alt(lang)]}. ${f.hint[lang]}`} />
        <CloseButton label={t('Close', 'Tutup')} onClick={close} />
      </div>
      <div className="grid gap-5 overflow-auto px-[22px] py-[18px] max-sm:px-4">
        {steps.map((st, i) => (
          <Step key={st.k} n={i + 1} done={!!d[st.k]} title={st.title[lang]} sub={(st.optional ? t('Optional · ', 'Pilihan · ') : '') + st.title[alt(lang)]}>
            {'number' in st ? (
              <input inputMode="numeric" maxLength={6} aria-label={st.title[lang]} placeholder={st.number.hint} value={d[st.k] ?? ''}
                onChange={e => set(st.k, e.target.value.replace(/\D/g, '') || undefined)}
                className="min-h-[62px] w-[220px] rounded-[12px] border-[1.5px] border-line-2 bg-surface px-4 text-[28px] font-bold tracking-[.06em] tabular-nums placeholder:text-[18px] placeholder:font-medium placeholder:tracking-normal placeholder:text-muted focus:border-c focus:outline-none" />
            ) : (
              <Options opts={st.opts} value={d[st.k]} onPick={v => set(st.k, d[st.k] === v ? undefined : v)} />
            )}
          </Step>
        ))}
      </div>
      <div className={sheetFoot}>
        {/* In the footer, so it stays in view however far the steps scroll. */}
        {f.danger?.(d) && (
          <div role="alert" className="flex basis-full animate-fade-up flex-wrap items-center gap-x-4 gap-y-3 rounded-[16px] border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-no-soft p-4 max-sm:p-3">
            <Icon name="alert" className="size-8 flex-none text-danger" />
            <div className="min-w-[200px] flex-1">
              <b className="block text-[18px] text-danger-ink">{t('This can be serious. Get help now.', 'Ini boleh jadi serius. Dapatkan bantuan sekarang.')}</b>
              <span className="text-[14.5px] text-ink-2">{t('Press Emergency and staff will come to you straight away.', 'Tekan Kecemasan dan staf akan datang segera.')}</span>
            </div>
            <button onClick={emergency} className="flex min-h-[56px] items-center gap-2.5 rounded-[14px] border-0 bg-danger px-5 text-[17px] font-extrabold tracking-[.03em] text-white transition-[background-color,scale] duration-200 ease-spring hover:bg-danger-ink active:scale-[.98] max-sm:w-full max-sm:justify-center">
              <Icon name="alert" className="size-6" />{t('EMERGENCY', 'KECEMASAN')}
            </button>
          </div>
        )}
        <div className={preview}>
          {res.ok ? <>{res.say[lang]}<small className={previewSub}>{res.say[alt(lang)]}</small></> : <Todo>{t('Choose: ', 'Pilih: ')}{res.missing.title[lang].replace(/\?$/, '').toLowerCase()}.</Todo>}
        </div>
        <CancelButton onClick={close} />
        <SaveButton onClick={save} disabled={!res.ok} label={f.clerk ? [t('Save and show the counter', 'Simpan dan tunjuk kaunter'), t('Save & show', 'Simpan & tunjuk')] : undefined} />
      </div>
    </Sheet>
  )
}

/* Sheet footer buttons: on phones the secondary ones shrink to icons so the footer stays one row under the preview. */
const footCompact = 'max-sm:min-w-[52px] max-sm:px-3'
function CancelButton({ onClick }: { onClick: () => void }) {
  const t = useT()
  return <button className={cn(btnAlt, footCompact)} onClick={onClick}><Icon name="x" className="size-[19px] sm:hidden" /><span className="max-sm:sr-only">{t('Cancel', 'Batal')}</span></button>
}
/** Looks inactive until the required steps are done; the preview beside it says what is missing. */
function SaveButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label?: [wide: string, phone: string] }) {
  const t = useT()
  const [wide, phone] = label ?? [t('Confirm and save', 'Sahkan dan simpan'), t('Save', 'Simpan')]
  return <button className={cn(btnPrimary, 'max-sm:flex-1')} disabled={disabled} onClick={onClick}><Icon name="check" className="size-[19px]" /><span className="max-sm:hidden">{wide}</span><span className="sm:hidden">{phone}</span></button>
}
