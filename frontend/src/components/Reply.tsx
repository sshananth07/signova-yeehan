import { useEffect, useRef, useState } from 'react'
import { useBoard } from '../store.ts'
import { alt, cn } from '../lib/text.ts'
import type { Profile } from '../lib/types.ts'
import { REPLIES, fillReply, type ReplyPreset } from '../lib/vocab.ts'
import { Icon } from './Icon.tsx'
import { ago, btnPrimary, useNow, useT } from './ui.tsx'

/**
 * Staff side: one-tap replies to the patient. Presets with a number (queue, counter, floor)
 * ask for it first. `to` is the log row being answered, which then counts as seen.
 */
export function ReplyPicker({ profile, to, onSent, dark }: { profile: Profile; to?: number | number[]; onSent?: () => void; dark?: boolean }) {
  const sendReply = useBoard(s => s.sendReply)
  const [pending, setPending] = useState<ReplyPreset | null>(null)
  const [n, setN] = useState('')
  const send = (p: ReplyPreset, num?: string) => {
    sendReply(profile, fillReply(p, num), p.icon, to, p.due)
    setPending(null)
    setN('')
    onSent?.()
  }
  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap gap-2">
        {REPLIES[profile].map(p => (
          <button key={p.k} aria-pressed={pending?.k === p.k} onClick={() => (p.num ? setPending(p) : send(p))}
            className={cn('inline-flex min-h-12 items-center gap-2 rounded-[12px] border px-3.5 py-2 text-left text-[14.5px] font-bold transition-[border-color,background-color] duration-150',
              pending?.k === p.k ? 'border-brand-ink bg-brand-soft text-brand-ink' : dark ? 'border-white/40 bg-white/10 text-white hover:bg-white/20' : 'border-line-2 bg-surface hover:border-brand-ink')}>
            <Icon name={p.icon} className="size-5 flex-none" />
            <span className="leading-[1.2]">{fillReply(p, '…').en.replace(/\.$/, '')}<small className="block text-[12.5px] font-medium opacity-80">{fillReply(p, '…').bm.replace(/\.$/, '')}</small></span>
          </button>
        ))}
      </div>
      {pending && (
        <form className="flex flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); if (n) send(pending, n) }}>
          <label className={cn('text-[14px] font-bold', dark && 'text-white')} htmlFor="replyNum">{pending.num}</label>
          <input id="replyNum" autoFocus inputMode="numeric" maxLength={6} value={n} onChange={e => setN(e.target.value.replace(/\D/g, ''))}
            className="min-h-12 w-[140px] rounded-[12px] border border-line-2 bg-surface px-3 text-[22px] font-bold text-ink tabular-nums focus:border-brand-ink focus:outline-none" />
          <button className={btnPrimary} disabled={!n}><Icon name="chat" className="size-[19px]" />Send · Hantar</button>
        </form>
      )}
    </div>
  )
}

const BIG = new Set(['go-left', 'go-right', 'go-up', 'stairs'])
/** After this, a reply fades: it is history, not news. */
const FRESH_MS = 15 * 60_000
const clock = (ms: number) => new Date(ms).toTimeString().slice(0, 5)

/**
 * Patient side: the latest staff reply as one line in the message panel, spoken once when it
 * arrives (also from another tab). Shows its age, and when a reply promised a time, when help is due.
 */
export function ReplyLine() {
  const reply = useBoard(s => s.reply)
  const profile = useBoard(s => s.profile)
  const lang = useBoard(s => s.lang)
  const dismissReply = useBoard(s => s.dismissReply)
  const t = useT()
  const now = useNow(30_000)
  const spoken = useRef(reply?.id)
  useEffect(() => {
    if (!reply || reply.profile !== profile || spoken.current === reply.id) return
    spoken.current = reply.id
    useBoard.getState().speak(reply.text[lang])
  }, [reply, profile, lang])
  if (!reply || reply.profile !== profile) return null
  const big = BIG.has(reply.icon)
  const old = now - reply.id > FRESH_MS
  return (
    <div className={cn('flex items-center gap-3 rounded-[14px] bg-brand-soft py-2 pr-2 pl-2 transition-opacity duration-500', old && 'opacity-60')}>
      <span className={cn('grid flex-none place-items-center rounded-[11px] bg-brand text-on-brand', big ? 'size-16 max-md:size-12' : 'size-11 max-md:size-9')}>
        <Icon name={reply.icon} className={big ? 'size-11 max-md:size-9' : 'size-6 max-md:size-5'} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-bold text-brand-ink">
          {t('Staff replied', 'Staf membalas')} · {reply.t} · {ago(now - reply.id, lang)}
          {reply.due && now < reply.due + FRESH_MS && <> · {t('due', 'dijangka')} {clock(reply.due)}</>}
        </div>
        <b className="block text-[19px] leading-[1.2] max-md:truncate max-md:text-[17px]">{reply.text[lang]}</b>
        <span className="text-[14px] text-ink-2 max-md:hidden">{reply.text[alt(lang)]}</span>
      </div>
      <button onClick={dismissReply} aria-label={t('Dismiss reply', 'Tutup balasan')} className="grid size-10 flex-none max-md:size-9 place-items-center self-start rounded-[10px] bg-surface text-ink-2"><Icon name="x" className="size-4" /></button>
    </div>
  )
}
