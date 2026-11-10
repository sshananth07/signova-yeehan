# 01: Instant dialogs, staff voice and the assistant

> For whoever implements this: work task by task and tick each step off in this file. Phase 1 is frontend only and can ship on its own. Phase 2 needs the backend from [00-backend-foundation.md](00-backend-foundation.md): NestJS, Cloud Firestore, Firebase Auth. Its `assistant` and `forms` modules are reserved slots in that plan's scaffold. Auth, visits, events and sync come from 00 and aren't redefined here.

**Goal:** anything the patient taps or types, or the staff member says into the tablet, that calls for a form opens that form **instantly**. New guided dialogs cover **Register**, **Appointment** and **Directions**, beside the existing Pain map and Symptoms. Staff can trigger any of them by voice, and an AI assistant (any provider, chosen later) can open them and prefill fields. Only the patient can submit.

**Architecture:**
- **Action registry** (`frontend/src/actions/`): one definition per action, holding its name, its prefill schema, the form it opens, and the sentence it produces.
- **Dispatcher:** every trigger source sends the same `BoardEvent`s to one dispatcher. The sources are card taps, the local keyword router, the staff speech transcript, and later the assistant stream.
- **Store and host:** the dispatcher updates `dialog` in the store, and a single `DialogHost` renders the form from its spec.
- **Assistant (phase 2):** a backend endpoint streams the same events. It runs through a provider adapter, so the AI provider is plug and play and no provider SDK ever reaches the frontend.

**Tech stack:** existing frontend (React 19, TypeScript, Zustand, Tailwind v4, Vite) plus `zod` for argument validation and JSON Schema generation. Speech-to-text uses the browser's `SpeechRecognition` behind a small interface, so a server-side engine can replace it later. Backend (phase 2): the NestJS API from plan 00 (`backend/api/src/assistant`, `backend/api/src/forms`). Schemas live in `shared/contracts`, so the `BoardEvent` and form shapes are shared with the frontend.

**Same tablet:** staff speak into the patient's tablet, using the existing "Staff: ask by voice" button. There is no device pairing. The tablet calls the backend directly and reads the streamed response.

## Global constraints
- **Instant open:** no network call sits on the path that opens a dialog. Card taps open it synchronously. The keyword router runs on-device, on typed text and on live (partial) speech transcripts. The assistant only **refines** a dialog that is already open, or opens one when the router missed. Dialog code is bundled eagerly, not lazy-loaded, except the 3D body, which is already preloaded.
- **Only the patient submits:** staff speech and the assistant can open, prefill and close dialogs. Nothing is ever saved, spoken as the patient's message or logged as a submission without the patient's tap.
- **Never invent values:** prefills come only from what was actually said or typed. Missing values stay empty, and the form asks for them.
- **The patient's input wins:** a field the patient has touched is never overwritten by a later prefill.
- **Never interrupt a form in progress:** if the patient has touched any field in the open dialog, an incoming open request becomes a toast ("Staff wants to open Appointment · Open / Not now") instead of replacing the dialog.
- **Emergency stays above everything:** the alarm overlays any dialog, and the dialog's state survives the alarm.
- **Personal details:** registration stores the patient's **name**, **IC/passport number** and optional **phone**.
  - These fields are marked `private`. They appear in the dialog and the staff view only. They are never shown on the board's header, footer, message bar or chips, which keep using the counter or bed number.
  - They are never spoken aloud and never sent to the assistant, either in context or in tool results.
  - The assistant may *propose* a name it heard from staff speech, but submitted personal values never go back to it.
- **Bilingual:** every label, option and generated sentence has English and Malay, following `Bi` in `src/lib/types.ts`.
- **Look and feel:** reuse `Step`, `optBase`/`optIdle`/`optOn`, `btnPrimary`/`btnAlt`, `Sheet`, `SheetTitle` and `Todo` from `src/components/ui.tsx`. Add no UI library. Dialogs keep the existing guided-step pattern: numbered steps that tick off, and a preview of the sentence in the footer.
- **Provider neutral:** tool definitions are generated from the registry as plain JSON Schema. The frontend never imports an AI SDK, and the provider is chosen by backend config.

