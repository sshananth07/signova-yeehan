import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useBoard } from '../store.ts'
import { insertWord, wordSuggestions } from '../lib/text.ts'
import { Icon } from './Icon.tsx'
import { btnAlt, btnPrimary, note, useT } from './ui.tsx'

const panel = 'grid gap-3 rounded-[20px] border border-line bg-surface px-[18px] py-4 shadow-[var(--sh-sm)]'
const row = 'flex flex-wrap items-center gap-2.5'
const clip = (s: string) => s.slice(0, 18) + (s.length > 18 ? '…' : '')

export function TypePanel() {
  const lang = useBoard(s => s.lang)
  const t = useT()
  const [text, setText] = useState('')
  const ta = useRef<HTMLTextAreaElement>(null)

  const read = () => {
    const v = text.trim()
    if (!v) useBoard.getState().showToast({ en: 'Type something first.', bm: 'Taip sesuatu dahulu.' }, 'kbd')
    return v
  }
  const speakNow = () => {
    const v = read()
    if (!v) return
    const { speak, logEvent } = useBoard.getState()
    speak(v)
    logEvent('message', { en: v, bm: v }, 'Typed')
  }
  const addToMessage = () => {
    const v = read()
    if (!v) return
    useBoard.getState().addItem({ kind: 'typed', say: { en: v, bm: v }, short: { en: 'Typed: ' + clip(v), bm: 'Ditaip: ' + clip(v) } }, 'Typed')
    setText('')
  }

  return (
    <div className={panel}>
      <label htmlFor="typed"><b className="text-[17px]">{t('Type your message', 'Taip mesej anda')}</b> <span className={note}>{t('Spoken word for word. Marked as typed in the staff record.', 'Disebut perkataan demi perkataan. Ditanda sebagai ditaip dalam rekod staf.')}</span></label>
      <textarea
        id="typed"
        ref={ta}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={lang === 'en' ? 'Type here…' : 'Taip di sini…'}
        className="min-h-[118px] w-full resize-y rounded-[14px] border border-line-2 bg-surface-2 p-3.5 text-[24px] text-ink transition-[border-color,box-shadow] duration-200 placeholder:text-muted focus:border-brand-ink focus:shadow-[0_0_0_4px_var(--brand-soft)] focus:outline-none"
      />
      <div className={row}>
        {wordSuggestions(text).map(w => (
          <button key={w} onClick={() => { setText(insertWord(text, w)); ta.current?.focus() }} className="min-h-11 rounded-full border border-line bg-surface px-4 py-2 font-bold transition-[border-color] duration-200 hover:border-brand-ink">{w}</button>
        ))}
        <span className={note}>{t('Word suggestions', 'Cadangan perkataan')}</span>
      </div>
      <div className={row}>
        <button className={btnPrimary} onClick={addToMessage}><Icon name="plus" className="size-[19px]" />{t('Add to message', 'Tambah ke mesej')}</button>
        <button className={btnAlt} onClick={speakNow}><Icon name="vol" className="size-[19px]" />{t('Speak typed text', 'Sebut teks ditaip')}</button>
      </div>
    </div>
  )
}

export function DrawPanel() {
  const t = useT()
  const pad = useRef<HTMLCanvasElement>(null)
  const ctx = useRef<CanvasRenderingContext2D | null>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const c = pad.current!
    const r = c.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = r.width * dpr
    c.height = r.height * dpr
    const g = c.getContext('2d')!
    g.scale(dpr, dpr)
    g.lineWidth = 4
    g.lineCap = 'round'
    g.strokeStyle = '#10201D'
    ctx.current = g
  }, [])

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    ctx.current?.beginPath()
    ctx.current?.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
  }
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !ctx.current) return
    ctx.current.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
    ctx.current.stroke()
  }
  const clear = () => { const c = pad.current!; ctx.current?.clearRect(0, 0, c.width, c.height) }
  const showBig = () => {
    const { setBigImage, logEvent } = useBoard.getState()
    const c = pad.current!
    setBigImage(c.toDataURL())
    // A small JPEG for the staff log, so the next shift can see what was drawn.
    const thumb = document.createElement('canvas')
    thumb.width = 320
    thumb.height = Math.round((320 * c.height) / c.width)
    const g = thumb.getContext('2d')!
    g.fillStyle = '#fff'
    g.fillRect(0, 0, thumb.width, thumb.height)
    g.drawImage(c, 0, 0, thumb.width, thumb.height)
    logEvent('message', { en: 'Patient showed a drawing.', bm: 'Pesakit menunjukkan lukisan.' }, 'Draw', { img: thumb.toDataURL('image/jpeg', 0.7) })
  }

  return (
    <div className={panel}>
      <div className={row}><b className="text-[17px]">{t('Draw or write', 'Lukis atau tulis')}</b><span className={note}>{t('Shown to staff as a picture. No handwriting recognition.', 'Ditunjuk kepada staf sebagai gambar. Tulisan tangan tidak dibaca.')}</span></div>
      <canvas ref={pad} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drawing.current = false }}
        className="h-[280px] w-full cursor-crosshair touch-none rounded-[14px] border border-line-2 bg-white" />
      <div className={row}>
        <button className={btnPrimary} onClick={showBig}><Icon name="users" className="size-[19px]" />{t('Show large to staff', 'Tunjuk besar kepada staf')}</button>
        <button className={btnAlt} onClick={clear}><Icon name="trash" className="size-[19px]" />{t('Clear drawing', 'Padam lukisan')}</button>
      </div>
    </div>
  )
}
