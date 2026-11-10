import type { Bi, Cat, IconName, Kind } from './types.ts'
import { symSay, symShort } from './text.ts'
import { C, SYM_HOW, SYM_WHAT, SYM_WHEN, type CardKey, type FlowKey } from './vocab.ts'

/*
 * Guided-step windows. Each answered step adds one sentence, so the clerk or nurse hears the whole
 * request at once instead of pulling it out with yes/no questions. Clinic and place lists are typical
 * for a Malaysian government hospital; check them against the real site.
 */
const T = (en: string, bm: string): Bi => ({ en, bm })

export type FlowOpt = { k: string; label: Bi; say: Bi; icon?: IconName }
type StepBase = { k: string; title: Bi; optional?: boolean; show?: (d: Draft) => boolean }
export type FlowStep = StepBase & ({ opts: FlowOpt[] } | { number: { say: Bi; hint: string } })
export type Draft = Record<string, string | undefined>
export type Flow = {
  card: CardKey
  title: Bi
  /** One line under the title, in the patient's language. */
  hint: Bi
  icon: IconName
  cat: Cat
  kind: Kind
  /** Said before the step sentences. */
  opener?: Bi
  steps: FlowStep[]
  /** Front-desk flows open the "show to clerk" view after saving. */
  clerk?: boolean
  say?: (d: Draft) => Bi
  short?: (d: Draft) => Bi
  /** Answers that may need help at once; the window then offers the Emergency button. */
  danger?: (d: Draft) => boolean
  done: Bi
}

const o = (k: string, label: Bi, say: Bi, icon?: IconName): FlowOpt => ({ k, label, say, icon })
const clinic = (k: string, en: string, bm: string, icon?: IconName) => o(k, T(en, bm), T(`It is for the ${en} clinic.`, `Untuk Klinik ${bm}.`), icon)
const place = (k: string, icon: IconName, label: Bi, say?: Bi) => o(k, label, say ?? T(`Where is the ${label.en.toLowerCase()}?`, `Di mana ${label.bm.toLowerCase()}?`), icon)

const ALLERGENS: FlowOpt[] = [
  o('penicillin', T('Penicillin or antibiotic', 'Penisilin atau antibiotik'), T('I am allergic to penicillin or an antibiotic.', 'Saya alah kepada penisilin atau antibiotik.'), 'pill'),
  o('painkiller', T('Painkiller (aspirin, NSAIDs)', 'Ubat tahan sakit (aspirin, NSAID)'), T('I am allergic to a painkiller such as aspirin.', 'Saya alah kepada ubat tahan sakit seperti aspirin.'), 'pill'),
  o('medicine', T('Other medicine', 'Ubat lain'), T('I am allergic to a medicine.', 'Saya alah kepada sejenis ubat.'), 'pill'),
  o('seafood', T('Seafood', 'Makanan laut'), T('I am allergic to seafood.', 'Saya alah kepada makanan laut.'), 'food'),
  o('nuts', T('Nuts', 'Kacang'), T('I am allergic to nuts.', 'Saya alah kepada kacang.'), 'food'),
  o('food', T('Other food', 'Makanan lain'), T('I am allergic to a food.', 'Saya alah kepada sejenis makanan.'), 'food'),
  o('sting', T('Insect sting', 'Sengatan serangga'), T('I am allergic to insect stings.', 'Saya alah kepada sengatan serangga.')),
  o('latex', T('Latex or plaster', 'Lateks atau plaster'), T('I am allergic to latex or plaster.', 'Saya alah kepada lateks atau plaster.')),
  o('written', T('I have the name written down', 'Nama ada ditulis'), T('I have the name of what I am allergic to written down.', 'Saya ada catatan nama bahan yang saya alah.'), 'clip'),
  o('unsure', T('Not sure', 'Tak pasti'), T('I am not sure what I am allergic to.', 'Saya tidak pasti apa yang saya alah.')),
]
// ponytail: one sign per report (the worst one); multi-select steps if staff need the full picture.
const SIGNS: FlowOpt[] = [
  o('rash', T('Rash or itchy', 'Ruam atau gatal'), T('I have a rash and feel itchy.', 'Saya ada ruam dan rasa gatal.')),
  o('swell', T('Lips, face or eyes swelling', 'Bibir, muka atau mata bengkak'), T('My lips, face or eyes are swelling.', 'Bibir, muka atau mata saya bengkak.')),
  o('breath', T('Hard to breathe', 'Susah bernafas'), T('It is hard to breathe.', 'Saya susah bernafas.')),
  o('throat', T('Throat feels tight', 'Tekak rasa ketat'), T('My throat feels tight.', 'Tekak saya rasa ketat.')),
  o('faint', T('Dizzy or faint', 'Pening atau nak pitam'), T('I feel dizzy or faint.', 'Saya rasa pening atau nak pitam.')),
  o('stomach', T('Vomiting or stomach pain', 'Muntah atau sakit perut'), T('I am vomiting or have stomach pain.', 'Saya muntah atau sakit perut.')),
]
const USUAL = SIGNS.map(s => o(s.k, s.label, T(`My usual reaction: ${s.label.en.toLowerCase()}.`, `Reaksi biasa saya: ${s.label.bm.toLowerCase()}.`)))
/** Signs of a severe reaction (anaphylaxis): airway, breathing, face swelling. */
const DANGER = new Set(['breath', 'throat', 'swell'])
const labelOf = (opts: FlowOpt[], k?: string) => opts.find(x => x.k === k)?.label

