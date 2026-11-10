import type { Bi, Cat, IconName, Kind, Profile, TabKey } from './types.ts'

const T = (en: string, bm: string): Bi => ({ en, bm })

/** Guided-step windows (lib/flows.ts). A card with `flow` opens one instead of speaking straight away. */
export type FlowKey = 'register' | 'appointment' | 'directions' | 'pharmacy' | 'sym' | 'allergy'
type SayCard = { icon: IconName; label: Bi; say: Bi; kind: Kind; short: Bi; flow?: FlowKey }
type ActionCard = { icon: IconName; label: Bi; action: 'pain' | 'sym' }
export type CardDef = SayCard | ActionCard

export const C = {
  opener: { icon: 'ear', label: T('I can hear you', 'Saya boleh dengar'), say: T('I can hear you, but I cannot speak. Please ask me yes or no questions.', 'Saya boleh dengar, tetapi saya tidak boleh bercakap. Sila tanya soalan ya atau tidak.'), kind: 'request', short: T('Can hear, cannot speak', 'Boleh dengar, tak boleh cakap') },
  register: { icon: 'register', label: T('Register', 'Daftar'), say: T('I would like to register.', 'Saya ingin mendaftar.'), kind: 'request', short: T('Register', 'Daftar'), flow: 'register' },
  appointment: { icon: 'cal', label: T('Appointment', 'Temu janji'), say: T('I have an appointment.', 'Saya mempunyai temu janji.'), kind: 'request', short: T('Has appointment', 'Ada temu janji'), flow: 'appointment' },
  directions: { icon: 'directions', label: T('Directions', 'Arah'), say: T('I would like to ask for directions.', 'Saya ingin bertanya arah.'), kind: 'request', short: T('Directions', 'Arah'), flow: 'directions' },
  pharmacy: { icon: 'pharmacy', label: T('Pharmacy', 'Farmasi'), say: T('I would like directions to the pharmacy.', 'Saya ingin tahu arah ke farmasi.'), kind: 'request', short: T('Pharmacy', 'Farmasi'), flow: 'pharmacy' },
  pain: { icon: 'pain', label: T('Pain', 'Sakit'), action: 'pain' },
  symptoms: { icon: 'therm', label: T('Symptoms', 'Simptom'), action: 'sym' },
  water: { icon: 'drop', label: T('Water', 'Air'), say: T('I need water.', 'Saya perlukan air.'), kind: 'need', short: T('Water', 'Air') },
  toilet: { icon: 'toilet', label: T('Toilet', 'Tandas'), say: T('I need the toilet.', 'Saya perlu ke tandas.'), kind: 'need', short: T('Toilet', 'Tandas') },
  help: { icon: 'help', label: T('Help', 'Tolong'), say: T('I need help, please.', 'Tolong bantu saya.'), kind: 'need', short: T('Help', 'Tolong') },
  doctor: { icon: 'doctor', label: T('Doctor', 'Doktor'), say: T('I would like to see a doctor.', 'Saya ingin berjumpa doktor.'), kind: 'need', short: T('Doctor', 'Doktor') },
  nurse: { icon: 'nurse', label: T('Nurse', 'Jururawat'), say: T('I need a nurse.', 'Saya perlukan jururawat.'), kind: 'need', short: T('Nurse', 'Jururawat') },
  medicine: { icon: 'pill', label: T('Medicine', 'Ubat'), say: T('I need my medicine.', 'Saya perlukan ubat saya.'), kind: 'need', short: T('Medicine', 'Ubat') },
  thanks: { icon: 'happy', label: T('Thank you', 'Terima kasih'), say: T('Thank you.', 'Terima kasih.'), kind: 'reply', short: T('Thanks', 'Terima kasih') },
  reposition: { icon: 'turn', label: T('Reposition me', 'Ubah posisi'), say: T('Please help me change position.', 'Tolong ubah posisi saya.'), kind: 'need', short: T('Reposition', 'Ubah posisi') },
  cold: { icon: 'cold', label: T('Cold / blanket', 'Sejuk / selimut'), say: T('I feel cold. May I have a blanket?', 'Saya rasa sejuk. Boleh beri selimut?'), kind: 'need', short: T('Cold, blanket', 'Sejuk, selimut') },
  lights: { icon: 'light', label: T('Lights', 'Lampu'), say: T('Please change the lights.', 'Tolong tukar lampu.'), kind: 'need', short: T('Lights', 'Lampu') },
  suction: { icon: 'suction', label: T('Phlegm / suction', 'Kahak / sedut'), say: T('I have phlegm. I need suction.', 'Saya ada kahak. Saya perlu disedut.'), kind: 'need', short: T('Suction', 'Sedut kahak') },
  allergy: { icon: 'allergy', label: T('Allergy', 'Alahan'), say: T('I have an allergy.', 'Saya ada alahan.'), kind: 'symptom', short: T('Allergy', 'Alahan'), flow: 'allergy' },
  hungry: { icon: 'food', label: T('Hungry', 'Lapar'), say: T('I am hungry.', 'Saya lapar.'), kind: 'need', short: T('Hungry', 'Lapar') },
  rest: { icon: 'rest', label: T('Rest', 'Rehat'), say: T('I want to rest.', 'Saya mahu berehat.'), kind: 'need', short: T('Rest', 'Rehat') },
  scared: { icon: 'nervous', label: T('Scared', 'Takut'), say: T('I feel scared.', 'Saya rasa takut.'), kind: 'feeling', short: T('Scared', 'Takut') },
  frustrated: { icon: 'upset', label: T('Frustrated', 'Kecewa'), say: T('I feel frustrated.', 'Saya rasa kecewa.'), kind: 'feeling', short: T('Frustrated', 'Kecewa') },
  tired: { icon: 'sleepy', label: T('Tired', 'Penat'), say: T('I feel tired.', 'Saya rasa penat.'), kind: 'feeling', short: T('Tired', 'Penat') },
  lonely: { icon: 'alone', label: T('Lonely', 'Sunyi'), say: T('I feel lonely.', 'Saya rasa sunyi.'), kind: 'feeling', short: T('Lonely', 'Sunyi') },
  okay: { icon: 'ok', label: T('I am okay', 'Saya okey'), say: T('I am feeling okay.', 'Saya rasa okey.'), kind: 'feeling', short: T('Okay', 'Okey') },
  loved: { icon: 'love', label: T('Thank my family', 'Terima kasih keluarga'), say: T('Please tell my family I love them.', 'Tolong beritahu keluarga saya sayang mereka.'), kind: 'feeling', short: T('Message to family', 'Pesanan keluarga') },
  qdoctor: { icon: 'doctor', label: T('When is the doctor coming?', 'Bila doktor datang?'), say: T('When will the doctor come?', 'Bila doktor akan datang?'), kind: 'question', short: T('Asks: doctor when', 'Tanya: bila doktor') },
  qeat: { icon: 'food', label: T('Can I eat or drink?', 'Boleh saya makan/minum?'), say: T('Can I eat or drink now?', 'Boleh saya makan atau minum sekarang?'), kind: 'question', short: T('Asks: eat/drink', 'Tanya: makan/minum') },
  qhome: { icon: 'home', label: T('When can I go home?', 'Bila boleh balik?'), say: T('When can I go home?', 'Bila saya boleh balik?'), kind: 'question', short: T('Asks: go home', 'Tanya: balik') },
  qfamily: { icon: 'family', label: T('Can my family visit?', 'Keluarga boleh lawat?'), say: T('Can my family visit me?', 'Boleh keluarga saya melawat?'), kind: 'question', short: T('Asks: family visit', 'Tanya: lawatan') },
  qmed: { icon: 'pill', label: T('What is this medicine?', 'Ubat ini untuk apa?'), say: T('What is this medicine for?', 'Ubat ini untuk apa?'), kind: 'question', short: T('Asks: medicine', 'Tanya: ubat') },
  qtest: { icon: 'lab', label: T('Test results?', 'Keputusan ujian?'), say: T('Are my test results ready?', 'Keputusan ujian saya sudah siap?'), kind: 'question', short: T('Asks: results', 'Tanya: keputusan') },
} satisfies Record<string, CardDef>

