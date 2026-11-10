# 02: Eye control (gaze selection)

> For whoever implements this: work task by task and tick each step off in this file. Phase 1 is frontend only and runs on a **simulated** gaze source, so the whole feature can be shown and tested without a camera. Phase 2 swaps in the real webcam tracker (WebGazer.js) behind the same interface. Phase 3 is an evaluation page for measuring accuracy on real devices. Nothing in Phases 1–2 needs a backend; the tracker runs in the browser.
>
> **Backend touchpoints, all from [00-backend-foundation.md](00-backend-foundation.md):**
> - Camera consent is stored as `visits/{visitId}/consents/gaze` (plan 00 Task B.10).
> - Selections go through plan 00's `Sync` like any tap, with `src: 'Eye gaze'`.
> - Per-device dwell settings live in the device's config set.
> - A server-side gaze model, if Phase 3's comparison ever needs one, goes in the reserved Flask `gaze` blueprint. Plan 00 Task A.4 scaffolds it and Task B.13 secures it.

**Goal:** a patient who cannot touch the screen can build and speak a message with their eyes. Staff position the device and calibrate it. A validation step measures how accurate tracking is on this device, for this patient, and picks a layout that accuracy can support. The patient then selects cards, keys and form options by **dwelling** on them. A gaze estimate never becomes a selection on its own.

**Pipeline:**

```
camera → GazeSource (estimate) → smoothing → calibrated screen point
       → SelectionController (target hit-test + dwell + rules)
       → app action (addCard('water'), type a key, choose a form option)
       → message bar → Speak message (a deliberate dwell)
```

**Architecture:**
- **`GazeSource`** (`frontend/src/lib/gaze/source.ts`): the one seam between the UI and any tracker. Phase 1 ships `SimulatedGaze`; Phase 2 adds `WebGazerSource`. Later trackers (webgazer-ts, MediaPipe Face Landmarker plus our own regression, EyeGestures) plug in with no UI changes.
- **`SelectionController`** (`frontend/src/lib/gaze/controller.ts`): a pure state machine. It takes timestamped samples and a list of target rectangles, and emits dwell progress and selections. It has no React and no DOM, so every rule is unit-tested with synthetic sample streams.
- **Target registry** (`frontend/src/lib/gaze/targets.ts` + `useGazeTarget` hook): only registered elements can be selected. Each target has an id, a layer, a dwell time and an `onSelect` that calls the store action directly. Nothing is ever selected by synthesising a click on whatever lies under the gaze point.
- **Gaze UI** (`frontend/src/components/gaze/`): the setup flow (positioning, calibration, validation), the gaze board, the gaze keyboard, directional mode, the dwell ring, and the presenter controls.

**Tech stack:** the existing frontend (React 19, TypeScript, Zustand, Tailwind v4, Vite). Phase 1 adds **no dependencies**. Phase 2 adds `webgazer` (npm, 3.5.x), loaded with a dynamic `import()` only when eye control starts, because it bundles TensorFlow.js. Phase 3 adds `jspsych` with `@jspsych/plugin-webgazer-*` and `@jspsych/extension-webgazer`, on a separate page only.

**Devices:** laptop first (1366×768 and 1920×1080, webcam above the screen). Landscape tablets also supported (1024×768, 1180×820, front camera on the long edge). Gaze mode is landscape only; a portrait tablet shows "Turn the tablet sideways".

## Global constraints
- **Never a raw click:** selection only comes from a completed dwell on a registered target in the active layer. Gaze is never turned into a pointer event.
- **Dwell defaults:**

  | Target | Dwell |
  |---|---|
  | Normal targets | **1000 ms** (staff can set 600–2000 ms per patient, in 100 ms steps) |
  | Emergency | **2×** the dwell |
  | Resume (while paused) | **2000 ms**, fixed |

- **Controller rules** (each one is a test in Task 1.2):

  | Situation | Behaviour |
  |---|---|
  | Gaze moves to another target | Reset the previous target's countdown; start the new one |
  | Gaze leaves for less than `GRACE_MS` (150) | Keep counting |
  | Gaze is near a target's edge | Exit only when outside the rectangle grown by `HYSTERESIS` (15%) |
  | Gaze lands in a gap between targets | Snap to the nearest target within `snapRadius` (set from validation), otherwise none |
  | No sample for `STALE_MS` (200), or the source reports no face | Cancel the countdown and show "Can't see your eyes" |
  | Patient keeps looking after a selection | No repeat until gaze has been off that target for `REFRACTORY_MS` (300) |
  | A modal opens or closes, the keyboard page changes, or the layout changes | Clear the current target; a fresh dwell is required |
  | Patient pauses eye control | No selections except Resume; the message stays intact |
  | Eye control is off | The controller is stopped and the camera is released |