export const FLOWS: Record<FlowKey, Flow> = {
  register: {
    card: 'register', title: T('Register', 'Daftar'), hint: T('Answer what the counter will ask.', 'Jawab apa yang kaunter akan tanya.'), icon: 'register', cat: 'desk', kind: 'request',
    opener: C.register.say, clerk: true, done: T('Registration details added.', 'Butiran pendaftaran ditambah.'),
    steps: [
      { k: 'visit', title: T('Is this your first visit?', 'Lawatan pertama?'), opts: [
        o('first', T('First visit', 'Lawatan pertama'), T('This is my first visit.', 'Ini lawatan pertama saya.')),
        o('before', T('Been here before', 'Pernah datang'), T('I have been here before.', 'Saya pernah datang ke sini.')),
        o('referred', T('Referred, with a letter', 'Dirujuk, ada surat'), T('I was referred and I have a letter.', 'Saya dirujuk dan ada surat rujukan.')),
        o('follow', T('Follow-up', 'Rawatan susulan'), T('I am here for a follow-up.', 'Saya datang untuk rawatan susulan.')),
      ] },
      { k: 'id', title: T('Which ID do you have?', 'ID apa yang anda bawa?'), opts: [
        o('ic', T('MyKad (IC)', 'MyKad (IC)'), T('I have my IC with me.', 'Saya bawa kad pengenalan.'), 'id'),
        o('passport', T('Passport', 'Pasport'), T('I have my passport.', 'Saya bawa pasport.'), 'id'),
        o('none', T('No ID with me', 'Tiada ID'), T('I do not have my ID with me.', 'Saya tidak bawa kad pengenalan.')),
      ] },
      { k: 'why', title: T('Why are you here?', 'Kenapa datang?'), optional: true, opts: [
        o('pain', T('Pain', 'Sakit'), T('I am in pain.', 'Saya sakit.'), 'pain'),
        o('unwell', T('Feeling unwell', 'Kurang sihat'), T('I feel unwell.', 'Saya rasa kurang sihat.'), 'therm'),
        o('injury', T('Injury', 'Cedera'), T('I have an injury.', 'Saya cedera.')),
        o('test', T('Test or scan', 'Ujian atau imbasan'), T('I am here for a test or scan.', 'Saya datang untuk ujian atau imbasan.'), 'lab'),
        o('meds', T('Collect medicine', 'Ambil ubat'), T('I am here to collect medicine.', 'Saya datang untuk ambil ubat.'), 'pill'),
      ] },
      { k: 'with', title: T('Who is with you?', 'Siapa bersama anda?'), optional: true, opts: [
        o('alone', T('I came alone', 'Datang seorang'), T('I came alone.', 'Saya datang seorang diri.'), 'user'),
        o('family', T('Family is with me', 'Keluarga ada'), T('A family member is with me.', 'Ahli keluarga saya ada bersama.'), 'family'),
      ] },
    ],
  },
  appointment: {
    card: 'appointment', title: T('Appointment', 'Temu janji'), hint: T('Tell the counter what you need.', 'Beritahu kaunter apa yang anda perlukan.'), icon: 'cal', cat: 'desk', kind: 'request',
    clerk: true, done: T('Appointment details added.', 'Butiran temu janji ditambah.'),
    steps: [
      { k: 'need', title: T('What do you need?', 'Apa yang anda perlukan?'), opts: [
        o('today', T('I have one today', 'Ada hari ini'), T('I have an appointment today.', 'Saya ada temu janji hari ini.'), 'cal'),
        o('new', T('Make a new one', 'Buat baru'), T('I would like to make an appointment.', 'Saya ingin membuat temu janji.')),
        o('change', T('Change it', 'Tukar tarikh'), T('I would like to change my appointment.', 'Saya ingin menukar temu janji saya.')),
        o('missed', T('I missed it', 'Terlepas'), T('I missed my appointment.', 'Saya terlepas temu janji saya.')),
      ] },
      { k: 'clinic', title: T('Which clinic?', 'Klinik mana?'), opts: [
        clinic('medical', 'Medical', 'Perubatan'), clinic('surgical', 'Surgical', 'Surgeri'), clinic('ortho', 'Orthopaedic', 'Ortopedik'),
        clinic('eye', 'Eye', 'Mata'), clinic('ent', 'ENT', 'ENT'), clinic('dental', 'Dental', 'Pergigian'),
        o('physio', T('Physiotherapy', 'Fisioterapi'), T('It is for physiotherapy.', 'Untuk fisioterapi.')),
        clinic('og', 'O&G', 'O&G'), clinic('child', 'Children\'s', 'Pediatrik'),
        o('blood', T('Blood test', 'Ujian darah'), T('It is for a blood test.', 'Untuk ujian darah.'), 'lab'),
        o('xray', T('X-ray or scan', 'X-ray atau imbasan'), T('It is for an X-ray or scan.', 'Untuk X-ray atau imbasan.'), 'xray'),
        o('unsure', T('Not sure', 'Tak pasti'), T('I am not sure which clinic.', 'Saya tidak pasti klinik mana.')),
      ] },
      { k: 'when', title: T('When is it?', 'Bila?'), optional: true, show: d => d.need === 'today' || d.need === 'change', opts: [
        o('am', T('This morning', 'Pagi ini'), T('It is this morning.', 'Pada pagi ini.')),
        o('pm', T('This afternoon', 'Petang ini'), T('It is this afternoon.', 'Pada petang ini.')),
        o('card', T('I have my card', 'Ada kad temu janji'), T('Here is my appointment card.', 'Ini kad temu janji saya.'), 'cal'),
      ] },
    ],
  },
  directions: {
    card: 'directions', title: T('Directions', 'Arah'), hint: T('Choose where you want to go.', 'Pilih tempat yang ingin dituju.'), icon: 'directions', cat: 'desk', kind: 'request',
    clerk: true, done: T('Question added.', 'Soalan ditambah.'),
    steps: [
      { k: 'to', title: T('Where do you want to go?', 'Ke mana?'), opts: [
        place('toilet', 'toilet', T('Toilet', 'Tandas')),
        place('pharmacy', 'pharmacy', T('Pharmacy', 'Farmasi')),
        place('blood', 'lab', T('Blood test', 'Ujian darah'), T('Where do I go for a blood test?', 'Di mana tempat ujian darah?')),
        place('xray', 'xray', T('X-ray', 'X-ray'), T('Where is X-ray?', 'Di mana bahagian X-ray?')),
        place('ed', 'alert', T('Emergency department', 'Jabatan Kecemasan')),
        place('clinic', 'doctor', T('My clinic', 'Klinik saya'), T('Where is my clinic?', 'Di mana klinik saya?')),
        place('pay', 'money', T('Payment counter', 'Kaunter bayaran')),
        place('surau', 'pray', T('Prayer room', 'Surau')),
        place('cafe', 'food', T('Cafeteria', 'Kafeteria')),
        place('lift', 'lift', T('Lift', 'Lif')),
        place('exit', 'exit', T('Exit', 'Pintu keluar')),
        place('park', 'car', T('Car park', 'Tempat letak kereta')),
      ] },
    ],
  },
  pharmacy: {
    card: 'pharmacy', title: T('Pharmacy', 'Farmasi'), hint: T('Tell the counter what you need.', 'Beritahu kaunter apa yang anda perlukan.'), icon: 'pharmacy', cat: 'desk', kind: 'request',
    clerk: true, done: T('Pharmacy request added.', 'Permintaan farmasi ditambah.'),
    steps: [
      { k: 'need', title: T('What do you need?', 'Apa yang anda perlukan?'), opts: [
        o('collect', T('Collect my medicine', 'Ambil ubat'), T('I would like to collect my medicine.', 'Saya ingin mengambil ubat saya.'), 'pill'),
        o('new', T('New prescription', 'Preskripsi baru'), T('I have a new prescription.', 'Saya ada preskripsi baru.'), 'clip'),
        o('ready', T('Is it ready?', 'Sudah siap?'), T('Is my medicine ready?', 'Ubat saya sudah siap?'), 'hourglass'),
        o('out', T('I ran out', 'Ubat habis'), T('I have run out of my medicine.', 'Ubat saya sudah habis.')),
        o('ask', T('A question', 'Ada soalan'), T('I have a question about my medicine.', 'Saya ada soalan tentang ubat saya.'), 'q'),
        o('where', T('Where is it?', 'Di mana farmasi?'), T('Where is the pharmacy?', 'Di mana farmasi?'), 'directions'),
      ] },
      { k: 'num', title: T('Your queue number', 'Nombor giliran'), optional: true, show: d => ['collect', 'new', 'ready'].includes(d.need ?? ''),
        number: { say: T('My queue number is {n}.', 'Nombor giliran saya {n}.'), hint: 'e.g. 2041' } },
    ],
  },
  sym: {
    card: 'symptoms', title: T('Tell us how you feel', 'Beritahu simptom anda'), hint: T('Three quick taps.', 'Tiga sentuhan pantas.'), icon: 'therm', cat: 'health', kind: 'symptom',
    done: T('Symptom added to your message.', 'Simptom ditambah ke mesej anda.'),
    steps: [
      { k: 'what', title: T('What is it?', 'Apa simptomnya?'), opts: SYM_WHAT },
      { k: 'when', title: T('Since when?', 'Sejak bila?'), opts: SYM_WHEN },
      { k: 'how', title: T('How much?', 'Berapa teruk?'), optional: true, opts: SYM_HOW },
    ],
    say: d => symSay({ what: d.what ?? null, when: d.when ?? null, how: d.how ?? null }),
    short: d => symShort({ what: d.what ?? null, when: d.when ?? null, how: d.how ?? null }),
  },
  allergy: {
    card: 'allergy', title: T('Allergy', 'Alahan'), hint: T('Tell staff what is happening.', 'Beritahu staf apa yang berlaku.'), icon: 'allergy', cat: 'health', kind: 'symptom',
    done: T('Allergy added to your message.', 'Alahan ditambah ke mesej anda.'),
    steps: [
      { k: 'now', title: T('What is happening?', 'Apa yang berlaku?'), opts: [
        o('now', T('A reaction right now', 'Alahan sekarang'), T('I am having an allergic reaction now.', 'Saya sedang mengalami alahan sekarang.'), 'alert'),
        o('known', T('Telling you about an allergy I have', 'Maklumkan alahan saya'), T('I want you to know I have an allergy.', 'Saya ingin maklumkan saya ada alahan.'), 'info'),
      ] },
      { k: 'to', title: T('What are you allergic to?', 'Alah kepada apa?'), opts: ALLERGENS },
      { k: 'sign', title: T('What is happening to you now?', 'Apa yang anda rasa sekarang?'), show: d => d.now === 'now', opts: SIGNS },
      { k: 'since', title: T('Since when?', 'Sejak bila?'), optional: true, show: d => d.now === 'now', opts: [
        o('just', T('Just now', 'Baru sahaja'), T('It started just now.', 'Ia baru sahaja bermula.')),
        o('hour', T('Within the hour', 'Dalam sejam'), T('It started within the last hour.', 'Ia bermula dalam sejam yang lalu.')),
        o('today', T('Earlier today', 'Awal hari ini'), T('It started earlier today.', 'Ia bermula awal hari ini.')),
      ] },
      { k: 'usual', title: T('What usually happens?', 'Apa yang biasanya berlaku?'), optional: true, show: d => d.now === 'known', opts: USUAL },
    ],
    danger: d => d.now === 'now' && DANGER.has(d.sign ?? ''),
    short: d => {
      const now = d.now === 'now'
      const parts = [labelOf(ALLERGENS, d.to), labelOf(SIGNS, now ? d.sign : d.usual)].filter(Boolean) as Bi[]
      return { en: `Allergy${now ? ' now' : ''}: ${parts.map(p => p.en).join(', ')}`, bm: `Alahan${now ? ' sekarang' : ''}: ${parts.map(p => p.bm).join(', ')}` }
    },
  },
}