export type CardKey = keyof typeof C
export const card = (k: CardKey): CardDef => C[k]
export const isCardKey = (k: string | undefined): k is CardKey => !!k && k in C

export type Quick = { k: string; tone?: 'yes' | 'no'; icon: IconName; label: Bi; say: Bi }
export const QUICK: Quick[] = [
  { k: 'yes', tone: 'yes', icon: 'check', label: T('Yes', 'Ya'), say: T('Yes.', 'Ya.') },
  { k: 'no', tone: 'no', icon: 'x', label: T('No', 'Tidak'), say: T('No.', 'Tidak.') },
  { k: 'ns', icon: 'q', label: T('Not sure', 'Tak pasti'), say: T('I am not sure.', 'Saya tidak pasti.') },
  { k: 'rep', icon: 'repeat', label: T('Please repeat', 'Sila ulang'), say: T('Please repeat that.', 'Sila ulang.') },
  { k: 'wait', icon: 'clock', label: T('Wait', 'Tunggu'), say: T('Please wait a moment.', 'Sila tunggu sebentar.') },
]

type ProfileDef = {
  tabs: { k: TabKey; label: Bi; icon: IconName }[]
  cards: Partial<Record<TabKey, CardKey[]>>
  ctx: [strong: string, rest: string]
  loc: [title: string, sub: string]
  where: string
  staffTitle: string
  staffBtn: string
  staffPrefix: string
  sumTitle: string
  switchToast: string
}
const HEALTH: CardKey[] = ['pain', 'symptoms', 'medicine', 'doctor', 'nurse', 'allergy', 'hungry', 'rest']
export const PROFILES: Record<Profile, ProfileDef> = {
  fd: {
    tabs: [
      { k: 'main', label: T('Front desk', 'Kaunter'), icon: 'grid' },
      { k: 'health', label: T('Health', 'Kesihatan'), icon: 'pulse' },
      { k: 'type', label: T('Type', 'Taip'), icon: 'kbd' },
      { k: 'draw', label: T('Draw', 'Lukis'), icon: 'pen' },
    ],
    cards: {
      main: ['opener', 'register', 'appointment', 'directions', 'pharmacy', 'pain', 'symptoms', 'water', 'toilet', 'help', 'thanks'],
      health: HEALTH,
    },
    ctx: ['Counter 3', 'Registration'],
    loc: ['Hospital Kuala Lumpur', 'Front desk · Counter 3'],
    where: 'Front desk · Counter 3',
    staffTitle: 'Visit summary',
    staffBtn: 'Staff view',
    staffPrefix: 'Counter 3 · ',
    sumTitle: 'AI visit summary',
    switchToast: 'Front desk profile: new visit started.',
  },
  bs: {
    tabs: [
      { k: 'main', label: T('Bedside', 'Katil'), icon: 'grid' },
      { k: 'health', label: T('Health', 'Kesihatan'), icon: 'pulse' },
      { k: 'feel', label: T('Feelings', 'Perasaan'), icon: 'heart' },
      { k: 'ask', label: T('Ask staff', 'Tanya staf'), icon: 'chat' },
      { k: 'type', label: T('Type', 'Taip'), icon: 'kbd' },
      { k: 'draw', label: T('Draw', 'Lukis'), icon: 'pen' },
    ],
    cards: {
      main: ['opener', 'water', 'toilet', 'pain', 'symptoms', 'reposition', 'cold', 'lights', 'suction', 'medicine', 'nurse', 'thanks'],
      health: HEALTH,
      feel: ['scared', 'frustrated', 'tired', 'lonely', 'okay', 'loved'],
      ask: ['qdoctor', 'qeat', 'qhome', 'qfamily', 'qmed', 'qtest'],
    },
    ctx: ['Wad 5B', 'Katil 12'],
    loc: ['Hospital Kuala Lumpur', 'Wad 5B · Katil 12 · Admitted 3 days'],
    where: 'Wad 5B · Katil 12',
    staffTitle: 'Shift handover',
    staffBtn: 'Handover',
    staffPrefix: 'Wad 5B · Katil 12 · ',
    sumTitle: 'AI handover summary',
    switchToast: 'Bedside profile: Wad 5B, Katil 12.',
  },
}