- **Smoothing:** the controller works on the median of samples from the last `SMOOTH_MS` (200), never on single raw samples.
- **No gaze cursor for the patient:** only the captured target shows feedback (outline plus progress ring). A jittery cursor makes patients chase it. The presenter can show a small debug dot (Task 1.10); it is hidden by default.
- **Validation decides density, not calibration:** finishing calibration never unlocks the keyboard or a denser grid by itself. The layout is picked from validation results (Task 1.5) and staff can only choose a **less** dense layout than recommended.
- **Spoken feedback:** each selection is spoken as it is added. This is the existing card behaviour, and it lets the patient hear right away whether the right card was picked. The full message is only spoken when the patient dwells on **Speak message**; it is never spoken automatically. **Undo last** is always on screen.
- **Touch still works:** staff can tap anything at any time. Gaze mode adds a way to select; it doesn't block touch.
- **Privacy:** camera frames are processed in the browser and never stored or sent. A visible "Camera on" indicator shows while the camera is running. Calibration data lives in memory for the current visit only and is cleared on **New visit** and when eye control is turned off.
- **Consent (with the backend):**
  - Starting eye-control setup records `consents/gaze` through `PUT /v1/visits/:visitId/consents/gaze` (plan 00).
  - Turning it off, or New visit, revokes it.
  - In the presentation build (`local` sync), consent is kept on the device only.
- **Simulation is labelled:** while `SimulatedGaze` is the source, a "Simulated gaze" tag is always visible (the same idea as the existing "Simulated AI output" note).
- **Bilingual:** every patient-facing string has English and Malay (`Bi`). Staff-only setup screens follow the existing staff screens, which are English with Malay where the patient also reads them.
- **Look and feel:** reuse `Sheet`, `SheetTitle`, `Step`, `optBase`/`optIdle`/`optOn`, `btnPrimary`/`btnAlt`, `Tip`, `Badge` and the card colour categories (`data-cat`). Add no UI library. Motion follows the existing tokens (`ease-spring`, `animate-fade-up`), and the dwell ring respects `prefers-reduced-motion` by filling without easing.

## Review focus
- **The patient looks at Water, then at Toilet after 700 ms:** Water's ring resets to zero, and Toilet starts from zero. Neither is selected. Task 1.2.
- **Gaze sits on Water for 3 s:** Water is added once, not three times. Task 1.2.
- **The tracker loses the face 600 ms into a dwell:** the ring cancels; when the face returns, the dwell starts again from zero. Task 1.2.
- **Jitter along the edge between two cards:** neither countdown flickers back to zero (hysteresis plus grace). Task 1.2.
- **The allergy dialog opens while a dwell is running on the board:** the board target is cleared, and the dialog's options need a fresh dwell. Task 1.3.
- **Paused:** looking at cards does nothing, and only Resume responds. The message is unchanged after resuming. Task 1.9.
- **Validation is poor:** the grid layouts and the keyboard aren't offered; directional mode or "Reposition and calibrate again" is. Task 1.5.
- **Staff try to pick a denser layout than validation allows:** the option is shown but disabled, with the reason. Task 1.5.
- **Emergency:** needs 2× the dwell, and once triggered behaves exactly like the footer button (same alarm, same log). Task 1.9.
- **New visit:** calibration and validation are cleared, and the next patient starts at positioning. Task 1.4.
- **Autoplay demo:** it adds Water exactly once, then speaks the message, and leaves the board in a normal state when it ends or is stopped. Task 1.10.
- **Turning eye control off:** the camera is released (Phase 2 asserts the media track is stopped). Task 2.1.

