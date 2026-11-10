export type Lang = 'en' | 'bm'
export type Bi = { en: string; bm: string }
export type Profile = 'fd' | 'bs'
export type TabKey = 'main' | 'health' | 'feel' | 'ask' | 'type' | 'draw'
export type Cat = 'need' | 'care' | 'health' | 'feel' | 'ask' | 'desk' | 'social' | 'base' | 'sos'
export type Kind =
  | 'request' | 'need' | 'reply' | 'symptom' | 'feeling' | 'question'
  | 'pain' | 'answer' | 'typed' | 'message' | 'alert' | 'staff'
export type Side = 'l' | 'r'

export type IconName =
  // Interface (Phosphor)
  | 'check' | 'x' | 'q' | 'repeat' | 'clock' | 'clip' | 'pin' | 'moon' | 'light' | 'mic' | 'vol' | 'kbd' | 'pen'
  | 'alert' | 'shield' | 'trash' | 'stop' | 'replay' | 'grid' | 'heart' | 'bed' | 'desk' | 'chev'
  | 'arrow' | 'info' | 'plus' | 'copy' | 'tap' | 'users' | 'user' | 'pulse' | 'chat' | 'drop' | 'toilet' | 'help' | 'turn' | 'love'
  | 'go-left' | 'go-right' | 'go-up' | 'stairs' | 'monitor' | 'id' | 'money' | 'pray' | 'lift' | 'exit' | 'car' | 'xray' | 'hourglass'
  // Cards (Healthicons)
  | 'ear' | 'register' | 'cal' | 'directions' | 'pharmacy' | 'pill' | 'pain' | 'therm' | 'doctor' | 'nurse' | 'cold'
  | 'suction' | 'allergy' | 'food' | 'rest' | 'home' | 'family' | 'lab' | 'alone' | 'happy' | 'ok' | 'nervous'
  | 'upset' | 'sleepy' | 'neutral' | 'crying' | 'sobbing'

/** One part of the patient's message (a chip in the composer). */
export type Item = {
  uid: number
  key?: string
  kind: Kind
  cat?: Cat
  say: Bi
  short: Bi
  src: string
  meta?: { score: number; site: string; detail?: string }
  /** Number of the staff-log row this chip created, so the chip can show when staff saw it. */
  ev?: number
}
export type NewItem = Omit<Item, 'uid' | 'src'>

/** One row in the staff log. */
export type LogEvent = {
  n: number
  t: string
  kind: Kind
  en: string
  bm: string
  src: string
  seen: boolean
  score?: number
  site?: string
  /** Extra detail for staff only, e.g. the anatomy structure tapped. */
  detail?: string
  /** When it was logged (ms), for repeat detection and due times. */
  at?: number
  /** When staff marked it seen (HH:MM). */
  seenAt?: string
  /** When staff marked it done (HH:MM); done rows leave the station's open list. */
  doneAt?: string
  /** A staff reply promised help by this time (ms); late rows are flagged at the station. */
  due?: number
  /** How many times the patient asked for this before it was done. */
  asks?: number
  /** Small JPEG of a drawing the patient showed. */
  img?: string
}

/** A staff reply shown and spoken on the patient's board. */
export type Reply = { id: number; profile: Profile; t: string; text: Bi; icon: IconName; due?: number }