/**
 * One-tap staff replies, shown and spoken on the patient's board. `{n}` is filled from a number
 * the staff member types (queue number, counter, floor); `num` labels that field.
 */
export type ReplyPreset = { k: string; icon: IconName; text: Bi; num?: string; /** Minutes until the promised help is due. */ due?: number }
export const REPLIES: Record<Profile, ReplyPreset[]> = {
  bs: [
    { k: 'coming', icon: 'users', text: T('A nurse is coming now.', 'Jururawat sedang datang.'), due: 5 },
    { k: 'ten', icon: 'clock', text: T('I will come in 10 minutes.', 'Saya akan datang dalam 10 minit.'), due: 10 },
    { k: 'wait', icon: 'hourglass', text: T('Please wait a moment.', 'Sila tunggu sebentar.') },
    { k: 'doctor', icon: 'doctor', text: T('I will ask the doctor.', 'Saya akan tanya doktor.') },
    { k: 'notnow', icon: 'info', text: T('Not right now. I will explain soon.', 'Belum boleh sekarang. Saya akan terangkan nanti.') },
  ],
  fd: [
    { k: 'wait', icon: 'hourglass', text: T('Please wait to be called.', 'Sila tunggu sehingga dipanggil.') },
    { k: 'number', icon: 'clip', text: T('Your number is {n}.', 'Nombor anda {n}.'), num: 'Number' },
    { k: 'counter', icon: 'desk', text: T('Please go to counter {n}.', 'Sila ke kaunter {n}.'), num: 'Counter' },
    { k: 'left', icon: 'go-left', text: T('Go left.', 'Belok kiri.') },
    { k: 'right', icon: 'go-right', text: T('Go right.', 'Belok kanan.') },
    { k: 'straight', icon: 'go-up', text: T('Go straight ahead.', 'Jalan terus.') },
    { k: 'floor', icon: 'stairs', text: T('Go up to floor {n}.', 'Naik ke tingkat {n}.'), num: 'Floor' },
    { k: 'escort', icon: 'users', text: T('Someone will take you there.', 'Seseorang akan bawa anda ke sana.') },
  ],
}
/** Malay names for where a chip came from (the staff log keeps the English). */
export const SRC_BM: Record<string, string> = { Card: 'Kad', 'Body map': 'Peta badan', 'Guided steps': 'Langkah berpandu', 'Suggested row': 'Cadangan', 'Quick reply': 'Balas pantas', Typed: 'Ditaip', 'Staff question': 'Soalan staf', 'Pain check': 'Semakan sakit' }