## Commands
- Tests: `cd frontend && npm test` (Node's built-in test runner; tests import with `.ts` extensions). Task 1.1 widens the script to `node --test src/lib/*.test.ts src/lib/gaze/*.test.ts`.
- Types: `cd frontend && npx tsc --noEmit`
- Build: `cd frontend && npm run build`
- Design check: `impeccable detect --json src` after each UI task.

---

## Phase 1: frontend with simulated gaze (no camera)

### Task 1.1: Gaze types, the `GazeSource` interface and `SimulatedGaze`

**Files:**
- Create: `frontend/src/lib/gaze/types.ts`, `frontend/src/lib/gaze/source.ts`, `frontend/src/lib/gaze/simulated.ts`, `frontend/src/lib/gaze/smooth.ts`
- Modify: `frontend/package.json` (widen the `test` script)
- Test: `frontend/src/lib/gaze/smooth.test.ts`, `frontend/src/lib/gaze/simulated.test.ts`

**Interfaces:**

```ts
export type GazeSample = { x: number; y: number; t: number }      // viewport px, performance.now() ms
export type SourceStatus = 'idle' | 'starting' | 'tracking' | 'no-face' | 'denied' | 'error'

export interface GazeSource {
  readonly kind: 'simulated' | 'webgazer'
  start(): Promise<void>
  stop(): void                                   // releases the camera
  onSample(cb: (s: GazeSample) => void): () => void
  onStatus(cb: (s: SourceStatus) => void): () => void
  /** Calibration: teach that the patient is looking at (x, y) now. */
  train(x: number, y: number): void
  /** Forget everything learned (new patient, recalibrate). */
  reset(): void
  /** Positioning screen: is a face visible, centred, at a usable distance? */
  facePlacement(): { found: boolean; centred: boolean; distance: 'near' | 'ok' | 'far' } | null
}

/** Accuracy profiles the presenter can switch between. errorPx is the 1-sigma noise radius. */
export type SimProfile = 'good' | 'ok' | 'poor'
export const SIM_ERROR: Record<SimProfile, { errorPx: number; biasPx: [number, number]; hz: number }>
// good: 70 px, ok: 150 px, poor: 260 px with a fixed bias; ~30 Hz like a webcam

export function simulatedGaze(opts: { profile: SimProfile }): GazeSource & {
  /** Mouse/touch position drives "where the eyes look"; noise from the profile is added. */
  followPointer(on: boolean): void
  /** Scripted path for autoplay: a list of fixations with durations. */
  play(path: { x: number; y: number; ms: number }[]): Promise<void>
  setProfile(p: SimProfile): void
  /** Simulate losing the face, for demoing the recovery state. */
  dropFace(ms: number): void
}

/** Median of samples within the last windowMs; null when none are fresh. */
export function smoothed(buf: GazeSample[], now: number, windowMs?: number): { x: number; y: number } | null
```

- Simulated noise must be seeded (a small PRNG) so tests are repeatable.
- `facePlacement()` in the simulation returns "found, centred, ok" unless `dropFace` is active.

- [ ] **Step 1: Write the failing tests**

```ts
it("smoothed ignores samples older than the window and returns null when stale", ...);
it("median rejects a single outlier spike", ...);
it("simulated noise at profile 'ok' stays within ~3 sigma for 99% of 10k samples", ...);
it("dropFace emits 'no-face' and no samples for its duration", ...);
```

- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(gaze): gaze source interface and simulated source`

### Task 1.2: Selection controller

**Files:**
- Create: `frontend/src/lib/gaze/controller.ts`, `frontend/src/lib/gaze/constants.ts`
- Test: `frontend/src/lib/gaze/controller.test.ts`

**Interfaces:**

```ts
export type Rect = { left: number; top: number; right: number; bottom: number }
export type TargetSpec = { id: string; layer: string; rect: Rect; dwellMs: number; disabled?: boolean }

export type ControllerState =
  | { mode: 'idle' }                                               // no target under gaze
  | { mode: 'dwelling'; id: string; since: number; progress: number }  // 0..1
  | { mode: 'refractory'; id: string }                             // just selected; waiting for gaze to leave
  | { mode: 'lost' }                                               // stale samples or no face
  | { mode: 'paused' }

export type ControllerEvent =
  | { type: 'sample'; s: GazeSample }
  | { type: 'tick'; t: number }                     // rAF clock, so progress advances between samples
  | { type: 'targets'; list: TargetSpec[]; activeLayer: string }   // layout or layer changed
  | { type: 'status'; status: SourceStatus }
  | { type: 'pause' } | { type: 'resume' }

export type Output = { state: ControllerState; selected?: string }   // selected fires once per completed dwell

export function createController(opts?: Partial<typeof DEFAULTS>): { step(e: ControllerEvent): Output; reset(): void }
// constants.ts: DWELL_MS 1000, GRACE_MS 150, HYSTERESIS 0.15, STALE_MS 200, REFRACTORY_MS 300, SMOOTH_MS 200
```

- Pure and synchronous: time only comes from event timestamps, so tests drive a fake clock.
- `targets` with a different `activeLayer`, or a list that no longer holds the current target, clears the current dwell (the "fresh dwell" rule).
- While paused, only targets with `layer: 'resume'` can complete.

- [ ] **Step 1: Write the failing tests**: one per row of the Controller rules table, and each Review focus item marked Task 1.2, plus:

```ts
it("progress is monotonic while gaze stays on one target", ...);
it("a disabled target never completes", ...);
it("per-target dwellMs is honoured (emergency 2x)", ...);
it("snapRadius 0 means gaps select nothing", ...);
```

- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(gaze): selection controller with dwell rules`

### Task 1.3: Target registry and `useGazeTarget`

**Files:**
- Create: `frontend/src/lib/gaze/targets.ts`, `frontend/src/components/gaze/useGazeTarget.ts`, `frontend/src/components/gaze/GazeRuntime.tsx`
- Modify: `frontend/src/App.tsx` (mount `<GazeRuntime/>` when eye control is on)
- Test: `frontend/src/lib/gaze/targets.test.ts`

**Interfaces:**

```ts
/** Register an element as selectable by gaze. Returns a ref and the live dwell state for drawing. */
export function useGazeTarget<T extends HTMLElement>(id: string, onSelect: () => void, opts?: {
  layer?: string            // default 'board'; dialogs use 'modal', the keyboard 'keyboard', pause uses 'resume'
  dwellMs?: number          // default from settings
  disabled?: boolean
}): { ref: React.RefCallback<T>; state: 'idle' | 'dwelling' | 'refractory'; progress: number }
```

- **Rects:** read with `getBoundingClientRect()`. Re-read on mount, on `ResizeObserver`, on scroll, on layout and layer change. Never re-read per sample.
- **Active layer:** the topmost layer with at least one mounted target wins (`resume` > `modal` > `keyboard` > `board`). Opening the allergy dialog therefore moves gaze to its options with no extra wiring.
- **`GazeRuntime`:** owns the source, the controller and a `requestAnimationFrame` loop. It feeds samples, ticks and target lists into the controller, then calls `onSelect` for `selected` and publishes dwell state to the hooks.
- **Logging:** each selection logs through the existing store with `src: 'Eye gaze'`, so the Station and Staff view show how a message was made.

- [ ] **Step 1: Write the failing tests**: the layer priority; a target that unmounts mid-dwell clears the dwell; rects refresh after a resize.
- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(gaze): target registry and runtime`

### Task 1.4: Eye-control state in the store

**Files:**
- Modify: `frontend/src/store.ts`, `frontend/src/lib/types.ts`
- Test: extend `frontend/src/lib/store.test.ts`

**Interfaces:**

```ts
type GazeLayout = 'grid9' | 'grid6' | 'grid4' | 'directional'
type Validation = { at: number; medianErrPx: number; p80ErrPx: number; inRadiusPct: number; points: { x: number; y: number; errPx: number }[] }

// store
eye: {
  phase: 'off' | 'position' | 'calibrate' | 'validate' | 'on' | 'paused'
  source: 'simulated' | 'webgazer'
  dwellMs: number                 // persisted per device (it's a staff setting, not patient data)
  validation: Validation | null   // per visit, never persisted
  layout: GazeLayout | null       // chosen after validation
  allowed: GazeLayout[]           // what validation supports, densest first
}
startEyeSetup(): void; setEyePhase(p): void; setValidation(v): void; chooseLayout(l): void
pauseEye(): void; resumeEye(): void; stopEye(): void
```

- `newVisit()` and `stopEye()` clear `validation`, `layout` and `allowed`, and set `phase: 'off'`.
- `partialize` persists `eye.dwellMs` only.
- **With the backend (plan 00):**
  - The default `dwellMs` comes from the device's config set (`configSets/{id}.gaze.dwellMs`); a staff change on the device overrides it locally.
  - `startEyeSetup()` and `stopEye()` also write and revoke `consents/gaze` through `Sync`.

- [ ] **Step 1: Write the failing tests**: New visit clears calibration; dwell survives a reload; `chooseLayout` refuses a layout not in `allowed`.
- [ ] **Step 2: Implement, then run** `npm test`. Expected: PASS.
- [ ] **Step 3: Commit:** `feat(gaze): eye-control state`

### Task 1.5: Setup flow (positioning, calibration, validation)

**Files:**
- Create: `frontend/src/components/gaze/Setup.tsx`, `frontend/src/lib/gaze/validate.ts`
- Test: `frontend/src/lib/gaze/validate.test.ts`

**Screens.** A full-screen sheet with a three-step progress header. Staff drive it with their own taps, and the patient only looks.

1. **Position the device (staff).**
   - A live preview: in simulation, an illustrated face in a frame; in Phase 2, the real camera.
   - Three checks that tick: "Face found", "Face centred", "Distance OK (about an arm's length)".
   - A short tip: "Screen at eye level, light in front of the patient, not behind."
   - **Next** is enabled once all three tick. Staff can override with "Continue anyway".
2. **Calibrate (patient looks, nobody clicks).**
   - 9 targets on a 3×3 grid across the usable area, with 8% margins from the edges.
   - Each target is a large ring (about 64 px) that shrinks slowly to a dot over **2.5 s**.
   - Training only uses samples between **0.8 s and 2.3 s**, which skips the eye's movement onto the target.
   - The patient hears "Look at the circle" / "Lihat bulatan" once, at the start.
   - Staff controls: **Pause**, **Repeat this point**, **Restart**.
   - Order: centre first, then clockwise from top-left, so the first target is easy to find.
3. **Check accuracy (validation, no training).**
   - 5 *new* points: the centre and four points at 25% and 75% of width and height, all different from the calibration points.
   - Samples are recorded for 1.5 s per point **without calling `train()`**.
   - The results screen shows:
     - a plain verdict: "Good", "Usable with large buttons" or "Not reliable yet";
     - a small screen map with each point's error drawn as a circle;
     - the numbers, behind a "Details" toggle for staff.
   - The layout choice lists all layouts. The recommended one is pre-selected; denser ones are disabled with the reason ("Needs better accuracy"). There is a dwell-time stepper (600–2000 ms), plus **Start eye control** or **Calibrate again**.

**Layout rule** (`validate.ts`, pure): a layout is allowed when at least 80% of validation samples fall within **R** of their target, where R is half the smaller side of that layout's cell on this screen. Allowed layouts are listed densest first:

| Layout | Grid | Typical cell on a 1366×768 laptop |
|---|---|---|
| `grid9` | 3×3 | about 300×180 px |
| `grid6` | 3×2 | about 300×280 px |
| `grid4` | 2×2 | about 450×280 px |
| `directional` | left / right / up | always allowed when the horizontal error is under 25% of the screen width |

If not even `directional` passes, the only actions are "Reposition the device" and "Calibrate again". `snapRadius` for the controller is set to the measured p80 error, capped at half the gap between cards.

- [ ] **Step 1: Write the failing tests** for `validate.ts`:

```ts
it("good accuracy allows grid9 and everything below it", ...);
it("200 px p80 error on 1366x768 allows grid4 and directional only", ...);
it("large horizontal bias fails directional and asks to reposition", ...);
it("validation points are never used for training", ...); // spy on source.train
```

- [ ] **Step 2: Implement the screens and check them in the browser at 1366×768 and 1024×768**, in all three simulation profiles. Each profile should land on a different recommendation.
- [ ] **Step 3: Commit:** `feat(gaze): positioning, calibration and validation`

### Task 1.6: Gaze board

**Files:**
- Create: `frontend/src/components/gaze/GazeBoard.tsx`, `frontend/src/components/gaze/DwellRing.tsx`, `frontend/src/lib/gaze/pages.ts`
- Modify: `frontend/src/App.tsx` (when `eye.phase` is `on` or `paused`, the gaze board replaces the touch board area; the top bar and footer stay)
- Test: `frontend/src/lib/gaze/pages.test.ts`

**Layout (landscape):**
- **Top:** the existing message bar, read-only in gaze mode, large and two lines.
- **Right rail** (fixed, always the same place): **Speak message**, **Undo last**, **Keyboard**, **Pause**. Each is as tall as a grid cell.
- **Bottom right:** Emergency, the existing footer button, also registered as a gaze target with 2× dwell and a red ring.
- **Main area:** the grid (`grid9`/`grid6`/`grid4`) of the current page of cards.

**Pages** (`pages.ts`, pure): the current tab's cards are split into pages that fit the grid, keeping the existing colour order. The last cell of each page is **More** (next page; it wraps to the first). "Quick replies" (Yes, No, Not sure, Please repeat, Wait) is its own first page, because answering staff is the most common need.

**Feedback per target:**
- **Dwelling:** a 3 px outline in the card's colour, plus a ring that fills clockwise around the card's icon over the dwell time.
- **Selected:** a short tick (the existing `animate-tick`), and the item is spoken.
- **Refractory:** the card dims slightly until gaze leaves it.
- **Lost tracking:** a calm banner, "Can't see your eyes · Tidak nampak mata anda", with no red.

**Actions:** selections call `addCard(k)`, `addItem(quick reply)`, `speakMessage()`, `removeItem(last uid)` and `startAlarm()` directly.

- [ ] **Step 1: Write the failing tests** for `pages.ts`: every card appears exactly once across pages; More is always last; quick replies are page 1.
- [ ] **Step 2: Implement, then check in the browser** with the simulated source following the mouse: water is added once, the ring resets when moving to another card, and the Emergency ring needs twice as long.
- [ ] **Step 3: Commit:** `feat(gaze): gaze board with dwell feedback`

### Task 1.7: Directional mode (Look to Speak style)

**Files:**
- Create: `frontend/src/components/gaze/Directional.tsx`, `frontend/src/lib/gaze/directional.ts`
- Test: `frontend/src/lib/gaze/directional.test.ts`

**How it works:**
- The screen shows the current choices split into a **left** half and a **right** half, as two tall columns. A strip at the **top** means "Back / Undo".
- Looking at a column for the dwell time keeps that half, and the halves split again. One item left is selected.
- A list of 16 phrases takes 4 dwells. The list is quick replies plus the current tab's cards.
- **Hit-testing uses regions, not cards:** the left 40% of the screen, the right 40%, and the top 18%. The middle band selects nothing, which gives the eyes a resting place.
- Speak and Emergency are still reachable: they sit in the first split's right column ("Speak / Emergency / More…").

**Interface:** `narrow(list, side): list` and `regionOf(point, viewport): 'left' | 'right' | 'up' | null`.

- [ ] **Step 1: Write the failing tests**: 16 items in 4 steps; Back restores the previous split; the middle band returns `null`.
- [ ] **Step 2: Implement, then check in the browser** with the `poor` simulation profile. Selections should still be reliable.
- [ ] **Step 3: Commit:** `feat(gaze): directional selection mode`

### Task 1.8: Gaze keyboard

**Files:**
- Create: `frontend/src/components/gaze/GazeKeyboard.tsx`, `frontend/src/lib/gaze/keys.ts`
- Test: `frontend/src/lib/gaze/keys.test.ts`

**Layout:** two-step selection, so every key stays large. It needs at least `grid6` (it is disabled in `grid4` and `directional`, with the reason shown).
- **Step one:** six group keys on a 3×2 grid: `A B C D E`, `F G H I J`, `K L M N O`, `P Q R S T`, `U V W X Y`, `Z · space · . ?`.
- **Step two:** dwelling on a group replaces the grid with that group's letters as single large keys, plus **Back**. Choosing a letter returns to the groups.
- **A word-prediction row above the grid** uses the existing `wordSuggestions()` and `insertWord()` from `lib/text.ts`. It shows up to 3 words, and each one is a gaze target.
- **Right rail while the keyboard is open:** **Delete letter**, **Delete word**, **Add to message** (adds the typed text the way the Type tab does), **Close keyboard**.
- The typed text shows large at the top in the message bar position, with a blinking caret.
- Changing between the groups and letters steps changes the layer revision, so a fresh dwell is required.

- [ ] **Step 1: Write the failing tests**: typing "AIR" takes 6 dwells (3 groups plus 3 letters); a word-prediction pick replaces the partial word; Delete word removes back to the previous space.
- [ ] **Step 2: Implement, then check in the browser** by typing "saya" with the mouse-driven simulation.
- [ ] **Step 3: Commit:** `feat(gaze): two-step gaze keyboard with word prediction`

### Task 1.9: Pause, resume, Emergency and dialogs by gaze

**Files:**
- Modify: `frontend/src/components/gaze/GazeBoard.tsx`, `frontend/src/components/Modals.tsx` (`Options`, Cancel and Save register as `modal`-layer targets when eye control is on), `frontend/src/lib/flows.ts` (add `painGaze`, a guided flow for when the 3D body map can't be used by gaze)
- Test: extend `frontend/src/lib/flows.test.ts`

**Behaviour:**
- **Pause:** dwelling on Pause dims the board, and one target remains: **Resume** in the top-right corner, with a 2 s dwell. The camera keeps running so Resume can be seen, the message is untouched, and staff can also tap Resume.
- **Emergency:** reachable from every gaze screen at 2× dwell. It triggers the existing `startAlarm()`, and the alarm overlay works as it does today.
- **Dialogs:** every guided flow (Register, Symptoms, Allergy and the rest) works by gaze, because its option buttons become `modal`-layer targets. The allergy dialog's danger warning Emergency button is a target too.
- **Pain in gaze mode:** the Pain card opens `painGaze` instead of the 3D map. It has three steps: area (Head, Chest, Stomach, Back, Arm, Leg), side (Left, Right, Both, Middle) and a 0–10 score shown as 11 large keys in two rows. It produces the same sentence as the body map.

- [ ] **Step 1: Write the failing tests**: `painGaze` produces the same sentence as the body map for the same site and score; paused blocks board targets (controller test from Task 1.2 reused).
- [ ] **Step 2: Implement, then check in the browser:** open Allergy by gaze, choose "reaction now", "seafood" and "throat tight", and confirm the danger warning's Emergency is reachable by gaze.
- [ ] **Step 3: Commit:** `feat(gaze): pause, emergency and guided dialogs by gaze`

### Task 1.10: Presenter controls and the Water autoplay

**Files:**
- Create: `frontend/src/components/gaze/Presenter.tsx`, `frontend/src/lib/gaze/demo.ts`
- Test: `frontend/src/lib/gaze/demo.test.ts`

**Presenter panel:** a small collapsible panel in the bottom-left corner, shown only while the source is simulated.
- "Simulated gaze" tag (always visible, even when the panel is collapsed).
- **Gaze from:** Mouse / Autoplay.
- **Accuracy:** Good / OK / Poor (switches `SimProfile` live; the next validation reflects it).
- **Show gaze dot** (off by default): a small translucent dot for the audience.
- **Lose face for 2 s**, to show the recovery banner.
- **Skip setup**, which jumps to the gaze board with the "Good" validation, for quick demos.

**Water autoplay** (`demo.ts` builds the path from live target rects, so it works on any screen size):
1. Gaze wanders for 1.5 s across the board: short stops on Toilet (400 ms) and Help (300 ms). Their rings start and reset.
2. Gaze moves to **Water** and stays. The ring fills over 1 s, then Water is added, spoken, and ticked.
3. Gaze stays on Water for another 1 s and nothing more happens (the refractory state, shown dimmed).
4. Gaze moves away to the message bar for 800 ms, then to **Speak message**. The ring fills, and the message is spoken.
5. The demo ends and hands back to Mouse mode. Stopping it at any point leaves the board in a normal state.

- [ ] **Step 1: Write the failing test**: replaying the autoplay path through the controller selects exactly `['water', 'speak']`, in that order.
- [ ] **Step 2: Implement, then run the autoplay at 1366×768 and 1024×768.**
- [ ] **Step 3: Commit:** `feat(gaze): presenter controls and water autoplay`

### Task 1.11: Entry points, guide and logging

**Files:**
- Modify: `frontend/src/components/TopBar.tsx` (Staff menu: "Eye control", subtitle "Calibrate and let the patient select by looking"), `frontend/src/components/Guide.tsx` (a short eye-control section for staff), `frontend/src/components/Station.tsx` and `StaffView.tsx` (rows made by gaze show a small "Eye gaze" source; the station header shows "Eye control on / paused" per board)
- Test: manual check in the browser

**What staff see:**
- The top bar shows a small **Eye control** status chip while it's on: "On · 1.0 s", "Paused" or "Can't see eyes". Tapping it opens: Pause/Resume, Recalibrate, Change dwell, Turn off.
- **Drift check:** if the patient uses **Undo last** 3 times within 2 minutes, a staff toast offers "Selections look off. Check accuracy?" and opens a 3-point quick validation.

- [ ] **Step 1: Implement, then do a full run in the browser:** Staff menu → Eye control → position → calibrate → validate → board → add Water by gaze → Speak → Pause → Resume → New visit (starts from positioning again).
- [ ] **Step 2: Run** `npm test`, `npx tsc --noEmit`, `npm run build` and `impeccable detect --json src`. All clean.
- [ ] **Step 3: Commit:** `feat(gaze): eye control entry points and staff guide`

**Phase 1 done when:** all tests pass, types and build are clean, the detector reports nothing, and the full run above works on a laptop (1366×768) and a landscape tablet size (1024×768) in all three simulation profiles.

---

## Phase 2: real webcam tracking (WebGazer.js)

### Task 2.1: `WebGazerSource`

**Files:**
- Create: `frontend/src/lib/gaze/webgazer.ts`
- Modify: `frontend/package.json` (add `webgazer`), `frontend/src/components/gaze/Setup.tsx` (show the real camera preview on the positioning screen)

**Interfaces:** implements `GazeSource`.
- `start()`: dynamic `import('webgazer')`, then configure it:

  ```ts
  webgazer.saveDataAcrossSessions(false)   // shared hospital device: no model carried between patients
  webgazer.removeMouseEventListeners()     // staff taps must never train the model
  webgazer.applyKalmanFilter(true)
  webgazer.showPredictionPoints(false)
  webgazer.showVideoPreview(false)         // we draw our own preview on the positioning screen only
  webgazer.setGazeListener((data, t) => data && emit({ x: data.x, y: data.y, t: performance.now() }))
  await webgazer.begin()
  ```

- `train(x, y)` calls `webgazer.recordScreenPosition(x, y, 'click')`, and only during calibration fixation windows.
- `facePlacement()` is derived from the face-detection box WebGazer exposes. Centred means within 15% of the frame centre; distance comes from the face box width.
- `stop()` calls `webgazer.end()` **and** stops every track on the video stream.
- Camera permission denied: the status is `denied`. The setup screen explains how to allow the camera, offers **Try again**, and still offers the simulated mode for a demo.

- [ ] **Step 1: Implement, then check in Chrome and Edge on a laptop:** allow the camera, deny it, then turn eye control off and confirm the browser's camera indicator goes off.
- [ ] **Step 2: Commit:** `feat(gaze): WebGazer source`

### Task 2.2: Real calibration and validation

**Files:**
- Modify: `frontend/src/components/gaze/Setup.tsx`, `frontend/src/lib/gaze/validate.ts`

- Calibration feeds `train()` with real samples inside each fixation window (Task 1.5 timings).
- Validation records raw samples with **no training**, and computes the same metrics jsPsych's `webgazer-validate` reports (average offset, precision, percent within radius), so results can be compared with Phase 3.
- Expect roughly 130–210 px of error on a typical laptop webcam (about 4° of visual angle); the layout rule handles the rest.

- [ ] **Step 1: Calibrate on 3 different laptops and 1 tablet, under ward-like lighting.** Record the validation numbers in `docs/gaze/device-results.md`.
- [ ] **Step 2: Commit:** `feat(gaze): real calibration and validation`

### Task 2.3: Tuning with real users

- Run the full flow with at least 5 people (staff volunteers first), on laptop and tablet:
  - accidental selections per minute;
  - time to add Water and speak;
  - time to type "air" by keyboard;
  - Undo count;
  - comfort, asked afterwards.
- Adjust only the constants file (`DWELL_MS`, `GRACE_MS`, `HYSTERESIS`, `STALE_MS`, `REFRACTORY_MS`, `SMOOTH_MS`) and the layout rule's thresholds. Record every change and the reason in `docs/gaze/tuning.md`.

- [ ] **Step 1: Run the sessions and record the results.**
- [ ] **Step 2: Commit:** `chore(gaze): tuned constants from user sessions`

---

## Phase 3: evaluation page (jsPsych)

### Task 3.1: `/gaze-lab.html`

**Files:**
- Create: `frontend/gaze-lab.html`, `frontend/src/lab/main.ts` (a separate Vite entry, not part of the board bundle)
- Modify: `frontend/vite.config.ts` (second input), `frontend/package.json` (add `jspsych`, `@jspsych/extension-webgazer`, `@jspsych/plugin-webgazer-init-camera`, `@jspsych/plugin-webgazer-calibrate`, `@jspsych/plugin-webgazer-validate`)

**What it does:**
- Runs the jsPsych `webgazer-init-camera`, then `webgazer-calibrate` in **view** mode (no clicking), then `webgazer-validate`.
- Repeats calibration when any point's `percent_in_roi` is below 50, like the jsPsych example.
- A short task: dwell on targets of 3 sizes at 3 dwell times, logging hits, misses and time to select.
- **Download CSV** of all results. Nothing is uploaded.

- [ ] **Step 1: Implement and run it on the devices from Task 2.2.**
- [ ] **Step 2: Commit:** `feat(lab): jsPsych gaze evaluation page`

### Task 3.2: Compare trackers

- Add a second `GazeSource` behind the same interface, either **webgazer-ts** or **MediaPipe Face Landmarker** with our own ridge regression on iris landmarks.
- Run the lab page with both sources on the same devices, and keep the better one as the default. The UI code shouldn't change.
- Check licences before adding any tracker. EyeGestures' Python package is GPL-3, and the npm package's licence must be confirmed before use.

- [ ] **Step 1: Implement the second source and compare.** Record the results in `docs/gaze/device-results.md`.
- [ ] **Step 2: Commit:** `feat(gaze): alternative tracker behind GazeSource`

---

## Later
- **Blink or head gesture as a "click" switch** (MediaPipe blendshapes and head pose), for patients who tire with dwell. Blink thresholds vary a lot between people, so this needs per-patient tuning.
- **Directional typing:** halve the alphabet left or right, for patients whose accuracy only supports directional mode.
- **Gaze-operable 3D body map:** large region hotspots on the model instead of `painGaze`.
- **Adaptive dwell:** shorten the dwell slowly as a patient's selections stay accurate, and lengthen it after Undos (research found adjustable dwell improved novice typing).
- **Per-patient saved calibration**, only if the hospital wants it and consents allow it. It's off by design today.
