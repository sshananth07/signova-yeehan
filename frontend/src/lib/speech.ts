import type { Lang } from './types.ts'

/**
 * Speaks `text`; returns false when the browser has no speech synthesis.
 * `onFail` runs when the device cannot speak it (no voice, blocked), so the board can offer Show instead.
 */
export function speakText(text: string, lang: Lang, onEnd: () => void, onFail?: () => void): boolean {
  try {
    if (!('speechSynthesis' in window)) return false
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'bm' ? 'ms-MY' : 'en-GB'
    u.rate = 0.95
    u.onend = onEnd
    // "interrupted"/"canceled" just mean a newer message started; anything else is a real failure.
    u.onerror = e => { onEnd(); if (e.error !== 'interrupted' && e.error !== 'canceled') onFail?.() }
    speechSynthesis.speak(u)
    return true
  } catch {
    return false
  }
}
export function cancelSpeech() {
  try { speechSynthesis.cancel() } catch { /* not supported */ }
}

let audioCtx: AudioContext | null = null
const audio = () => (audioCtx ??= new AudioContext())

/** Browsers keep sound off in a tab until someone clicks it; the nurse station asks for that click. */
export function soundOn() {
  try { return audio().state === 'running' } catch { return false }
}
export async function unlockSound() {
  try { await audio().resume() } catch { /* no audio on this device */ }
  return soundOn()
}

/** Starts the alarm beep; `loud` (unanswered for a minute) beeps louder and twice as often. Returns a stop function. */
export function startBeep(loud = false): () => void {
  try {
    const ctx = audio()
    const beep = () => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = loud ? 1040 : 880
      g.gain.value = loud ? 0.3 : 0.08
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      o.stop(ctx.currentTime + 0.25)
    }
    beep()
    const id = setInterval(beep, loud ? 350 : 700)
    return () => clearInterval(id)
  } catch {
    return () => {}
  }
}