## Review focus
- **Staff says "please register" while the patient is halfway through the pain map:** a toast offers Register, and the pain map and its draft are untouched. Tested in Task 1.2.
- **The patient picks "Returning", then a late prefill says `visit_type: "new"`:** "Returning" stays. Tested in Task 1.2.
- **The same event arrives twice (same `id`):** one dialog, opened once. Tested in Task 1.2.
- **An unknown action name, or arguments that fail the schema:** ignored and logged; no dialog flashes open. Tested in Tasks 1.2 and 2.3.
- **Streamed arguments cut off mid-field:** that field is left empty, not half-filled. Tested in Task 2.4.
- **The patient types "where is the pharmacy" on the Type tab:** a chip suggests "Open Directions?" and nothing opens by itself, so typing is never hijacked. Staff speech *does* open dialogs. Tested in Task 1.8.
- **Staff say "the pharmacy is closed":** this must not open Directions. The router needs intent phrases, not single keywords. Tested in Task 1.8.
- **The IC number appears in no request to the assistant:** the context builder's output is asserted in a test. Tested in Task 2.3.
- **The patient's name never appears on the board:** only in the Register dialog and the staff view. Tested in Task 1.10.
- **Language switched mid-form:** values are kept and labels change. Tested in Task 1.3.
- **Emergency pressed with Register open:** the alarm shows, and after acknowledging, the form is still filled in. Tested in Task 1.2.