export const fillReply = (p: ReplyPreset, n = ''): Bi => ({ en: p.text.en.replace('{n}', n), bm: p.text.bm.replace('{n}', n) })

export type StaffQuestion = { q: Bi; a: Bi[] }
const SINCE: Bi[] = [T('Since this morning', 'Sejak pagi tadi'), T('Since last night', 'Sejak semalam'), T('For a few days', 'Beberapa hari'), T('Just now', 'Baru sahaja'), T('Not sure', 'Tak pasti')]
export const STAFF_Q: Record<Profile, StaffQuestion[]> = {
  fd: [
    { q: T('Do you have an appointment?', 'Ada temu janji?'), a: [T('Yes, I do', 'Ya, ada'), T('No', 'Tiada'), T('I want to make one', 'Saya mahu buat temu janji'), T('Not sure', 'Tak pasti')] },
    { q: T('Since when has it hurt?', 'Sakit sejak bila?'), a: SINCE },
    { q: T('Any drug allergies?', 'Ada alahan ubat?'), a: [T('Yes', 'Ya'), T('No', 'Tiada'), T('Not sure', 'Tak pasti')] },
  ],
  bs: [
    { q: T('Since when has it hurt?', 'Sakit sejak bila?'), a: SINCE },
    { q: T('Have you eaten?', 'Dah makan?'), a: [T('Yes', 'Ya'), T('A little', 'Sedikit'), T('No', 'Belum'), T('Not hungry', 'Tak lapar')] },
    { q: T('Did you sleep well?', 'Tidur lena?'), a: [T('Yes', 'Ya'), T('Not really', 'Tidak berapa'), T('No, pain kept me up', 'Tidak, sakit mengganggu'), T('Not sure', 'Tak pasti')] },
  ],
}

