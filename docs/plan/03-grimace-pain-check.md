# 03: Grimace-triggered pain check

> For whoever implements this: work task by task and tick each step off in this file. The phases ship in order and each one works on its own:
>
> | Phase | What it adds | Needs |
> |---|---|---|
> | 1 | The whole feature on a **simulated** face scorer, for the presentation | Frontend only |
> | 2 | Real on-device face analysis | Frontend only; nothing leaves the device |
> | 3 | The pain-check module on [plan 00's backend](00-backend-foundation.md) (NestJS and Cloud Firestore): outcomes, Station notes, face config and consent settings | Plan 00 done |
> | 4 | An optional Flask inference service, as a second scorer for comparison | Backend |
> | 5 | Validation | Real sessions |
>
> This plan shares the camera with [02-eye-control.md](02-eye-control.md); read its Task 1.1 (`GazeSource`) and Task 1.3 (gaze layers) first.

**Goal:** a patient who is too weak or tired to start a pain report gets offered one when their face shows a sustained pain-like expression. The feature **does not** diagnose pain, estimate severity, or trigger an emergency. It offers a chance to communicate:
- The patient confirms or declines.
- If they confirm, they choose the body area, score and descriptor in the existing pain map.
- Only that confirmed report enters the history.

This scope is narrower than PainChek, which inspired it: PainChek is a clinical assessment tool; this is a prompt.

**Pipeline:**

```
Shared camera (CameraHub)
  → Face analysis on the device (MediaPipe Face Landmarker: blendshapes + landmarks, 5–10 Hz)
  → ExpressionScorer (PSPI-style score from baseline-adjusted blendshapes, usability per face region)
  → Decision layer over time (window, evidence rules, suppression, cooldown)
  → Prompt (Yes / No / Not sure / Dismiss)
  → existing pain map → existing message, speech and history
```

**Architecture:**
- **`CameraHub`** (`frontend/src/lib/camera/`): the single owner of `getUserMedia`. It hands one stream and one hidden `<video>` to every consumer (eye tracking, face analysis), tracks consent per feature, and releases the camera when nothing needs it.
- **`ExpressionScorer`** (`frontend/src/lib/pain/scorer.ts`): the seam between face analysis and the decision layer.
  - Phase 1: `SimulatedScorer`.
  - Phase 2: `BlendshapeScorer`, on the device.
  - Phase 4: `RemoteScorer`, calling the Flask service.
  - The decision layer can't tell them apart.
- **Decision layer** (`frontend/src/lib/pain/decide.ts`): a pure state machine, like plan 02's controller. Time comes only from event timestamps, so every rule is unit-tested with synthetic score streams.
- **Prompt and staff surfaces** (`frontend/src/components/pain/`): the consent sheet, baseline capture, the prompt, the "Face check on" indicator, the Station note and the Staff view panel.
- **Backend (Phase 3):** plan 00's foundation (NestJS writes through the Admin SDK, Cloud Firestore, Firebase Auth for devices and staff, Firestore listeners for live reads), plus this feature's `pain-checks` module.
- **Inference (Phase 4, optional):** **Flask** (`backend/inference`) with PyTorch. It's stateless and holds images only in memory. It's designed to host plan 02's heavier model work later as separate blueprints.
- **Shared contracts:** `shared/contracts` holds zod schemas and the TypeScript types made from them. The frontend and NestJS import the same definitions; the Flask service validates against JSON Schema generated from them.

**Tech stack:**

| Part | Stack |
|---|---|
| Frontend | The existing app (React 19, TypeScript, Zustand, Tailwind v4, Vite), plus `@mediapipe/tasks-vision` (Phase 2) and the `firebase` web SDK, for Auth and Firestore reads only (Phase 3) |
| Main API | NestJS 11, `firebase-admin`, `zod`, `nestjs-zod` |
| Inference | Flask 3, PyTorch, `firebase-admin` (Python, to verify tokens), `gunicorn` |
| Database | Cloud Firestore, with TTL policies for retention. The Firebase Emulator Suite is used for local development and rules tests. |

## Global constraints
- **A prompt, never an assessment:** no screen, log, export or wording shows a face score as a pain level or a probability. The interface says "pain check", never "pain detected". The trigger is not a pain report.
- **What goes into the history:** only what the patient chooses enters the visit's message history.
  - A confirmed pain-map report.
  - An explicit "No, not in pain right now" answer.
  - A "Please ask a nurse to check" request.
  - The trigger, a dismissal and an unanswered prompt are **pain-check outcomes**: stored per visit in `painChecks` and shown in their own labelled panel, never mixed into the message history.
- **Unanswered is not "no pain":** a timed-out prompt is recorded as `none`, and no text anywhere describes it as an absence of pain.
- **No face images leave the device in Phases 1–3:** only numbers do (score, region usability, trigger summary). Phase 4 sends face crops to Flask **only** on devices enrolled for validation, and only while that is switched on. Crops are held in memory, never written to disk, never logged, and never stored.
- **Consent first:**
  - Monitoring starts only after an explicit opt-in on the consent sheet. It records who agreed (patient, or staff on the patient's behalf per hospital policy), who enabled it, and when.
  - A visible **"Face check on"** indicator shows while it runs. The patient and staff can turn it off from the board in one step.
  - New visit, a profile switch, or turning it off ends monitoring and clears the baseline.
- **Manual reporting and Emergency are never blocked:** the prompt is not modal. The cards, the pain card and Emergency stay usable underneath it.
- **Bilingual:** every patient-facing string is `Bi` (English and Malay). The prompt is optionally spoken softly, and never in night mode.
- **Look and feel:** reuse the existing pain check-back prompt (`check` / `checkPain` / `snoozeCheck` in the store) and its component, plus `Sheet`, `SheetTitle`, `Step`, `btnPrimary`/`btnAlt`, `Tip` and the `health` colour category. Add no UI library.
- **Calm by design:** the prompt never flashes, never uses red, and never makes a sound beyond the optional spoken line.

**Starting constants** (`frontend/src/lib/pain/constants.ts`). These are placeholders until Phase 5 replaces them with validated sets delivered from Firestore config:

| Constant | Start value | Meaning |
|---|---|---|
| `SCORE_HZ` | 8 | How often a face is analysed |
| `WINDOW_MS` | 4000 | Evidence window |
| `MIN_COVERAGE` | 0.8 | Share of expected frames in the window that must be fresh and usable |
| `MIN_HIGH_SHARE` | 0.7 | Share of those frames that must be over the threshold |
| `STALE_MS` | 500 | A gap longer than this clears the evidence |
| `PROMPT_TIMEOUT_MS` | 60000 | An unanswered prompt closes as `none` |
| `COOLDOWN_MIN` | `[10, 20, 40]` | Grows with each decline, dismissal or timeout in this visit; resets after a confirmed report |
| `DEFER_MAX_MS` | 20000 | A deferred trigger expires if it can't be shown within this time |
| `BASELINE_MS` | 15000 | Length of the neutral-face capture |

**Sensitivity** (Low / Medium / High) is a staff setting. It maps to a tested threshold set; staff never see raw numbers.

## Review focus
- **One very high-scoring frame:** no prompt. Task 1.2.
- **A grimace held for 5 s, with the face fully visible:** exactly one prompt. Task 1.2.
- **Eyes closed for 2 minutes (asleep), nothing else:** no prompt. Eye closure alone never counts. Tasks 1.2 and 2.3.
- **The face is lost at 3 s into a 4 s window:** the evidence clears and no prompt appears; the window starts over when the face returns. Task 1.2.
- **The patient squints at a gaze target during a dwell:** no evidence builds while a dwell is active. Task 1.4.
- **The prompt appears during a gaze dwell on Water:** the Water countdown is cleared, and the prompt's buttons need a fresh dwell. Task 1.4.
- **A trigger while calibration is running:** it waits, and expires after `DEFER_MAX_MS` if the evidence goes stale. Task 1.2.
- **A trigger while the pain check-back is due or showing:** suppressed; only one pain prompt at a time. Task 1.3.
- **Dismiss three times:** the cooldowns are 10, then 20, then 40 minutes. After a confirmed pain report, the next cooldown is back to 10. Task 1.2.
- **A prompt left unanswered:** stored as `none`, a Station note appears ("Pain check offered, no answer"), nothing enters the message history, and nothing says "no pain". Tasks 1.3 and 1.6.
- **"No":** the history gets "No pain right now", labelled as the patient's answer. Task 1.3.
- **An oxygen mask covering the mouth:** usability is reduced, scoring uses only the brow and eyes, and the reduced score can still trigger. Task 2.3.
- **New visit:** monitoring stops, the camera is released when eye control isn't using it, the baseline is cleared, and consent ends. Tasks 1.5 and 2.1.
- **A board with no network:** monitoring and prompts work; outcomes queue and sync later. Task 3.3 (with plan 00's queue).
- **A pain-check write with no active `face` consent:** 409 `CONSENT_REQUIRED`. Task 3.2.
- **A Station in another ward tries to read `painChecks`:** rules deny it. Task 3.1.
- **A Phase 4 request:** the Flask logs contain no image bytes, and nothing is written to disk. Task 4.2.

## Commands
- Frontend tests: `cd frontend && npm test`. Task 1.1 widens the script to `node --test src/lib/*.test.ts src/lib/gaze/*.test.ts src/lib/pain/*.test.ts`.
- Frontend types: `cd frontend && npx tsc --noEmit`. Build: `cd frontend && npm run build`.
- Design check: `impeccable detect --json src` after each UI task.
- API: `cd backend/api && npm test` (Jest, the NestJS default). End-to-end against the emulators: `npm run test:e2e`.
- Firestore rules: `cd backend && firebase emulators:exec --only firestore,auth "npm --prefix api run test:rules"`.
- Inference: `cd backend/inference && pytest`.

---

## Phase 1: frontend with a simulated scorer (presentation)

### Task 1.1: Types, the `ExpressionScorer` interface and `SimulatedScorer`

**Files:**
- Create: `frontend/src/lib/pain/types.ts`, `frontend/src/lib/pain/scorer.ts`, `frontend/src/lib/pain/simulated.ts`, `frontend/src/lib/pain/constants.ts`
- Modify: `frontend/package.json` (widen the `test` script)
- Test: `frontend/src/lib/pain/simulated.test.ts`

**Interfaces:**

```ts
export type Region = 'brow' | 'eyes' | 'nose' | 'mouth'
export type ScoreFrame = {
  t: number                                  // performance.now() ms
  usable: boolean                            // face found and enough regions visible
  regions: Record<Region, boolean>           // which regions were visible
  score: number                              // 0..1, baseline-adjusted; NOT a pain level
  parts: { brow: number; eyes: number; nose: number; closure: number } // 0..1 each, for the evidence rules and the trigger summary
}

export interface ExpressionScorer {
  readonly kind: 'simulated' | 'blendshape' | 'remote'
  readonly version: string                   // recorded with every pain-check outcome
  start(): Promise<void>
  stop(): void
  onFrame(cb: (f: ScoreFrame) => void): () => void
  captureBaseline(ms: number): Promise<{ ok: boolean; regions: Record<Region, boolean> }>
  resetBaseline(): void
}

export function simulatedScorer(): ExpressionScorer & {
  setGrimace(level: number): void            // 0..1, from the presenter slider
  holdGrimace(level: number, ms: number): Promise<void>
  setEyesClosed(on: boolean): void           // "asleep": closure high, everything else neutral
  setCovered(region: Region, covered: boolean): void  // e.g. mask over the mouth
  dropFace(ms: number): void
}
```

- Simulated frames carry seeded noise, so tests are repeatable.

- [ ] **Step 1: Write the failing tests**: a held grimace produces frames above 0.6 for its duration; `setEyesClosed` raises only `closure`; a covered region reports `regions.mouth === false` and contributes 0; `dropFace` emits `usable: false`.
- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(pain): expression scorer interface and simulated scorer`

### Task 1.2: Decision layer

**Files:**
- Create: `frontend/src/lib/pain/decide.ts`
- Test: `frontend/src/lib/pain/decide.test.ts`

**Interfaces:**

```ts
export type Context = {
  gazeDwelling: boolean      // plan 02 controller in 'dwelling'
  gazeTyping: boolean        // gaze keyboard open
  calibrating: boolean       // eye-control setup running
  modalOpen: boolean         // any dialog, including the pain map
  checkBackDue: boolean      // existing pain check-back is due or showing
  alarm: boolean
}
export type DecideState =
  | { mode: 'inactive' }
  | { mode: 'baseline' }
  | { mode: 'watching'; evidenceSince: number | null }
  | { mode: 'deferred'; since: number }          // triggered, waiting for context to clear
  | { mode: 'asking'; since: number; promptId: string }
  | { mode: 'cooldown'; until: number; step: number }

export type DecideEvent =
  | { type: 'frame'; f: ScoreFrame }
  | { type: 'tick'; t: number }
  | { type: 'context'; c: Context }
  | { type: 'answer'; answer: 'yes' | 'no' | 'unsure' | 'dismissed'; t: number }
  | { type: 'reported'; t: number }               // any confirmed pain report (manual or via prompt)
  | { type: 'start' } | { type: 'baselineDone' } | { type: 'stop' }

export type DecideOutput = {
  state: DecideState
  prompt?: { promptId: string; trigger: TriggerSummary }  // show the prompt now
  outcome?: { promptId: string; answer: Answer; at: number }  // includes 'none' on timeout
}
export type TriggerSummary = { parts: (keyof ScoreFrame['parts'])[]; peak: number; heldMs: number; regions: Region[] }
export function createDecider(cfg: DecideConfig): { step(e: DecideEvent): DecideOutput }
```

**Evidence rules (all must hold over the last `WINDOW_MS`):**
1. Fresh, usable frames cover at least `MIN_COVERAGE` of the frames expected at `SCORE_HZ`.
2. At least `MIN_HIGH_SHARE` of those frames have `score ≥ threshold` (from the sensitivity set).
3. In those frames, either `brow` or `eyes` is elevated. **`closure` alone never counts**, and neither does `nose` alone.

**Clearing and suppression:**
- A gap over `STALE_MS`, or any unusable frame run longer than `STALE_MS`, **clears** the evidence.
- When any `Context` flag is true, evidence **does not build**. The current evidence is kept for up to `STALE_MS` and then cleared, so squinting at a dwell target can't accumulate.

**Deferring:** a trigger that arrives while `modalOpen`, `calibrating` or `gazeDwelling` is true moves to `deferred`. It is shown when the context clears, unless `DEFER_MAX_MS` passes or the evidence goes stale first; then it is dropped silently, with no outcome stored.

**Answers and cooldown:**
- `asking`: a `PROMPT_TIMEOUT_MS` timeout emits outcome `none` and enters cooldown.
- `no`, `dismissed` and timeouts move one step up the cooldown (`COOLDOWN_MIN`); `unsure` waits at the current step.
- `yes` waits until a `reported` event, or until the pain map is cancelled, which is outcome `yes-cancelled`, at the current step.
- `reported` from any source resets the cooldown step to 0.

- [ ] **Step 1: Write the failing tests**: one per Review focus bullet marked Task 1.2, plus:

```ts
it("never prompts while asking or in cooldown", ...);
it("stop() from any state goes inactive and emits no outcome", ...);
it("deferred trigger is shown when the modal closes within DEFER_MAX_MS", ...);
it("nose-only elevation never triggers", ...);
```

- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(pain): temporal decision layer`

### Task 1.3: The prompt, wired into the existing pain flow

**Files:**
- Create: `frontend/src/components/pain/PainCheckPrompt.tsx`
- Modify: `frontend/src/store.ts` (`painCheck` slice; answer handlers), `frontend/src/components/PainScale.tsx` (shares the check-back prompt's layout), `frontend/src/App.tsx`

**Prompt:**
- It uses the same slot and style as the existing check-back prompt, so only one pain prompt can be visible.
- **Wording:** "Are you in pain? · Adakah anda sakit?" with a quieter line: "Your face looked uncomfortable. You can ignore this. · Wajah anda nampak tidak selesa. Anda boleh abaikan ini."
- **Buttons:** **Yes** · **No** · **Not sure** · **Dismiss** (the × button).
- **Speech:** the question is spoken once, softly, if speech is on and night mode is off.

**What each answer does:**

| Answer | Action |
|---|---|
| **Yes** | Opens the existing pain map (`setModal('pain')`). Confirming the map follows the normal flow (chip, speech, history) and sends `reported`. Cancelling it gives `yes-cancelled`. |
| **No** | Adds a history row of kind `answer`: "Pain check: No pain right now · Semakan sakit: Tiada sakit sekarang", source `Pain check`. |
| **Not sure** | Shows one follow-up button, **Ask a nurse to check · Minta jururawat periksa**, which adds a normal `request` row. If the patient doesn't choose it, the prompt closes as `unsure`. |
| **Dismiss** | Closes. Outcome `dismissed`. |

- Every outcome, including `none`, goes to `painChecks` storage: local in Phase 1, Firestore in Phase 3. The message history only gets the rows listed above.

- [ ] **Step 1: Write the failing tests** (store-level): "No" adds exactly one `answer` row; "Dismiss" and "none" add no history row; "Yes" then a confirmed map gives outcome `yes`, and cancelling gives `yes-cancelled`.
- [ ] **Step 2: Implement, then check in the browser** with the presenter slider (Task 1.7).
- [ ] **Step 3: Commit:** `feat(pain): pain-check prompt using the existing pain flow`

### Task 1.4: Eye-control interplay

**Files:**
- Modify: `frontend/src/components/gaze/GazeRuntime.tsx` (plan 02), `frontend/src/components/pain/PainCheckPrompt.tsx`, `frontend/src/lib/gaze/targets.ts`

**Behaviour:**
- The prompt registers its buttons as gaze targets on a new layer, `prompt`. The layer order is `resume` > `prompt` > `modal` > `keyboard` > `board`.
- Showing the prompt changes the active layer, so the controller clears any running dwell and a fresh dwell is required (plan 02's rule).
- `GazeRuntime` publishes `gazeDwelling` and `gazeTyping` into the decider's `Context`, and eye-control setup publishes `calibrating`.
- **Dismiss by gaze** uses the normal dwell. **Yes by gaze** uses 1.5× the dwell, so a long look at the prompt doesn't accept it by accident.

- [ ] **Step 1: Write the failing tests** (controller-level, reusing plan 02's harness): a dwell on Water at 700 ms is cleared when the `prompt` layer mounts; Yes needs 1.5× the dwell.
- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(pain): prompt works with eye control`

### Task 1.5: Consent, baseline and the "Face check on" indicator

**Files:**
- Create: `frontend/src/components/pain/ConsentSheet.tsx`, `frontend/src/components/pain/FaceCheckChip.tsx`
- Modify: `frontend/src/components/TopBar.tsx` (Staff menu item "Pain check (face)"), `frontend/src/store.ts` (`newVisit` and `switchProfile` stop monitoring)

**Consent sheet (staff open it; the patient reads it or has it read to them):**
1. **What it does:** "Signova can watch for signs of discomfort on your face and ask if you are in pain. It does not diagnose. You choose whether to answer." (EN and BM.)
2. **What is kept:** "Pictures of your face stay on this device and are not saved. Only your answers are recorded." In Phase 4 validation mode the second sentence changes to say crops are sent for analysis and not stored.
3. **Who agrees:** Patient / Staff on the patient's behalf. Plus a staff ID field, and a sensitivity choice (Low / Medium / High, default Medium).
4. **Neutral face:** "Please look at the screen with a relaxed face for 15 seconds." A ring fills while the baseline is captured. If a region isn't visible (for example a mask), it says so and continues with the others. If the face isn't usable at all, it asks staff to reposition the device.

**Indicator:** a top-bar chip, **Face check on**, in the `health` colour with a small camera glyph. Tapping it opens: Pause for 30 min / Turn off / Sensitivity. On the patient's side the chip's off control is a large target, and it's gaze-selectable.

- [ ] **Step 1: Implement, then check in the browser:** consent → baseline → indicator on; New visit turns it off and clears the baseline; switching profile turns it off.
- [ ] **Step 2: Commit:** `feat(pain): consent, baseline and indicator`

### Task 1.6: Station note and Staff view panel

**Files:**
- Modify: `frontend/src/components/Station.tsx`, `frontend/src/components/StaffView.tsx`, `frontend/src/lib/types.ts`

**Station note** (default **on**, configurable per ward in Phase 3):
- When a prompt times out as `none`, the board's Station card shows a muted note: "Pain check offered 14:05 · no answer. Not a pain report; consider checking in."
- It's not an alarm and not counted in "open".
- It clears when staff tap **Seen**, or when the patient makes any selection.
- Rate limit: at most one note per board every 30 minutes.

**Staff view panel, "Pain checks":** a list per visit showing time, answer, how long the patient took to answer, and which face parts were involved ("brow + eyes, held 4.2 s"). Under the heading: "Prompts offered by face monitoring. These are not pain reports." No scores are shown.

- [ ] **Step 1: Implement, then check in the browser** with a forced timeout from the presenter controls.
- [ ] **Step 2: Commit:** `feat(pain): station note and staff panel for pain checks`

### Task 1.7: Presenter controls and autoplay

**Files:**
- Create: `frontend/src/components/pain/PainPresenter.tsx`, `frontend/src/lib/pain/demo.ts`
- Modify: plan 02's `Presenter.tsx` (one presenter panel with two tabs, Gaze and Face)
- Test: `frontend/src/lib/pain/demo.test.ts`

**Face tab:**
- An always-visible "Simulated face" tag.
- A **Grimace** slider and a **Hold grimace 5 s** button.
- **Asleep** (eyes closed) and **Cover mouth** (mask) toggles, plus **Lose face 2 s**.
- **Show decision state**, for the audience: a small strip that fills as evidence builds, labelled "Evidence", with no score numbers.

**Autoplay:**
1. A neutral face for 3 s.
2. A brief grimace for 1 s: the strip rises, then falls. No prompt.
3. "Asleep" for 5 s. No prompt.
4. A grimace held for 5 s: the prompt appears and is spoken.
5. **Yes**, by mouse or by gaze if eye control is on: the pain map opens. The demo stops here so the presenter can finish the map by hand.

- [ ] **Step 1: Write the failing test**: the autoplay score stream through the decider produces exactly one prompt, at step 4.
- [ ] **Step 2: Implement, then run the autoplay at 1366×768 and 1024×768.**
- [ ] **Step 3: Commit:** `feat(pain): presenter controls and autoplay`

**Phase 1 done when:** all tests pass, types and build are clean, the detector reports nothing, and the autoplay plus the manual checks above work on a laptop and a landscape tablet size.

---

## Phase 2: real face analysis on the device

### Task 2.1: `CameraHub`, shared with eye control

**Files:**
- Create: `frontend/src/lib/camera/hub.ts`
- Modify: plan 02's `webgazer.ts` source

**Interfaces:**

```ts
type Feature = 'gaze' | 'face'
export const cameraHub: {
  acquire(f: Feature): Promise<{ stream: MediaStream; video: HTMLVideoElement }>  // first acquire opens the camera
  release(f: Feature): void                                                       // last release stops every track
  status(): 'off' | 'starting' | 'on' | 'denied' | 'error'
  onStatus(cb: (s: ReturnType<typeof cameraHub.status>) => void): () => void
}
```

- **Gate check (first step of this task):** confirm that WebGazer can run on a stream we provide instead of calling `getUserMedia` itself.
  - **If it can:** feed it from `cameraHub`.
  - **If it can't:** when face checks are on, eye control uses a MediaPipe gaze source, which is plan 02 Task 3.2, brought forward. One Face Landmarker pass then feeds both features. Record the result in `docs/gaze/device-results.md`.

- [ ] **Step 1: Do the gate check and record the result.**
- [ ] **Step 2: Implement the hub; test acquire and release counting with a fake `mediaDevices`.**
- [ ] **Step 3: Commit:** `feat(camera): shared camera hub`

### Task 2.2: Face Landmarker runner

**Files:**
- Create: `frontend/src/lib/camera/face.ts`
- Modify: `frontend/package.json` (add `@mediapipe/tasks-vision`, loaded with a dynamic `import()`)

**How it runs:**
- Runs `FaceLandmarker` in `VIDEO` mode with `outputFaceBlendshapes: true` and `numFaces: 1`, at `SCORE_HZ`.
- It uses `requestVideoFrameCallback` where available, with a throttled `requestAnimationFrame` as the fallback.
- The model and WASM files are self-hosted under `/public/models`, so no CDN is needed at the bedside.
- **Mirroring:** the camera preview is mirrored for staff, but blendshapes are always computed on the **unmirrored** frame. Left and right blendshapes refer to the patient's own face (MediaPipe documents this).
- **Performance budget:** at most 15 ms of main-thread time per analysed frame on the target laptop. If it's exceeded, drop to 5 Hz and log it once.

- [ ] **Step 1: Implement, then check frame time in Chrome DevTools on the target laptop and tablet.**
- [ ] **Step 2: Commit:** `feat(camera): MediaPipe face landmarker runner`

### Task 2.3: `BlendshapeScorer`

**Files:**
- Create: `frontend/src/lib/pain/blendshape.ts`
- Test: `frontend/src/lib/pain/blendshape.test.ts` (fixtures: recorded blendshape arrays, no images)

**Mapping** (the PSPI facial pain score is AU4 + max(AU6, AU7) + max(AU9, AU10) + AU43; blendshapes are approximate stand-ins):

| Part | Blendshapes (mean of left and right unless noted) | Stands in for |
|---|---|---|
| `brow` | `browDownLeft/Right` | AU4 (brow lowerer) |
| `eyes` | max of `cheekSquintLeft/Right` and `eyeSquintLeft/Right` | AU6 / AU7 (cheek raiser, lid tightener) |
| `nose` | max of `noseSneerLeft/Right` and `mouthUpperUpLeft/Right` | AU9 / AU10 (nose wrinkler, upper lip raiser) |
| `closure` | `eyeBlinkLeft/Right`, counted only when held longer than 400 ms (a blink is shorter) | AU43 (eyes closed) |

- **Baseline adjustment:** each part becomes `max(0, value − baseline_mean − 2·baseline_sd)`, scaled to 0..1. The baseline is per patient and per side, which handles one-sided facial weakness, habitual frowns and older faces.
  - **Facial asymmetry:** when one side's baseline variance is much higher (one side moves differently), score each part from the side that moves more consistently. Flag this in the consent sheet's baseline result.
- **Region usability:** a region is visible when its landmarks are inside the frame, the face is turned less than 30° away, and the region's landmark confidence passes. A mask over the mouth makes `nose` unusable. The score is re-weighted over the visible parts and the frame stays usable.
- **Score:** `score = (brow + eyes + nose + 0.5·closure) / weightOfVisibleParts`. Closure is half-weight and can never trigger alone (Task 1.2's rule still applies).
- **Mapping source:** check the mapping against the clinician-validated blendshape-to-action-unit mapping (Turrisi et al.) before Phase 5. Record any changes in `docs/pain/mapping.md`.

- [ ] **Step 1: Write the failing tests** with recorded fixtures: a neutral face stays under 0.2; a posed grimace goes over 0.6; eyes closed raises only `closure`; a covered mouth re-weights to the brow and eyes.
- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(pain): blendshape scorer with per-patient baseline`

### Task 2.4: Real consent flow and recovery

**Files:**
- Modify: `frontend/src/components/pain/ConsentSheet.tsx`, `frontend/src/components/pain/FaceCheckChip.tsx`

**Recovery cases:**
- **Camera denied:** explain how to allow it, offer **Try again**, and leave the feature off. Nothing else is affected.
- **No face for more than 2 minutes while on:** the chip shows "Can't see face". Monitoring continues, and no outcome is created.
- **Low light:** detected from frame brightness. The chip shows "Too dark to check face", with no prompts until it improves.
- **Turning off:** stop the scorer and call `cameraHub.release('face')`. The browser's camera light goes off unless eye control is still on.

- [ ] **Step 1: Check each recovery case in Chrome and Edge on the laptop and the tablet.**
- [ ] **Step 2: Commit:** `feat(pain): real camera consent and recovery`

---

## Phase 3: backend (pain-check module on plan 00's foundation)

**Prerequisite:** [00-backend-foundation.md](00-backend-foundation.md) Phases A and B. These come from 00 and aren't redefined here:
- the repository layout and `shared/contracts`;
- device and staff auth, roles and ward checks;
- visits, events, consents, config sets;
- security rules, retention, the `Sync` interface, the offline queue, and deployment.

This phase fills 00's reserved `pain-checks` module and adds the face feature's config and consent settings.

### Task 3.1: Contracts and data model for pain checks

**Files:**
- Create: `shared/contracts/src/pain-check.ts`
- Modify: `shared/contracts/src/config.ts` (add the `face` block), `shared/contracts/src/consent.ts` (the `face` feature's `settings`), `backend/firestore.rules`, `backend/firestore.indexes.json`

**Additions to plan 00's model:**

```
configSets/{id}.face          { sensitivity: { low|medium|high: { threshold, windowMs, minHighShare } },
                                cooldownMin: number[], promptTimeoutMs, stationNote: { enabled, minGapMin } }
devices/{deviceId}            + validationMode: boolean        (Phase 4 only; admin-set)
visits/{v}/consents/face      settings: { sensitivity, baseline: { capturedAt, regions } }
visits/{v}/painChecks/{promptId}
                              { promptedAt, shownAt, answer: 'yes'|'yes-cancelled'|'no'|'unsure'|'dismissed'|'none',
                                answeredAt?, trigger: { parts, peak, heldMs, regions }, deferredMs,
                                scorer: { kind, version }, configSetId, sensitivity, viaGaze: boolean }
visits/{v}/stationNotes/{id}  { createdAt, kind: 'pain-check-unanswered', seenBy?, seenAt? }
```

- **Rules:** `painChecks` and `stationNotes` follow plan 00's visit read rule: the board reads its own visit; the Station and staff read their wards. Client writes stay denied.
- **Retention:** these subcollections are deleted with their visit by plan 00's retention job (Task B.11). They need no TTL of their own.

- [ ] **Step 1: Write the failing rules tests**: a Station in the same ward can read `painChecks`; another ward can't; a board can't read another board's `painChecks`.
- [ ] **Step 2: Implement, then run the rules tests.** Expected: PASS.
- [ ] **Step 3: Commit:** `feat(pain): contracts, firestore model and rules for pain checks`

### Task 3.2: `pain-checks` module

**Files:**
- Modify: `backend/api/src/pain-checks/` (plan 00's reserved module): add `pain-checks.controller.ts`, `pain-checks.service.ts`, `pain-checks.repository.ts`
- Test: `backend/api/test/e2e/pain-checks.e2e-spec.ts`

**Endpoints** (plan 00's conventions: `/v1` prefix, `PUT` on client ids, the shared error shape):

| Method and path | Caller | Purpose |
|---|---|---|
| `PUT /v1/visits/:visitId/pain-checks/:promptId` | Board | Create or update one pain-check outcome |
| `PUT /v1/visits/:visitId/station-notes/:noteId` | Board | An unanswered-check note (when the outcome is `none`) |
| `POST /v1/visits/:visitId/station-notes/:noteId/seen` | Staff | Clear the note |

- Consent uses plan 00's `PUT/DELETE /v1/visits/:visitId/consents/face`, with the `face` settings from Task 3.1.
- "No" and "Ask a nurse to check" are normal events, through plan 00's `PUT …/events/:eventId`.

**Server-side checks** (the server enforces what the client promises):
- A pain-check write without an active `face` consent on the visit is a 409 `CONSENT_REQUIRED`.
- An event with `src: 'Pain check'` must be one of the allowed answer texts, never a score (extends plan 00's event validation).
- The station-note rate limit (`configSets.face.stationNote.minGapMin`) is enforced again here; a note too soon is a 429 `RATE_LIMITED`.

- [ ] **Step 1: Write the failing e2e tests** for each check above, plus idempotency (the same `promptId` twice gives one document).
- [ ] **Step 2: Implement, then run** `npm run test:e2e`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(api): pain-check outcomes and station notes`

### Task 3.3: Frontend wiring

**Files:**
- Modify: `frontend/src/lib/sync/{index,local,firestore}.ts` (plan 00 Task B.12): add `writePainCheck(visitId, p)`, `writeStationNote(visitId, n)` and `markNoteSeen(visitId, id)`; `watchWard` includes `painChecks` and `stationNotes`
- Modify: `frontend/src/components/Station.tsx`, `StaffView.tsx` (read from `Sync` rather than local state)

- Writes go through plan 00's offline queue. The face pipeline, the prompts and the board never wait on it.
- The sensitivity sets come from the device's config set (`configSets/{id}.face`) and replace Phase 1's constants.

- [ ] **Step 1: Implement, then check two browsers against the emulators:** a board and a Station. A bedside "No" appears at the Station within 1 s, an unanswered prompt shows the note, and Seen clears it on both.
- [ ] **Step 2: Commit:** `feat(pain): pain checks synced through the backend`

---

## Phase 4: Flask inference service (optional second scorer)

Only built if Phase 5 shows the on-device scorer isn't good enough, or for a side-by-side validation study. It runs only on devices with `validationMode: true`.

### Task 4.1: Service skeleton

**Files:**
- Already scaffolded by plan 00 (Task A.4: app factory, `expression` blueprint, model registry, Dockerfile) and secured by plan 00 (Task B.13: token check and `validationMode`).
- Modify: `backend/inference/app/expression/routes.py` (replace the 501 stub), `tests/test_expression.py`

**Interface** (from your proposal):

```
POST /v1/expression-check
  body: { visitId, requestId, seq, crop: <JPEG, ≤ 50 KB, 224×224> }   (multipart, not base64-in-JSON)
  200:  { visitId, requestId, seq, modelVersion, status: 'ok' | 'unusable', score?: number }
  4xx/5xx: { status: 'unavailable', reason }
```

- The frontend's `RemoteScorer`:
  - drops responses whose `seq` is older than the last one it accepted, or whose `visitId` isn't the active visit;
  - treats `unusable` and `unavailable` as **not usable**, never as a low score;
  - sends at most 4 requests per second.
- Plan 02's heavier model tasks will be added later as separate blueprints in the same service.

- [ ] **Step 1: Write the failing tests** (pytest): an expired token gets 401; a device with `validationMode` false gets 403; the response echoes `requestId` and `seq`.
- [ ] **Step 2: Implement, then run** `pytest`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(inference): flask service skeleton with auth`

### Task 4.2: Image handling with nothing left behind

**Files:**
- Modify: `backend/inference/app/expression/routes.py`, `gunicorn.conf.py`

**Rules:**
- The crop is decoded from the request stream into memory. There are no temp files: `MAX_CONTENT_LENGTH` is 64 KB, and Werkzeug never spools to disk at that size.
- The access log format excludes bodies. Error handlers never include request data. Sentry or other error reporting, if added, gets `send_default_pii=False` and its request bodies stripped.
- References to the decoded tensor are dropped after inference.

- [ ] **Step 1: Write the failing tests**: after 100 requests, the temp directory is unchanged; captured logs contain no JPEG magic bytes (`FF D8 FF`) and no base64.
- [ ] **Step 2: Implement, then run** `pytest`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(inference): in-memory image handling with no logging`

### Task 4.3: Model adapters

**Files:**
- Create: `backend/inference/app/models/vitpain.py`, `app/models/painformer.py`, `app/models/registry.py`

**Models:**
- **ViTPain** (`xinlei55555/ViTPain`, MIT on its model card) is the first adapter. It outputs a PSPI estimate (0–16) directly, which is scaled to 0..1, with **no training**.
- **PainFormer** (`stefanosgikas/PainFormer`) is used as a frozen feature extractor plus a small classifier. It's only added if ViTPain underperforms, because it needs a trained classifier and labelled data.

**Before either ships:**
- Confirm both licences, including the DINOv3 backbone licence for ViTPain.
- Record the model hash and licence in `docs/pain/models.md`.
- No public pain dataset (UNBC-McMaster, BioVid) is used for training without checking its licence first; most are research-only.

- [ ] **Step 1: Implement the ViTPain adapter, then check latency on the target GPU:** p95 under 150 ms per crop.
- [ ] **Step 2: Commit:** `feat(inference): ViTPain adapter`

---

## Phase 5: validation

### Task 5.1: Study setup

- **Ethics:** get ethics committee approval and patient consent for recording **before** any real-patient sessions. Without that approval, only volunteer sessions are allowed, and posed grimaces from volunteers don't validate the feature.
- **Session recording mode:** a validation-only build stores, on the device and encrypted, the blendshape streams (numbers only), with timestamps and annotator labels. Video is stored only if the ethics approval allows it, and then for annotation only.
- **Conditions to cover:** ordinary blinking, yawning, mouth movement, coughing, head turns, low light, glasses, masks, older patients, a range of skin tones, one-sided facial weakness, and eye control in use.

### Task 5.2: Metrics and threshold selection

**Files:**
- Create: `tools/pain-eval/` (a Node script that replays recorded streams through `createDecider` with each candidate config)

**Metrics:**
- False prompts per hour.
- Missed annotated events.
- Median and p90 delay from the start of an annotated event to the prompt.
- How patients answered: yes, no, not sure, dismissed, none.
- How many prompts led to a confirmed report.
- Interference with eye control: dwell cancellations caused by prompts.

**Selecting thresholds:**
- For each sensitivity level, pick the config with the fewest missed events **subject to** a false-prompt ceiling agreed with ward staff (for example, at most 1 per 2 hours on Medium).
- Publish the chosen sets as a new `configSets` version. Old outcomes keep their `configSetId`, so results remain traceable.
- Compare the scorers (blendshape against ViTPain) on the same streams, and keep the better one as the default.
- **Fairness:** report every metric per subgroup (age band, skin tone, facial weakness, glasses or mask). A subgroup with clearly more false prompts or misses blocks the rollout.

- [ ] **Step 1: Build the replay tool and run it on the volunteer set.**
- [ ] **Step 2: Run it on the approved patient set, then choose and publish the config sets.** Record the reasoning in `docs/pain/validation.md`.

---

## Later
- **Fine-tuning:** only if error analysis shows the frozen approach is inadequate, as your proposal says.
- **Head pose and body movement** as extra evidence (restlessness), still prompt-only.
- **A per-patient sensitivity suggestion** from their own answer history (many "No" answers suggest lowering sensitivity), proposed to staff and never applied automatically.
- **Regulatory review:** before any claim beyond "offers a pain check", review with the hospital and the Malaysian Medical Device Authority.