## Commands
- Tests: `cd frontend && npm test` (Node's built-in test runner; tests import with `.ts` extensions).
- Types: `cd frontend && npx tsc --noEmit`
- Build: `cd frontend && npm run build`

---

## Phase 1: frontend (no backend needed)

### Task 1.1: Action registry and event types

**Files:**
- Create: `frontend/src/actions/types.ts`, `frontend/src/actions/registry.ts`
- Modify: `frontend/package.json` (add `zod`; widen the `test` script to `node --test src/lib/*.test.ts src/actions/*.test.ts`)
- Test: `frontend/src/actions/registry.test.ts`

**Interfaces:**
- Produces:

```ts
export type DialogKind = 'register' | 'appointment' | 'directions' | 'pain' | 'symptoms'
export type Source = 'patient' | 'staff' | 'assistant'

/** Every trigger source speaks this. Phase 2's stream uses the same shapes. */
export type BoardEvent =
  | { type: 'dialog.open'; id: string; kind: DialogKind; source: Source; prefill?: Record<string, unknown> }
  | { type: 'dialog.patch'; id: string; prefill: Record<string, unknown> } // incremental prefill for an open dialog
  | { type: 'dialog.close'; id: string }
  | { type: 'ask.open'; id: string; source: Source; question: Bi; answers: Bi[] } // replaces today's simulated staff question

type Option = { k: string; l: Bi }
export type Field =
  | { key: string; kind: 'choice'; label: Bi; options: Option[]; optional?: boolean; showIf?: (v: Values) => boolean }
  | { key: string; kind: 'date'; label: Bi; optional?: boolean; showIf?: (v: Values) => boolean }
  | { key: string; kind: 'text'; label: Bi; optional?: boolean; private?: boolean; inputMode?: 'text' | 'numeric' | 'tel'; showIf?: (v: Values) => boolean }
export type FormSpec = { title: Bi; sub: Bi; icon: IconName; steps: { title: Bi; fields: Field[] }[] }

export type ActionDef<S extends z.ZodObject> = {
  name: string            // tool name, e.g. "open_registration"
  kind: DialogKind
  description: string     // what the assistant reads: when to call it, what never to fill
  prefill: S              // every key optional; validated before any field is filled
  form?: FormSpec         // absent for pain/symptoms, which keep their own components
  toSentence: (v: Values) => Bi       // spoken and added as a chip on submit; never includes private fields
  toStaffSummary: (v: Values) => string // staff log; may include private fields
}
export function defineAction<S extends z.ZodObject>(def: ActionDef<S>): ActionDef<S>
export function actionFor(kind: DialogKind): ActionDef<z.ZodObject>
/** Provider-neutral tool list for phase 2: name, description, JSON Schema (z.toJSONSchema), sorted by name. */
export function toolDefinitions(): { name: string; description: string; parameters: object }[]
```

- [ ] **Step 1: Write the failing tests**

```ts
it("refuses two actions with the same name", ...);
it("toolDefinitions is sorted and stable between calls", ...); // stable order keeps provider prompt caches warm
it("no tool parameter schema contains a private field", ...);   // the assistant can't even ask for an IC number
```

- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(actions): action registry and board event types`

### Task 1.2: Dispatcher and dialog state

**Files:**
- Create: `frontend/src/actions/dispatch.ts`
- Modify: `frontend/src/store.ts` (replace `modal: 'pain' | 'sym' | null` with `dialog`; `addCard` dispatches instead of setting `modal`), `frontend/src/App.tsx` (Escape closes `dialog`)
- Test: `frontend/src/actions/dispatch.test.ts`

**Interfaces:**
- Produces:

```ts
type DialogState = {
  id: string; kind: DialogKind; source: Source
  values: Record<string, unknown>  // current form values
  suggested: Set<string>           // keys filled by staff/assistant and not yet confirmed by the patient
  touched: Set<string>             // keys the patient changed: never overwritten
}
// store
dialog: DialogState | null
pendingOpen: BoardEvent & { type: 'dialog.open' } | null // shown as the "Staff wants to open…" toast
dispatch: (e: BoardEvent) => void
```

- Rules, kept in a pure reducer `reduce(state, event)` so they can be tested without React:
  - `dialog.open`:
    - When no dialog is open, or the open one has no touched fields: open it with the validated prefill.
    - When the open dialog has touched fields: set `pendingOpen` instead.
    - The same `kind` already open counts as a `dialog.patch`.
  - `dialog.patch`:
    - Validate each key on its own with `prefill.shape[key].safeParse`, and drop invalid keys.
    - Never write a key in `touched`.
    - Ignore a patch whose `id` doesn't match the open dialog.
  - Duplicate events, with the same `id` and `type` within one dialog's life, are ignored.
  - Unknown kinds or actions: ignore them and `console.warn` once.

- [ ] **Step 1: Write the failing tests**: one per Review focus bullet marked Task 1.2, plus:

```ts
it("a patch only fills untouched keys and marks them suggested", ...);
it("patient editing a suggested field removes it from suggested and adds it to touched", ...);
it("emergency does not clear the dialog", ...); // alarm state is separate from dialog state
```

- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(actions): dispatcher with touched-field protection`

### Task 1.3: Form renderer and DialogHost

**Files:**
- Create: `frontend/src/components/dialogs/GuidedForm.tsx`, `frontend/src/components/dialogs/DialogHost.tsx`
- Modify: `frontend/src/components/Modals.tsx`, `frontend/src/App.tsx` (render `<DialogHost/>` in place of the two modal conditionals)
- Test: manual check in the browser (below) plus `npx tsc --noEmit`

**Interfaces:**
- Consumes: `FormSpec`, `DialogState`, the UI building blocks in `ui.tsx`.
- Produces:
  - `GuidedForm` renders any `FormSpec` inside `Sheet`:
    - one numbered `Step` per step, ticked when its required visible fields are filled;
    - a `choice` field is a row of option buttons (`optBase`); a `date` field is a native `<input type="date">`; a `text` field is a large input styled like the Type tab's textarea;
    - the footer shows the `toSentence` preview and **Cancel / Confirm and save**.
  - A small "Suggested by staff" tag sits on every field in `suggested`. Tapping the field, or any value in it, confirms it.
  - `private` fields show a lock icon and the note "Only staff will see this".
  - `DialogHost` picks `PainModal`, `SymptomModal` or `GuidedForm` by `dialog.kind`.
  - `PainModal` and `SymptomModal` are unchanged inside; they read the open state from `dialog`.

- [ ] **Step 1: Implement**
- [ ] **Step 2: Check in the browser:** switch EN to BM mid-form (values stay); press Emergency, then acknowledge (form intact); press Escape (closes).
- [ ] **Step 3: Commit:** `feat(dialogs): spec-driven guided form and dialog host`

### Task 1.4: Register dialog

**Files:**
- Create: `frontend/src/actions/register.ts`
- Test: `frontend/src/actions/register.test.ts`

**Interfaces:**
- Produces: action `open_registration`, kind `register`.
  - **Prefill schema** (all optional): `{ visit_type: 'new' | 'returning', reason: 'pain' | 'unwell' | 'follow_up' | 'test' | 'medicine' | 'other', with_whom: 'alone' | 'family' | 'carer' }`. No personal fields: the assistant can't set them (Task 1.1 test).
  - **Steps:**
    1. Who are you? `name` (text, private), `id_number` (text, numeric, private), `phone` (tel, private, optional).
    2. Visit: `visit_type`, `reason` (+ `reason_other` text when `other`).
    3. Support: `with_whom`, `communication` (choice: "I can hear, I cannot speak" (default), "I prefer writing", "I use sign language"; optional).
  - **Sentence:** e.g. "I would like to register. I am a new patient. I am here for a follow-up." / "Saya ingin mendaftar. Saya pesakit baharu. Saya datang untuk rawatan susulan." Never includes name, ID or phone.
  - **Staff summary:** includes name, masked ID (`••••••-••-1234`) and phone.

- [ ] **Step 1: Write the failing tests**

```ts
it("sentence never contains the name, ID or phone", ...);
it("returning patient reads naturally in both languages", ...);
it("reason 'other' uses the typed text", ...);
```

- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(dialogs): registration form`

### Task 1.5: Appointment dialog

**Files:**
- Create: `frontend/src/actions/appointment.ts`, `frontend/src/data/clinics.ts` (placeholder list, replaced per hospital)
- Test: `frontend/src/actions/appointment.test.ts`

**Interfaces:**
- Produces: action `open_appointment`, kind `appointment`.
  - **Prefill schema** (all optional): `{ has_appointment: boolean, clinic: <clinic key>, date: 'YYYY-MM-DD', time_of_day: 'morning' | 'afternoon' }`.
  - **Steps:**
    1. Do you have an appointment? (Yes / No / Not sure)
    2. With an appointment: clinic, today or other date, morning or afternoon.
       Without one: "I want to make one", then clinic, preferred date, morning or afternoon.
    3. With "Not sure", step 2 shows "Ask staff to check" and the sentence asks staff to look it up.
  - **Sentences:**
    - "I have an appointment at the Eye clinic this morning."
    - "I would like to make an appointment at the Eye clinic on 12 November, in the morning."
    - "I am not sure if I have an appointment. Please check for me."

- [ ] **Step 1: Write the failing tests**: one sentence test per branch in both languages; a date prefill in the past is rejected.
- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(dialogs): appointment form`

### Task 1.6: Directions dialog

**Files:**
- Create: `frontend/src/actions/directions.ts`, `frontend/src/data/destinations.ts` (placeholder entries; the real list comes later), `frontend/src/components/dialogs/DirectionsResult.tsx`
- Test: `frontend/src/actions/directions.test.ts`

**Interfaces:**
- Produces: action `open_directions`, kind `directions`.
  - **Prefill schema:** `{ destination: <destination key> }`.
  - **Steps:**
    1. Where do you want to go? A grid of destinations from `destinations.ts`.
    2. How will you get there? Walking / Wheelchair / I need someone to take me.
  - **Data shape:**

  ```ts
  type Destination = { k: string; l: Bi; icon: IconName; steps?: Bi[] } // steps optional until real data exists
  ```

  - **On submit:** `DirectionsResult` replaces the form with:
    - a large destination name and its numbered steps, or "Please ask staff to show you" when it has none;
    - a **Show staff** button that speaks the sentence;
    - a **Done** button.
  - **Sentence:** e.g. "Where is the pharmacy? I use a wheelchair." / "Di manakah farmasi? Saya menggunakan kerusi roda."

- [ ] **Step 1: Write the failing tests**: sentences per mode; a destination without steps renders the fallback text.
- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(dialogs): directions form and result`

### Task 1.7: Cards open the dialogs

**Files:**
- Modify: `frontend/src/lib/vocab.ts` (`register`, `appointment`, `directions` and `pharmacy` become action cards like `pain`; `pharmacy` opens Directions with `destination: 'pharmacy'`), `frontend/src/store.ts` (`addCard` dispatches `dialog.open` with `source: 'patient'`), `frontend/src/components/Board.tsx` (the "Opens body map" tag generalises to "Opens form")
- Test: extend `frontend/src/lib/text.test.ts` (suggestions still work for action cards)

- [ ] **Step 1: Implement and run** `npm test`. Check that tapping each card opens its dialog in the same frame, with no spinner.
- [ ] **Step 2: Commit:** `feat(board): front-desk cards open their forms`

### Task 1.8: Local keyword router

**Files:**
- Create: `frontend/src/actions/router.ts`
- Modify: `frontend/src/components/Panels.tsx` (Type tab shows a suggestion chip, "Open Directions? · Buka Arah?", when the router matches; it never opens on its own)
- Test: `frontend/src/actions/router.test.ts`

**Interfaces:**
- Produces:

```ts
/** On-device, synchronous. Intent phrases in EN and BM, not single keywords. */
export function route(text: string, lang: Lang): { kind: DialogKind; prefill: Record<string, unknown>; confidence: 'high' | 'low' } | null
```

- Phrase examples (keep the table in `router.ts`, easy to extend):
  - Register: "register", "registration", "daftar", "pendaftaran", "fill in your details"
  - Appointment: "appointment", "temu janji", "book a", "do you have an appointment"
  - Directions: "where is", "how do I get to", "di mana", "ke mana" + a destination name. The destination becomes the prefill.
  - Pain / Symptoms: "where does it hurt", "sakit di mana", "how do you feel", "rasa macam mana"
- `high` requires an intent phrase. A destination or clinic name alone is `low`. Staff speech opens only on `high`; the Type tab suggests on either.

- [ ] **Step 1: Write the failing tests**: the Review focus cases ("the pharmacy is closed" returns `null` or `low`; "where is the pharmacy" returns `high` with prefill), plus ten phrases per action in each language.
- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(actions): on-device intent router`

### Task 1.9: Real staff voice on the tablet

**Files:**
- Create: `frontend/src/lib/stt.ts`
- Modify: `frontend/src/store.ts` (`staffAsk` becomes `startStaffListening` / `stopStaffListening`), `frontend/src/components/TopBar.tsx` (mic button shows live state), `frontend/src/components/Board.tsx` (staff strip shows the live transcript)

**Interfaces:**
- Produces:

```ts
export type SpeechToText = {
  start(opts: { lang: 'en-GB' | 'ms-MY'; onPartial(text: string): void; onFinal(text: string): void; onError(e: string): void }): void
  stop(): void
}
export const browserSTT: SpeechToText | null // window.SpeechRecognition ?? webkitSpeechRecognition; null when unsupported
```

- Flow: the staff member taps the mic and speaks.
  - **Each partial transcript:** goes through `route()`, and the first `high` match dispatches `dialog.open` with `source: 'staff'`. This is the instant path.
  - **Final transcript with no match:** today's simulated question flow becomes `ask.open` (in phase 2, the transcript goes to the assistant instead).
  - **The transcript itself:** logged to the staff view as "Staff said: …".
- **No speech recognition available**, or permission denied: keep the current simulated behaviour and show a one-line note in the staff strip.

- [ ] **Step 1: Implement**
- [ ] **Step 2: Check in Chrome on the tablet in both languages:**
  - "Can you register please": Register opens before the sentence finishes.
  - "Where does it hurt": the Pain map opens.
  - "Do you have an appointment": the Appointment dialog opens.
  - Denying the mic shows the note and the simulation still works.
- [ ] **Step 3: Commit:** `feat(voice): staff speech opens forms on the tablet`

### Task 1.10: Submissions on the board and in the staff view

**Files:**
- Modify: `frontend/src/lib/types.ts` (`LogEvent` gains `form?: { kind: DialogKind; summary: string; values: Record<string, unknown> }`), `frontend/src/store.ts` (`submitDialog(values)`), `frontend/src/components/StaffView.tsx` (a form row shows its summary; private values appear only here)
- Test: `frontend/src/actions/submit.test.ts`

**Interfaces:**
- Produces: `submitDialog` does four things, in order:
  1. adds a chip whose short label is the form's name ("Registration", "Appointment: Eye clinic", "Directions: Pharmacy");
  2. speaks `toSentence`;
  3. logs a `request` event with `form`;
  4. closes the dialog and shows a toast.
- The chip, the message bar and the spoken text never contain private fields.

- [ ] **Step 1: Write the failing tests**

```ts
it("registration chip and message never include the name", ...);
it("staff summary includes the name and masked ID", ...);
it("the existing AI wording strip treats form submissions as normal message items", ...);
```

- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(dialogs): form submissions reach the message bar and staff view`

**Phase 1 done when:** all tests pass, `npx tsc --noEmit` and `npm run build` are clean, and every check above has been done in a browser.

---

## Phase 2: assistant (needs the backend)

Phase 2 adds understanding of free-form staff speech that the keyword router can't match ("she said her leg's been hurting since Tuesday, can you get her checked in"), plus richer prefills. The router stays in front, so dialogs still open instantly; the assistant fills in the rest.

### Task 2.1: Turn endpoint contract

**Files:**
- Create: `docs/api/assistant-turn.md`, the contract, written before any backend code

**Interfaces:**
- `POST /v1/assistant/turn` (plan 00's API conventions; called with the **staff** session token from plan 00 Task B.12, since only staff speech reaches the assistant)
  - Body: `{ visitId, lang, profile, transcript, context }`. `context` is the board summary from Task 2.3, never raw state.
  - Response: an `text/event-stream` body whose events are exactly `BoardEvent` (Task 1.1), plus `{ type: 'assistant.say', text: Bi }` for a short reply to staff and `{ type: 'turn.end' }`.
- Event ids are the provider's tool-call ids, so retries are idempotent.
- Timeouts:
  - No first event within 8 s: the tablet shows "Assistant didn't answer · use the buttons".
  - A dialog the router already opened stays open.

- [ ] **Step 1: Write the contract with example streams for: open plus streamed prefill, ask_patient, no tool call, and error.**
- [ ] **Step 2: Commit:** `docs(api): assistant turn contract`

### Task 2.2: Provider adapters (plug and play)

**Files:**
- Create (backend): `backend/api/src/assistant/provider.ts`, `backend/api/src/assistant/providers/<name>.ts` (one per supported provider), `backend/api/src/assistant/providers/fake.ts` (scripted, for tests and local dev). Provider keys go in Secret Manager (plan 00 Task B.14).

**Interfaces:**

```ts
type ProviderEvent =
  | { type: 'tool_start'; id: string; name: string }              // emitted as soon as the tool name is known
  | { type: 'tool_args_delta'; id: string; partialJson: string }  // incremental arguments, where the provider supports it
  | { type: 'tool_end'; id: string; args: unknown }               // final arguments (unvalidated)
  | { type: 'text'; text: string }
  | { type: 'end'; reason: 'done' | 'max_tokens' | 'refused' | 'error' }

interface AssistantProvider {
  streamTurn(input: { system: string; context: string; transcript: string; tools: ReturnType<typeof toolDefinitions> }): AsyncIterable<ProviderEvent>
}
// chosen by env: ASSISTANT_PROVIDER=<name>, plus that provider's model and key variables
```

- Every adapter must:
  - stream;
  - let the model choose tools freely (auto);
  - use the provider's strict or structured tool schemas where they exist;
  - emit `tool_start` as soon as the tool name arrives, not after the arguments finish;
  - turn on incremental tool-argument streaming where the provider offers it. Providers without it still work: the dialog opens on `tool_start` and fills on `tool_end`.

- [ ] **Step 1: Build `fake` first and run the whole of phase 2 against it.**
- [ ] **Step 2: Add the first real provider. Each later provider must pass the same adapter test suite, which replays recorded streams.**
- [ ] **Step 3: Commit:** `feat(assistant): provider-neutral streaming adapter`

### Task 2.3: Turn service

**Files:**
- Create (backend): `backend/api/src/assistant/{prompt,context,turn}.ts`, plus tool-call storage at Firestore `visits/{visitId}/assistantTurns/{turnId}` (covered by plan 00's retention job)
- Test: `backend/api/src/assistant/context.spec.ts`, `turn.spec.ts`

**Interfaces and rules:**
- **System prompt:** fixed text, so providers can cache it.
  - It says: you help hospital staff talk with a patient who can hear but cannot speak.
  - Your only actions are opening forms and asking the patient multiple-choice questions.
  - Never invent values; leave unknowns empty.
  - Never ask for or repeat an IC number, phone number or name.
  - Prefer one tool call per turn.
- **Context builder:** includes the profile (front desk or bedside), the counter or bed, the open dialog's kind and **which fields are already filled** (keys only, never values of private fields), and the last 5 message items. The Review focus test asserts no private value ever appears.
- **Mapping:** maps `ProviderEvent` to `BoardEvent`:
  - `tool_start` becomes `dialog.open` (or `ask.open`) with an empty prefill.
  - Each parsable `tool_args_delta` prefix becomes `dialog.patch` with only the keys that are complete and valid.
  - `tool_end` becomes a final `dialog.patch`.
  - Unknown tools and invalid args are dropped and logged.
- **Tool result** given back to the model: "Opened. The patient will answer." It is never the patient's submitted values.
- **Idempotency:** each tool call id is stored, and a retried turn replays stored events instead of calling the provider again.
- **Audit:** transcript, tools called, events emitted, latency to first `tool_start`.

- [ ] **Step 1: Write the failing tests** (Review focus items for Task 2.3, plus "a turn with no tool call emits only `assistant.say`").
- [ ] **Step 2: Implement against the `fake` provider, then run the tests.** Expected: PASS.
- [ ] **Step 3: Commit:** `feat(assistant): turn service`

### Task 2.4: Tablet consumes the stream

**Files:**
- Create: `frontend/src/actions/assistant.ts`
- Modify: `frontend/src/store.ts` (final transcript with no `high` router match goes to the assistant; when the router already opened a dialog, the transcript still goes so the assistant can prefill it)
- Test: `frontend/src/actions/assistant.test.ts` (feeds a recorded event stream into `dispatch`)

- [ ] **Step 1: Write the failing tests**: a truncated `dialog.patch` leaves the field empty; a router-opened dialog receives the assistant's patch rather than a second dialog; the 8 s timeout keeps the dialog.
- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(assistant): tablet streams assistant events into dialogs`

### Task 2.5: Store submissions

**Files:**
- Backend: `PUT /v1/visits/:visitId/forms/:formId` in the reserved `forms` module of plan 00, storing `visits/{visitId}/forms/{formId}` with `{ kind, values, summary }`. Fields come from Tasks 1.4–1.6.
  - Private fields (name, ID, phone) are encrypted at field level with Cloud KMS before writing, on top of Firestore's default encryption at rest.
  - Only staff can read them, through a NestJS route; security rules deny client reads of `forms`.
- Frontend: `submitDialog` goes through plan 00's `Sync` and offline queue after the local steps from Task 1.10. If sending fails, the patient's message and the staff log still stand, and the queue retries.

- [ ] **Step 1: Implement with tests on both sides.**
- [ ] **Step 2: Commit:** `feat(api): persist form submissions`

### Task 2.6: Evaluation set

**Files:**
- Create: `assistant/eval/utterances.jsonl` (at least 60 staff utterances: 30 EN, 30 BM, covering every action, ambiguous lines and lines that should call nothing), `assistant/eval/run`

- Each case lists the expected tool (or none) and the expected prefill keys.
- Score per provider and model:
  - correct tool;
  - **no invented values** (any prefill key not supported by the utterance is a failure);
  - no private field requested;
  - median and p90 time to first `tool_start`.
- [ ] **Step 1: Write the set and the runner; record a baseline for the first provider.**
- [ ] **Step 2: Commit:** `test(assistant): utterance evaluation set`

---

## Later
- Real destination list and step-by-step directions for the hospital (`frontend/src/data/destinations.ts`).
- Real clinic list (`frontend/src/data/clinics.ts`).
- Server-side speech-to-text behind the same `SpeechToText` interface, if browser recognition is not good enough for Malay on the target tablets.