/** `side`: limbs must say which side; the torso may (left chest pain matters); head and neck don't. */
export const PARTS = [
  { k: 'head', l: T('Head', 'Kepala'), side: 'none' },
  { k: 'neck', l: T('Neck', 'Leher'), side: 'none' },
  { k: 'chest', l: T('Chest', 'Dada'), side: 'optional' },
  { k: 'stomach', l: T('Stomach', 'Perut'), side: 'optional' },
  { k: 'upperback', l: T('Upper back', 'Belakang atas'), side: 'optional' },
  { k: 'lowerback', l: T('Lower back', 'Belakang bawah'), side: 'optional' },
  { k: 'arm', l: T('Arm', 'Lengan'), side: 'need' },
  { k: 'hand', l: T('Hand', 'Tangan'), side: 'need' },
  { k: 'leg', l: T('Leg', 'Kaki'), side: 'need' },
  { k: 'foot', l: T('Foot', 'Tapak kaki'), side: 'need' },
] as const
export type PartKey = (typeof PARTS)[number]['k']
export const PART = Object.fromEntries(PARTS.map(p => [p.k, p])) as Record<PartKey, (typeof PARTS)[number]>

/**
 * Optional second level under a part. `l` is the button; `say` is the place in the spoken
 * sentence, with {s} where the side word goes ("left " in English, " kiri" in Malay).
 */
