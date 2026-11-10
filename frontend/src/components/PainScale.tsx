import { useBoard } from '../store.ts'
import { cn } from '../lib/text.ts'
import type { IconName } from '../lib/types.ts'
import { Icon } from './Icon.tsx'
import { optBase, useNow, useT } from './ui.tsx'

/** Faces on the even scores, as on common face pain scales; the colour deepens with the number. */
const FACES: Partial<Record<number, IconName>> = { 0: 'happy', 2: 'ok', 4: 'neutral', 6: 'upset', 8: 'crying', 10: 'sobbing' }

/** 0–10 face scale. Needs a `data-cat="health"` ancestor for its colour. */
export function PainScale({ value, onPick, compact }: { value: number | null; onPick: (n: number) => void; compact?: boolean }) {
  return (
    <div>
      <div className="grid grid-cols-11 gap-1.5 max-md:grid-cols-6">
        {Array.from({ length: 11 }, (_, n) => {
          const on = value === n
          const face = FACES[n]
          // 0–6 tint gently; 7–10 jump to a deep band so severe pain reads as severe (text flips to keep ≥3:1).
          const severe = n >= 7
          const tint = severe ? 70 + (n - 7) * 8 : n * 7
          return (
            <button key={n} aria-pressed={on} aria-label={`Score ${n}`} onClick={() => onPick(n)}
              style={on ? undefined : { backgroundColor: `color-mix(in srgb, var(--c) ${tint}%, var(--surface))` }}
              className={cn(optBase, 'flex flex-col items-center justify-end gap-1 rounded-[12px] tabular-nums', compact ? 'min-h-[58px] pb-1.5 text-[17px]' : 'min-h-[86px] pb-2 text-[20px]',
                on ? 'scale-[1.06] border-c bg-c text-on-solid shadow-[0_6px_14px_color-mix(in_srgb,var(--c)_30%,transparent)] ring-3 ring-ink ring-offset-2 ring-offset-surface'
                  : cn('border-[color-mix(in_srgb,var(--c)_25%,var(--line-2))] hover:border-ink active:scale-[.96]', severe ? 'text-on-solid' : 'text-ink'))}>
              {face && <Icon name={face} className={cn(compact ? 'size-6' : 'size-8', !on && !severe && 'text-c')} />}
              {n}
            </button>
          )
        })}
      </div>
      {!compact && <div className="mt-1.5 flex justify-between text-[13px] text-muted"><span>0 · No pain / Tiada sakit</span><span>10 · Worst pain / Paling sakit</span></div>}
    </div>
  )
}

/** True once a pain check-back is due on this board. */
export function useCheckDue() {
  const check = useBoard(s => s.check)
  const profile = useBoard(s => s.profile)
  const t = useNow(20_000)
  return !!check && check.profile === profile && t >= check.at
}

/** "How is your pain now?" some time after a pain report or a medicine request: one row, scale inline. */
export function PainCheck() {
  const check = useBoard(s => s.check)
  const lang = useBoard(s => s.lang)
  const t = useT()
  const { checkPain, snoozeCheck } = useBoard.getState()
  if (!check) return null
  return (
    <section data-cat="health" aria-live="polite" className="flex animate-fade-up flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[20px] border border-[color-mix(in_srgb,var(--c)_30%,transparent)] bg-cs px-4 py-3">
      <div className="flex min-w-[200px] items-center gap-2.5">
        <Icon name="pulse" className="size-7 flex-none text-c" />
        <div>
          <b className="block text-[19px] leading-[1.2]">{t('How is your pain now?', 'Bagaimana sakit anda sekarang?')}</b>
          <span className="text-[13.5px] text-ink-2">{t('Bagaimana sakit anda sekarang?', 'How is your pain now?')}{check.site && lang === 'en' && ` · ${check.site}`}</span>
        </div>
      </div>
      <div className="min-w-[min(100%,520px)] flex-1"><PainScale value={null} onPick={checkPain} compact /></div>
      <button onClick={snoozeCheck} className="min-h-11 rounded-[10px] border border-line-2 bg-surface px-3.5 text-[14px] font-bold text-ink-2">{t('Not now', 'Nanti')}</button>
    </section>
  )
}
