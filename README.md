# Signova

Signova is a tablet **communication board (AAC)** for hospital patients who **can hear but cannot speak**. Examples: patients after a stroke or intubation, with a tracheostomy, or deaf patients who prefer pictures and text. The patient taps cards, quick replies, a 3D body map or a keyboard. Each choice is **spoken aloud** in English or Malay and built into a large message that staff can read across a counter. Staff get a log of everything the patient said, a summary, and pain trends.

It has two **profiles** that change the cards and the header, while every zone stays in the same place on screen:

- **Front desk** (Counter 3): registration, appointments, directions, pain, symptoms.
- **Bedside** (Wad 5B · Katil 12): needs, care, feelings, questions for staff, night mode, shift handover.

> **Status:** frontend only. There is no backend, database, login or real AI yet. State lives in memory, and **reloading the page resets it** (it starts with a demo visit already in progress). "Staff: ask by voice", the AI wording suggestions and the AI summary are **simulated** with rules. Speech output uses the browser's built-in speech synthesis.

---

## Quick start

**Needs:** Node.js **22.18 or newer** (the tests run TypeScript directly through Node; developed on Node 24.12), and npm.

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

| Command (run in `frontend/`) | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Logic tests (Node's built-in test runner, no extra framework) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck, then production build into `frontend/dist/` |
| `npm run preview` | Serve the production build (http://localhost:4173) |

**Tips**
- **Windows, page won't load on `127.0.0.1`:** Vite may be listening on IPv6 only. Use `http://localhost:5173`, or start it with `npx vite --host 127.0.0.1`.
- **Speech needs installed voices:** the browser must have English and Malay (`ms-MY`) text-to-speech voices. Chrome on Android tablets and Edge on Windows usually do. Without them, the board still works and shows a "Speaking: …" toast.
- **3D needs WebGL:** the pain map uses WebGL. If it's unavailable, the body-part buttons still work.

---

## What's in the repo

```
signova/
├── README.md                          ← this file
├── Signova AAC Board Mockup.html      ← the original single-file design mockup: the VISUAL SPEC
├── docs/
│   └── plan/
│       └── 01-assistant-dialogs.md    ← next piece of work (task-by-task plan, see "What's next")
└── frontend/                          ← the React app
    ├── index.html                     ← page shell; loads the Atkinson Hyperlegible Next font
    ├── package.json                   ← scripts and dependencies
    ├── tsconfig.json                  ← strict TS; imports use explicit .ts/.tsx extensions
    ├── vite.config.ts                 ← Vite + React + Tailwind plugins
    ├── public/models/                 ← 3D anatomy for the pain map (served as static files)
    │   ├── body.glb                   ← muscle model, the tappable "Body" layer (~1.9 MB)
    │   ├── inside.glb                 ← organ model, the "Inside" layer (~1.1 MB)
    │   └── README.md                  ← where the models came from and how they were processed
    ├── scripts/
    │   └── prepare-anatomy.mjs        ← one-off: rebuilds body.glb / inside.glb from the source models
    └── src/
        ├── main.tsx                   ← React entry
        ├── App.tsx                    ← layout shell, overlays, Escape key, night mode, 3D preload
        ├── index.css                  ← design tokens (light + night), Tailwind theme, keyframes
        ├── store.ts                   ← the ONE Zustand store: all board state and actions
        ├── lib/                       ← plain TypeScript, no React (testable with Node)
        │   ├── types.ts               ← shared types: Lang, Bi (EN/BM text), Item, LogEvent, IconName…
        │   ├── vocab.ts               ← ALL board content: cards, quick replies, profiles, staff questions,
        │   │                            body parts and sub-areas, pain types, symptoms, word list
        │   ├── text.ts                ← message logic: pain/symptom sentences, AI wording + fact guard,
        │   │                            suggested row, word suggestions, staff summary
        │   ├── bodymap.ts             ← maps any point on the 3D body to part / area / side
        │   ├── speech.ts              ← speech synthesis wrapper and the emergency alarm beep
        │   ├── preload.ts             ← model URLs; warms the 3D code and models while idle
        │   ├── text.test.ts           ← tests for text.ts
        │   └── bodymap.test.ts        ← tests for bodymap.ts
        └── components/
            ├── TopBar.tsx             ← logo, profile switch, language EN/BM, staff mic, staff menu
            ├── Composer.tsx           ← message bar: chips, big message, Speak/Replay/Stop/Clear, AI wording strip
            ├── Board.tsx              ← quick-reply rail, staff question, tabs, suggested row, card grid
            ├── Panels.tsx             ← Type tab (with word suggestions) and Draw tab (canvas)
            ├── Modals.tsx             ← Pain map dialog (guided steps) and Symptoms dialog
            ├── Body3D.tsx             ← the 3D body (three.js), lazy-loaded inside the Pain map
            ├── StaffView.tsx          ← staff screen: message log, AI summary, pain trend chart
            ├── Overlays.tsx           ← footer + Emergency, alarm, large drawing, layout notes, toast
            ├── Icon.tsx               ← SVG icon sprite + <Icon name="…"/>
            └── ui.tsx                 ← shared bits: Badge, Step, Sheet, buttons, option styles, useFlash
```

---

## How it works

### State
Everything lives in **one Zustand store** (`src/store.ts`): profile, language, tab, message items, the staff log per profile, the open dialog, night mode, layout notes, alarm and toast. Actions such as `addCard`, `addItem`, `speak`, `logEvent`, `switchProfile` and `startAlarm` live in the store too.

Components subscribe to **only the slices they need** (`useBoard(s => s.lang)`), and they call actions through `useBoard.getState()` so they don't re-render for nothing.

Short-lived form state stays local to its component, for example the pain and symptom drafts and the Type tab's text.

### Content
Every card, label and sentence is data in `src/lib/vocab.ts`. Text is always bilingual (`{ en, bm }`). The UI shows the selected language large and the other one small underneath.

### What a tap does
1. **Tap a card:** `addCard` → `addItem`.
2. **Speak it:** the sentence is spoken (`speak`).
3. **Log it:** an event is added to the staff log (`logEvent`).
4. **Show it:** a chip pops into the message bar.

Cards with an `action` (Pain, Symptoms) open a guided dialog instead, and only add to the message once the patient confirms.

### Pain map and 3D body
- **Models:** `Body3D.tsx` loads two compressed models with three.js and merges each into one mesh for speed. It tags every vertex with a **zone** (part, area, side) using `bodymap.ts`.
- **Tapping:** a tap finds the zone under the finger and fills in the part, area and side together. The anatomy structure tapped (e.g. "Patellar ligament (left)") goes to the **staff log only** and is never spoken.
- **Buttons and camera:** the body-part buttons and the 3D model stay in sync. Picking with buttons turns the camera to that area; tapping the model leaves the camera where it is. You can also drag to rotate.
- **Inside layer:** shows the organs, with the body faded around them.
- **Region boundaries:** these are landmark heights measured from the skeleton, kept in the `LM` table in `bodymap.ts`. **If a tap lands in the wrong area, adjust that table** and run `npm test`.

### Styling
- **Tailwind v4.** The colour tokens in `index.css` are copied exactly from the mockup and mapped into Tailwind's theme. So `bg-surface`, `text-ink`, `border-line` and so on use the mockup's variables.
- **Night mode:** night mode adds a `night` class to `<body>`, which swaps the tokens. Use the `night:` variant for night-only tweaks.
- **Group colours:** a `data-cat="need|care|health|feel|ask|desk|base|sos"` attribute sets `--c` and `--cs`, which `text-c` and `bg-cs` read. That's how each card gets its group colour.
- **Breakpoints** match the mockup: `max-sm` is ≤520px (phone), `max-md` ≤900px (tablet portrait), `max-lg` ≤1180px.
- **Icons:** a single SVG sprite (`Icon.tsx`). Add a `<symbol id="i-name">` there and add the name to `IconName` in `types.ts`.

---

## Common changes

| I want to… | Do this |
|---|---|
| Add or edit a card | `src/lib/vocab.ts`: add it to `C`, then list its key in a profile's `cards`. Its colour comes from `kind`, via `catOf`. |
| Change a sentence or translation | `vocab.ts` for cards; `text.ts` for generated sentences (pain, symptoms, AI wording). |
| Add a quick reply or staff question | `QUICK` / `STAFF_Q` in `vocab.ts`. |
| Tune where 3D taps land | The `LM` landmarks in `src/lib/bodymap.ts`, then `npm test`. |
| Change colours or night mode | The tokens at the top of `src/index.css`. |
| Rebuild the 3D models | Clone `https://github.com/DrMuratAltun/anatomi-simulatoru`, then in `frontend/` run `node scripts/prepare-anatomy.mjs <clone>/systems`. |
| Hide the yellow layout notes | They're off by default; the Staff menu toggles them. Remove the `Badge`s and the `NotesDrawer` if you no longer want them at all. |

---

## Testing
- **`npm test`** covers the logic that's easy to get wrong:
  - sentence building in both languages;
  - the AI wording "fact guard";
  - suggestions;
  - the staff summary text;
  - body-map zones at real anatomical landmarks.
- **Visual check:** the original mockup HTML is the visual spec. When changing UI, open the mockup and the app at the same window size and compare. At the time of writing, every text element matched in position, size and colour at 1440px, 800px and 400px wide.
- **Manual check in a browser:** speech output, the alarm sound, drawing, and 3D taps.

---

## Gotchas
- **Use `.ts` extensions in imports** (`import { x } from './text.ts'`). The tests run TypeScript directly in Node, which needs the extensions. TypeScript only syntax that erases cleanly is allowed: no `enum`s.
- **Tailwind's reset differs from the mockup's browser defaults.** Watch for: button padding (0 instead of 1px 6px), `svg` being `display:block; vertical-align:middle`, `<small>` being 80% instead of `smaller`, and `<p>` having no margin. Where it mattered, components set these explicitly; keep doing that.
- **Animations use the `scale` / `translate` properties, not `transform`**, because Tailwind v4's `scale-*` and `translate-*` utilities do. Mixing the two compounds the effect.
- **The 3D colours and lights are tuned for the original look:** `ColorManagement` is off and light intensities are ×π. Changing either shifts every colour on the body.
- **Model structure names** are stored in each node's `extras.n` (three.js mangles node names). `prepare-anatomy.mjs` writes them.
- **Not under version control yet.** Run `git init` before going further; `frontend/.gitignore` already excludes `node_modules` and `dist`.
- **The 3D model licence needs review before release.** The data is CC BY-SA 4.0 (Z-Anatomy / BodyParts3D), which requires attribution and share-alike. There is no on-screen credit yet. See `frontend/public/models/README.md`.
- **One deliberate difference from the mockup:** in the layout notes drawer, the mockup's CSS squeezed the "Changes from the current design" list to one word per line. The app shows it normally.

---

## What's next
- **[`docs/plan/01-assistant-dialogs.md`](docs/plan/01-assistant-dialogs.md):**
  - instant Register / Appointment / Directions dialogs;
  - real staff voice on the tablet that opens forms as the staff member speaks;
  - an AI assistant that can open and prefill forms, with only the patient able to submit. It works with any AI provider (none chosen yet).

  Phase 1 needs no backend. Work through it task by task and tick each step off.
- **Backend:** not started; the stack is undecided. Phase 2 of the plan describes the endpoints it needs.
- **Data still to come:** the hospital's real destination and clinic lists.