type Sub = { k: string; l: Bi; say: Bi }
const S = (k: string, l: Bi, say: Bi): Sub => ({ k, l, say })
export const SUBS = {
  head: [
    S('top', T('Top of head', 'Ubun-ubun'), T('on the top of my head', 'ubun-ubun')),
    S('face', T('Face', 'Muka'), T('in my face', 'muka')),
    S('jaw', T('Jaw', 'Rahang'), T('in my jaw', 'rahang')),
    S('back', T('Back of head', 'Belakang kepala'), T('at the back of my head', 'belakang kepala')),
  ],
  neck: [
    S('front', T('Front of neck', 'Leher depan'), T('in the front of my neck', 'leher depan')),
    S('back', T('Back of neck', 'Tengkuk'), T('in the back of my neck', 'tengkuk')),
  ],
  chest: [],
  stomach: [
    S('upper', T('Upper abdomen', 'Perut atas'), T('in my {s}upper abdomen', 'perut atas{s}')),
    S('lower', T('Lower abdomen', 'Perut bawah'), T('in my {s}lower abdomen', 'perut bawah{s}')),
    S('groin', T('Groin', 'Pangkal paha'), T('in my {s}groin', 'pangkal paha{s}')),
  ],
  upperback: [],
  lowerback: [],
  arm: [
    S('shoulder', T('Shoulder', 'Bahu'), T('in my {s}shoulder', 'bahu{s}')),
    S('upperarm', T('Upper arm', 'Lengan atas'), T('in my {s}upper arm', 'lengan atas{s}')),
    S('elbow', T('Elbow', 'Siku'), T('in my {s}elbow', 'siku{s}')),
    S('forearm', T('Forearm', 'Lengan bawah'), T('in my {s}forearm', 'lengan bawah{s}')),
    S('wrist', T('Wrist', 'Pergelangan tangan'), T('in my {s}wrist', 'pergelangan tangan{s}')),
  ],
  hand: [
    S('palm', T('Palm', 'Tapak tangan'), T('in my {s}palm', 'tapak tangan{s}')),
    S('backofhand', T('Back of hand', 'Belakang tangan'), T('on the back of my {s}hand', 'belakang tangan{s}')),
    S('fingers', T('Fingers', 'Jari'), T('in my {s}fingers', 'jari tangan{s}')),
  ],
  leg: [
    S('hip', T('Hip / buttock', 'Pinggul / punggung'), T('in my {s}hip', 'pinggul{s}')),
    S('thigh', T('Thigh', 'Peha'), T('in my {s}thigh', 'peha{s}')),
    S('knee', T('Knee', 'Lutut'), T('in my {s}knee', 'lutut{s}')),
    S('shin', T('Shin', 'Tulang kering'), T('in my {s}shin', 'tulang kering{s}')),
    S('calf', T('Calf', 'Betis'), T('in my {s}calf', 'betis{s}')),
  ],
  foot: [
    S('ankle', T('Ankle', 'Buku lali'), T('in my {s}ankle', 'buku lali{s}')),
    S('heel', T('Heel', 'Tumit'), T('in my {s}heel', 'tumit{s}')),
    S('sole', T('Sole', 'Tapak'), T('in the sole of my {s}foot', 'tapak kaki{s}')),
    S('top', T('Top of foot', 'Atas kaki'), T('on the top of my {s}foot', 'atas kaki{s}')),
    S('toes', T('Toes', 'Jari kaki'), T('in my {s}toes', 'jari kaki{s}')),
  ],
} satisfies Record<PartKey, Sub[]>
export type SubKey = string
export const subOf = (part: PartKey, sub: SubKey | null) => (sub ? SUBS[part].find(s => s.k === sub) ?? null : null)

export const TYPES = [
  { k: 'sharp', l: T('Sharp', 'Tajam') },
  { k: 'dull', l: T('Dull', 'Tumpul') },
  { k: 'burning', l: T('Burning', 'Rasa terbakar') },
  { k: 'throbbing', l: T('Throbbing', 'Berdenyut') },
  { k: 'cramping', l: T('Cramping', 'Memulas') },
] as const
export type PainType = (typeof TYPES)[number]['k']
export const painType = (k: PainType) => TYPES.find(t => t.k === k)!.l