export const visibleSteps = (f: Flow, d: Draft) => f.steps.filter(s => !s.show || s.show(d))

/** The sentence once every required step is answered, or the first step still missing. */
export function flowResult(f: Flow, d: Draft): { ok: true; say: Bi; short: Bi } | { ok: false; missing: FlowStep } {
  const steps = visibleSteps(f, d)
  const missing = steps.find(s => !s.optional && !d[s.k])
  if (missing) return { ok: false, missing }
  const parts: Bi[] = f.opener ? [f.opener] : []
  const labels: Bi[] = []
  for (const s of steps) {
    const v = d[s.k]
    if (!v) continue
    if ('number' in s) {
      parts.push(T(s.number.say.en.replace('{n}', v), s.number.say.bm.replace('{n}', v)))
      labels.push(T('#' + v, '#' + v))
    } else {
      const opt = s.opts.find(x => x.k === v)!
      parts.push(opt.say)
      labels.push(opt.label)
    }
  }
  const name = C[f.card].label
  return {
    ok: true,
    say: f.say?.(d) ?? { en: parts.map(p => p.en).join(' '), bm: parts.map(p => p.bm).join(' ') },
    short: f.short?.(d) ?? { en: `${name.en}: ${labels.slice(0, 2).map(l => l.en).join(', ')}`, bm: `${name.bm}: ${labels.slice(0, 2).map(l => l.bm).join(', ')}` },
  }
}