/** Symptom steps: `say` is the sentence fragment, `label` the button. */
export type SymOpt = { k: string; say: Bi; label: Bi }
export const SYM_WHAT: SymOpt[] = [
  { k: 'fever', say: T('a fever', 'demam'), label: T('Fever', 'Demam') },
  { k: 'dizzy', say: T('dizziness', 'pening'), label: T('Dizzy', 'Pening') },
  { k: 'breath', say: T('shortness of breath', 'sesak nafas'), label: T('Short of breath', 'Sesak nafas') },
  { k: 'headache', say: T('a headache', 'sakit kepala'), label: T('Headache', 'Sakit kepala') },
  { k: 'vomit', say: T('vomiting', 'muntah'), label: T('Vomiting', 'Muntah') },
  { k: 'cough', say: T('a cough', 'batuk'), label: T('Cough', 'Batuk') },
  { k: 'chills', say: T('chills', 'rasa sejuk'), label: T('Chills', 'Rasa sejuk') },
  { k: 'allergy', say: T('an allergic reaction', 'alahan'), label: T('Allergy', 'Alahan') },
]
export const SYM_WHEN: SymOpt[] = [
  { k: 'morning', say: T('since this morning', 'sejak pagi tadi'), label: T('This morning', 'Pagi tadi') },
  { k: 'night', say: T('since last night', 'sejak semalam'), label: T('Last night', 'Semalam') },
  { k: 'days', say: T('for a few days', 'sejak beberapa hari'), label: T('A few days', 'Beberapa hari') },
  { k: 'now', say: T('starting just now', 'baru sahaja'), label: T('Just now', 'Baru sahaja') },
]
export const SYM_HOW: SymOpt[] = [
  { k: 'little', say: T('A little.', 'Sedikit sahaja.'), label: T('A little', 'Sedikit') },
  { k: 'very', say: T('Very much.', 'Sangat kuat.'), label: T('Very much', 'Sangat') },
]

export const DICT = ['water', 'toilet', 'pain', 'please', 'nurse', 'doctor', 'medicine', 'stomach', 'headache', 'help', 'thank you', 'tired', 'cold', 'blanket', 'home', 'family', 'appointment', 'register', 'pharmacy', 'hurts', 'since', 'yesterday', 'morning', 'night', 'saya', 'sakit', 'tolong', 'air', 'tandas', 'ubat', 'doktor', 'jururawat', 'perut', 'kepala', 'terima kasih', 'sejuk', 'selimut', 'keluarga', 'balik']

export const NEXT: Partial<Record<CardKey, CardKey[]>> = { pain: ['medicine', 'nurse', 'doctor'], water: ['toilet', 'thanks'], register: ['appointment', 'directions'], appointment: ['directions', 'pharmacy'], toilet: ['nurse', 'thanks'], reposition: ['cold', 'rest'], scared: ['nurse', 'qfamily'], medicine: ['water', 'thanks'], symptoms: ['doctor', 'medicine'] }

/* Colour group per card / message kind */
const CARE = new Set<string>(['reposition', 'cold', 'lights', 'suction', 'rest'])
const KIND_CAT: Partial<Record<Kind, Cat>> = { pain: 'health', symptom: 'health', request: 'desk', feeling: 'feel', question: 'ask', need: 'need', reply: 'social', answer: 'social', alert: 'sos' }
/** The colour key shown above the cards: one colour = one kind of message, everywhere. */
export const CAT_LABEL: Partial<Record<Cat, Bi>> = {
  desk: T('Services', 'Perkhidmatan'), need: T('Needs', 'Keperluan'), care: T('Comfort', 'Keselesaan'),
  health: T('Health', 'Kesihatan'), feel: T('Feelings', 'Perasaan'), ask: T('Questions', 'Soalan'), social: T('Social', 'Sosial'),
}
export const kindCat = (kind: Kind): Cat => KIND_CAT[kind] ?? 'base'
export const catOf = (k: CardKey): Cat => {
  const c = card(k)
  if ('action' in c) return 'health'
  if (CARE.has(k)) return 'care'
  return kindCat(c.kind)
}
export const TAB_CAT: Partial<Record<TabKey, Cat>> = { health: 'health', feel: 'feel', ask: 'ask' }

/** One category order on every board, so each colour always sits in the same band. */
const CAT_ORDER: Cat[] = ['desk', 'need', 'care', 'health', 'feel', 'ask', 'social']
const rank = (k: CardKey) => (k === 'opener' ? -1 : CAT_ORDER.indexOf(catOf(k)))
/** Cards on a tab, opener first, then grouped by category (stable within a group). Type and Draw have none. */
export const tabCards = (profile: Profile, tab: TabKey): CardKey[] => [...(PROFILES[profile].cards[tab] ?? [])].sort((a, b) => rank(a) - rank(b))
