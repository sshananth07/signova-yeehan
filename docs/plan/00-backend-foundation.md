# 00: Backend foundation

> For whoever implements this: work task by task and tick each step off in this file. This plan moves what the app does **today** off the browser's localStorage and into a real backend. Plans 01–03 build on it: each one adds its own module in a slot this plan reserves, and none of them redefines auth, visits, events, consent or sync.
>
> - **Phase A** is the scaffold: every folder, module and route exists and compiles, with comments saying what to implement. Its routes return `501 Not Implemented`.
> - **Phase B** implements the foundation behind those stubs.
>
> Phase A is reviewed before Phase B starts.

**Goal:**
- Every board, Station and staff action that works on one device today works across devices, survives a reload, and is recorded against a visit.
- Staff sign in with real accounts (Firebase Auth), and their actions are attributed to them.
- The presentation build keeps working with no backend.

**Architecture:**

```
Board tablet ─┐  writes: HTTPS → NestJS          reads: Firestore listeners (live)
Station PC   ─┤
Staff (any)  ─┘
                 ┌──────────────────────────────┐
                 │ NestJS API (Cloud Run)       │──Admin SDK──▶ Cloud Firestore
                 │ system of record; all writes │──────────────▶ Cloud Storage (drawings)
                 └──────────────┬───────────────┘
                                │ internal, token-checked
                 ┌──────────────▼───────────────┐
                 │ Flask inference (Cloud Run)  │  heavy models only (plans 02 and 03)
                 └──────────────────────────────┘
shared/contracts: zod schemas → TS types (frontend + NestJS) → JSON Schema (Flask)
```

- **Writes go through NestJS:** it validates, enforces the rules (consent, roles, ward, rate limits), assigns the display row number, and writes with the Admin SDK.
- **Reads come straight from Firestore:** clients read their live data through `onSnapshot` listeners, guarded by security rules. There's no WebSocket server to build or scale; Firestore is the realtime layer.
- **Flask holds no data:** it never touches Firestore; it scores what it's sent and returns a result.
- **The frontend talks to one `Sync` interface:**
  - `local` is today's single-device behaviour, kept for the presentation.
  - `firestore` is the real backend.
  - Nothing above that interface knows which one is active.

**Tech stack:**

| Part | Stack |
|---|---|
| API | NestJS 11 (TypeScript, Node 22), `firebase-admin`, `zod` (through a small in-house `ZodValidationPipe`), `nestjs-pino` (structured logs with redaction) |
| Inference | Flask 3 (Python 3.12), `firebase-admin`, `gunicorn`, PyTorch (added by plans 02 and 03) |
| Data | Cloud Firestore (Native mode), Cloud Storage, Firebase Auth. **Identity Platform** later, for hospital SSO (SAML/OIDC). |
| Hosting | Cloud Run (two services), Artifact Registry, Secret Manager |
| Local development | Firebase Emulator Suite (Auth, Firestore, Storage) |
| CI | GitHub Actions: lint, typecheck, unit tests, rules tests and API end-to-end tests on the emulators, Docker builds |

**Region:** the nearest Google Cloud region to Malaysia for Firestore, Storage and Cloud Run (for example `asia-southeast1`, Singapore). **Confirm the hospital's data-residency requirements before creating the production project**, because a Firestore location can't be changed later.

## What exists today, and where it moves

| Today (in `frontend/src/store.ts`, localStorage) | Backend home | Who writes | Who reads live |
|---|---|---|---|
| Boards: profile `fd`/`bs`, counter or bed label (`PROFILES[...].loc`) | `devices/{deviceId}` | Admin (enrolment) | That board, the Station |
| Visit: New visit, idle guard, profile switch | `visits/{visitId}` plus `devices.currentVisitId` | Board | Board, Station |
| Message history `events[profile]` (`LogEvent`) | `visits/{v}/events/{eventId}` | Board (patient events) | Board, Station, Staff view |
| Seen, Done, repeat counter `asks` | Fields on the event, plus `seenBy`/`doneBy` | Staff | Board (ticks), Station |
| Staff reply with optional due time (`Reply`) | `visits/{v}/replies/{replyId}` | Staff | Board (shown and spoken), Station |
| Staff question to the patient (`activeQ`, `answer`) | `visits/{v}/questions/{qId}` | Staff asks; board answers | Board, Station |
| Pain check-back (`check`, `checkPain`, `snoozeCheck`) | `visits/{v}/checks/{checkId}` | Board | Board, Station ("check due") |
| Emergency (`alarm`, `startAlarm`, `stopAlarm`) | `visits/{v}/alarms/{alarmId}` | Board raises or cancels; staff acknowledge | Station (loud), board |
| Patient drawings (`LogEvent.img`, inline JPEG) | Cloud Storage `visits/{v}/drawings/{eventId}.jpg`; the event keeps `imgPath` | Board | Station and Staff view (signed URL) |
| Simulated staff "SN-104" | Firebase Auth user plus `staff/{uid}` | Admin | The staff member |
| AI visit summary (`summary()` in `lib/text.ts`) | **Stays on the device**: computed from events, nothing stored. Plan 01 may replace it. | None | None |
| UI state: language, tab, night mode, notes, guide, toasts, chips in progress, `aiChoice` | **Stays on the device** (localStorage) | None | None |
| Consent for camera features (plans 02 and 03) | `visits/{v}/consents/{feature}` (in this plan; used by 02 and 03) | Staff | Board, Station |

**Composer chips stay on the device:** the chips a patient is building aren't history. They only reach the backend when they become events (each tap that logs a row, as today).

## Identity and roles

**Two kinds of principal**, never mixed:

1. **Devices**, which authenticate without anyone typing anything:
   - Enrolment (Task B.3): an admin signs in on the new device and enrols it with a label, ward, profile (`fd`, `bs` or `station`) and location. NestJS creates `devices/{id}` and returns a long random `deviceSecret`, stored in IndexedDB.
   - On start, the device exchanges `{ deviceId, deviceSecret }` at `POST /v1/auth/device-token` for a Firebase custom token (1 h) with claims `{ kind: 'device', deviceId, role: 'board' | 'station', ward }`, then signs in with it.
   - An admin can rotate or revoke a secret at any time; a revoked device loses access within the hour.
2. **Staff**, as Firebase Auth users (email and password at first; hospital SSO through Identity Platform later):
   - Custom claims `{ kind: 'staff', role: 'nurse' | 'clerk' | 'admin', wards: string[] }`, mirrored in `staff/{uid}` with display name and staff number.
   - Only admins set claims, through `/v1/staff` (Task B.4). After a change, the next token refresh picks it up; NestJS also checks `staff/{uid}.active` on every request, so disabling someone works immediately.

**Staff on a shared patient tablet:**
- The board's staff screens (Staff view, Reply, Mark seen, Done, New visit, the consent sheets) ask for staff sign-in first.
- The board runs a **second Firebase app instance** (`initializeApp(config, 'staff')`) for the staff session, so signing staff in or out never disturbs the device session.
- The staff session ends after 2 minutes idle, when the staff screen closes, or on New visit.
- API calls for staff actions send the **staff** token and the board's `X-Device-Id`; NestJS checks the staff member's ward includes the device's ward.

**What each role can do:**

| Action | Board device | Station device | Nurse | Clerk | Admin |
|---|---|---|---|---|---|
| Start or end a visit; add patient events; answer a question; raise or cancel an alarm; check-back | ✓ (own device) | | | | |
| Read own visit live | ✓ | | | | |
| Read the ward's active visits live | | ✓ | ✓ | ✓ | ✓ |
| Mark seen or done; reply; ask a question; acknowledge an alarm; New visit from staff screens | | | ✓ | ✓ (front desk only) | ✓ |
| Enable or revoke consent (plans 02 and 03) | | | ✓ | ✓ | ✓ |
| Enrol devices; manage staff; edit config | | | | | ✓ |

## Firestore data model

```
wards/{wardId}                  { name, hospital, timezone: 'Asia/Kuala_Lumpur', retentionDays: 30 }
devices/{deviceId}              { label, ward, profile: 'fd'|'bs'|'station', location: Bi, configSetId,
                                  currentVisitId?, secretHash, enrolledBy, enrolledAt, lastSeenAt, revokedAt? }
staff/{uid}                     { displayName, staffNo, role, wards[], active, createdBy, createdAt }
configSets/{id}                 { version, ...feature blocks (plans 02 and 03 add theirs) }
visits/{visitId}                { deviceId, ward, profile, location: Bi, startedAt, endedAt?, endedBy?,
                                  endReason?: 'new-visit'|'idle'|'profile-switch'|'staff', nextN, expireAt? }
  events/{eventId}              LogEvent + { id, n, kind, src, en, bm, createdAt, seen, seenAt?, seenBy?,
                                  doneAt?, doneBy?, due?, asks, score?, site?, detail?, imgPath?, form? }
  replies/{replyId}             { text: Bi, icon, dueAt?, toEvents: string[], sentBy, sentAt, dismissedAt? }
  questions/{qId}               { question: Bi, answers: Bi[], askedBy, askedAt, answer?, answeredAt?, dismissedAt? }
  checks/{checkId}              { site, dueAt, snoozedUntil?, answeredAt?, eventId? }
  alarms/{alarmId}              { raisedAt, outcome?: 'ack'|'cancel', ackBy?, ackAt?, cancelledAt? }
  consents/{feature}            { feature, agreedBy: 'patient'|'staff-proxy', enabledBy, enabledAt, revokedAt?, settings }
idempotency/{key}               { route, status, body, createdAt, expireAt }   (TTL 24 h)
audit/{id}                      { at, actor, action, target, ward }            (admin actions only)
```

**Display numbers and ids:**
- Ids are **client-generated ULIDs**, so every create is idempotent (see API conventions).
- The `#n` display number is assigned by NestJS in a transaction, from `visits.nextN`.
- The frontend's chips switch from `ev: number` to `eventId: string`, and show `n` once it arrives.

**Times:**
- Stored as Firestore `Timestamp`. Today's `t: 'HH:MM'` strings are formatted on the device in the ward's timezone.
- `due` becomes `dueAt`.

**Retention:**
- When a visit ends, NestJS sets `expireAt = endedAt + ward.retentionDays`.
- A Firestore TTL policy deletes visits, and a scheduled Cloud Run job deletes their subcollections and Storage files. TTL doesn't cascade to subcollections, so the job is required.
- Active visits have no `expireAt`.

**Indexes:**
- `visits`: (`ward`, `endedAt`), for the Station's active list.
- `events`: (`seen`, `createdAt`) and (`doneAt`, `createdAt`), per visit.

## API conventions
- **Prefix:** `/v1`. JSON in and out, validated by the `shared/contracts` zod schemas through `ZodValidationPipe`.
- **Idempotent creates:** creates are `PUT` on a client-generated id (`PUT /v1/visits/:visitId/events/:eventId`). Repeating one returns the stored result. State changes (`POST …/seen`) are naturally idempotent.
- **Errors:** `{ error: { code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT' | 'CONSENT_REQUIRED' | 'RATE_LIMITED' | 'NOT_IMPLEMENTED', message, details? } }`, with the matching HTTP status. Messages are written for staff, never stack traces.
- **Auth:** every route except `/healthz`, `/readyz` and `/v1/auth/device-token` (marked `@Public()`) needs `Authorization: Bearer <Firebase ID token>`.
  - One global `AuthGuard` verifies the token and checks the route's `@Allow('board' | 'station' | 'nurse' | 'clerk' | 'admin', ...)`. A route with no `@Allow` is denied (fail closed).
  - Ward access needs the target visit, so services call `assertWard(principal, visit)` (`common/auth/ward.ts`).
- **Logging:** `nestjs-pino` with redaction of `req.headers.authorization`, request and response **bodies** (never logged), `en`, `bm`, `text`, `img` and `crop`. Each log line carries `requestId`, `route`, `status`, `latency`, `deviceId` or `uid`, and `ward`. No patient words in logs.
- **Time:** the server stamps every `*At` field; client clocks are not trusted.

## Routes

| Module | Method and path | Caller | Purpose |
|---|---|---|---|
| health | `GET /healthz`, `GET /readyz` | Anyone | Liveness, plus a Firestore read check |
| auth | `POST /v1/auth/device-token` | Device | Exchange the device secret for a custom token |
| auth | `GET /v1/me` | Staff or device | Who am I: role, wards, device |
| devices | `GET /v1/devices?ward=` | Admin | Admin page: devices in the admin's wards (no secrets) |
| devices | `POST /v1/devices` | Admin | Enrol; returns `{ deviceId, deviceSecret }` once |
| devices | `PATCH /v1/devices/:id` · `POST /v1/devices/:id/rotate` · `POST /v1/devices/:id/revoke` | Admin | Manage devices |
| devices | `GET /v1/devices/me/config` | Device | Its config set |
| staff | `GET /v1/staff?ward=` | Admin | Admin page: staff in the admin's wards |
| staff | `POST /v1/staff` · `PATCH /v1/staff/:uid` · `POST /v1/staff/:uid/disable` | Admin | Invite (Firebase user plus claims), change role or wards, disable |
| visits | `PUT /v1/visits/:visitId` | Board | Start a visit; ends the device's previous one (`endReason`) |
| visits | `POST /v1/visits/:visitId/end` | Board or staff | End a visit (New visit, idle, profile switch); revokes its consents |
| events | `PUT /v1/visits/:visitId/events/:eventId` | Board | Add a patient event. Merges repeats within 2 min into `asks`, as today's `REPEAT_MS`. |
| events | `POST /v1/visits/:visitId/events/:eventId/seen` · `DELETE …/seen` · `POST …/done` | Staff | Mark seen, unmark, done |
| replies | `PUT /v1/visits/:visitId/replies/:replyId` | Staff | Send a reply; marks `toEvents` seen and sets `dueAt` |
| replies | `POST /v1/visits/:visitId/replies/:replyId/dismiss` | Board | The patient dismissed it |
| questions | `PUT /v1/visits/:visitId/questions/:qId` | Staff | Ask the patient a multiple-choice question |
| questions | `POST /v1/visits/:visitId/questions/:qId/answer` · `…/dismiss` | Board | Answer (also logs an `answer` event) or dismiss |
| checks | `PUT /v1/visits/:visitId/checks/:checkId` · `…/snooze` · `…/answer` | Board | Pain check-back lifecycle |
| alarms | `PUT /v1/visits/:visitId/alarms/:alarmId` | Board | Raise (also logs an `alert` event) |
| alarms | `POST /v1/visits/:visitId/alarms/:alarmId/ack` · `…/cancel` | Staff acknowledges; board cancels (hold-to-cancel) | Close the alarm |
| drawings | `POST /v1/visits/:visitId/drawings/:eventId` | Board | Upload a drawing JPEG (≤ 200 KB) to Storage; sets `imgPath` |
| drawings | `GET /v1/visits/:visitId/drawings/:eventId` | Station or staff | A short-lived signed URL (5 min) |
| consents | `PUT /v1/visits/:visitId/consents/:feature` · `DELETE …` | Staff | Enable or revoke a camera feature (`gaze`, `face`) |
| config | `GET /v1/config-sets` | Admin | Admin page: every set, with how many devices use it |
| config | `GET /v1/config-sets/:id` · `PUT /v1/config-sets/:id` | Admin | Read or publish a config set (versioned) |
| *assistant* | *`POST /v1/assistant/turn`* | *Board (staff session)* | *Reserved: plan 01* |
| *forms* | *`PUT /v1/visits/:visitId/forms/:formId`* | *Board* | *Reserved: plan 01 submissions (private fields)* |
| *pain-checks* | *`PUT /v1/visits/:visitId/pain-checks/:promptId`*, *station notes* | *Board* | *Reserved: plan 03* |
| *inference* | *`POST /v1/expression-check`*, *`/v1/gaze/*`* | *Board (validation mode)* | *Reserved: Flask, plans 03 and 02* |

## Security rules (summary)
- `allow write: if false` everywhere: clients never write.
- **Board:** can `get`/`list` its own `devices/{id}`, its `configSets/{configSetId}`, and `visits/{v}` plus subcollections where `visit.deviceId == auth.token.deviceId`.
- **Station device and staff:** can read `visits` and subcollections where `visit.ward` is the token's `ward` (station) or in the token's `wards` (staff).
- `staff`, `audit` and `idempotency`: no client reads. `consents`: readable by the same rule as the visit.
- **Storage:** no client reads or writes; drawings are only reachable through signed URLs from NestJS.

## Frontend integration (summary)
- **`Sync` interface** (`frontend/src/lib/sync/`): `local` keeps today's behaviour; `firestore` reads through listeners and writes through the API client. The store's actions call `Sync` instead of mutating `events` directly.
- **Offline queue** (IndexedDB): every write is queued with its id and sent in order with backoff. The UI updates optimistically and settles when the listener confirms. A `4xx` response is dropped and shown to staff; `5xx` and network errors are retried.
- **Auth client:** a device session on the default Firebase app and a staff session on the `staff` app. The staff sign-in sheet reuses `Sheet`.
- **Mode:** `firestore` when the device is enrolled; otherwise `local`, so the presentation still runs with no backend.
- **Admin page:** a separate Vite entry (`admin.html`, code in `src/admin/`), so the patient board's bundle never contains admin code.
  - It covers devices, staff and settings sets, for admins only.
  - **Registering a tablet happens on the tablet itself:** Staff menu → Register this device, and the admin signs in there. The secret goes straight onto the device, and nobody types it.

## Review focus
- **Two staff mark the same event seen at once:** one `seenAt` and one `seenBy` (the first); the second call returns 200 and changes nothing. Task B.6.
- **A board retries `PUT …/events/:id` after a timeout:** one event and one `n`. Task B.6.
- **The board sends the same request three times within 2 min:** one event with `asks: 3`, unseen again; same behaviour as today. Task B.6.
- **A clerk tries to reply on a bedside board:** 403. Task B.4.
- **A nurse from ward A tries to read a ward B visit through Firestore:** rules deny it. Task B.2.
- **A board tries to read another board's visit:** rules deny it. Task B.2.
- **A disabled staff member with a still-valid token:** 403 on the next call. Task B.4.
- **A revoked device:** the next token exchange fails, and the board shows "This device was removed. Ask IT." Task B.3.
- **New visit while offline:** the end and the new start are queued in order, and the next patient never sees the previous patient's events (local state cleared at once). Task B.12.
- **Staff session on the board, then 2 minutes idle:** signed out; the device session is untouched. Task B.12.
- **Emergency with no network:** the alarm shows and sounds locally at once, and is queued. The Station gets it when the board reconnects; the board shows "Not sent yet, call for help" while it's queued. Task B.10.
- **Logs during a full end-to-end run:** contain no `en`, `bm`, `text`, JPEG bytes or tokens. Task B.1.
- **A visit 31 days after ending:** gone from Firestore and Storage. Task B.11.

## Commands
- First time: `npm install` at the repo root (npm workspaces: `shared/contracts` and `backend/api`), then `npm run build:contracts`.
- API: `cd backend/api && npm run typecheck && npm test && npm run test:e2e`. ESLint isn't set up yet; add it with CI (Task A.5).
- Inference setup: `cd backend/inference && python -m venv .venv && .venv/Scripts/pip install -e ".[dev]"` (on macOS or Linux, `.venv/bin/pip`).
- Rules: `cd backend && firebase emulators:exec --only auth,firestore,storage "npm --prefix api run test:rules"`
- Inference: `cd backend/inference && pytest`
- Contracts: `cd shared/contracts && npm test`
- Frontend: `cd frontend && npm test && npx tsc --noEmit && npm run build`
- Everything locally: `cd backend && firebase emulators:start` in one terminal, `cd backend/api && npm run start:dev` in another, `cd frontend && npm run dev` in a third.

---

## Phase A: scaffold (compiling stubs)

The rule for every Phase A file:
- **Real** imports, classes, decorators, module wiring, route paths and parameter types.
- **Bodies** are a numbered `// TODO(B.x):` comment block saying exactly what to implement, ending in `throw new NotImplementedException()` (NestJS) or `abort(501)` (Flask).
- The task id in each TODO points at the Phase B task that fills it.
- Phase A is done when both services **start**, every route listed above **responds 501**, and lint, typecheck and the (empty) test suites pass.

### Task A.1: Repository layout and `shared/contracts`

**Files:**
- Create: `shared/contracts/package.json`, `tsconfig.json`, `src/index.ts`, and one schema file per domain: `common.ts` (`Bi`, ULID, timestamps, the error shape), `device.ts`, `staff.ts`, `visit.ts`, `event.ts` (from `LogEvent`), `reply.ts`, `question.ts`, `check.ts`, `alarm.ts`, `consent.ts`, `config.ts`, `drawing.ts`
- Create: `shared/contracts/scripts/json-schema.ts` (writes `dist/schema/*.json` for Flask)
- Modify: `frontend/tsconfig.json` and `vite.config.ts` (path alias `@contracts`)

- [x] **Step 1: Write each schema with its fields as real zod definitions.** These are the contract, so they aren't stubs. Request and response bodies for every route go in the same files.
- [x] **Step 2: Typecheck the frontend against `@contracts`, without using it yet.**
- [ ] **Step 3: Commit:** `chore(contracts): shared zod schemas for the backend` (no git repository yet)

### Task A.2: Firebase project files

**Files:**
- Create: `backend/firebase.json` (emulators: auth 9099, firestore 8080, storage 9199, ui 4000), `backend/.firebaserc` (aliases `dev` and `prod`, with TODOs for project ids), `backend/firestore.rules` (the rules above, as comments plus `allow read, write: if false` until B.2), `backend/firestore.indexes.json`, `backend/storage.rules` (deny all)

- [ ] **Step 1: Start the emulators.** The files are written; this needs the Firebase CLI (`npm i -g firebase-tools`) and Java, which aren't installed yet.
- [ ] **Step 2: Commit:** `chore(backend): firebase emulator and rules skeleton`

### Task A.3: NestJS skeleton

**Files:** `backend/api/` from `nest new`, then:

```
src/
  main.ts                         bootstrap: pino logger, global ZodValidationPipe, ErrorFilter, /v1 prefix, CORS
  app.module.ts                   imports every module below
  config/env.ts                   zod-validated env (PROJECT_ID, EMULATORS, CORS_ORIGINS, INFERENCE_URL)
  firebase/firebase.module.ts     provides App, Firestore, Auth, Storage (emulator-aware)
  app.setup.ts                    shared by main.ts and e2e: /v1 prefix, CORS, shutdown hooks
  common/
    auth/auth.guard.ts            global guard: token → principal, then @Allow roles
    auth/decorators.ts            @Public(), @Allow(...roles), @CurrentPrincipal()
    auth/principal.ts             DevicePrincipal | StaffPrincipal, role lists
    auth/ward.ts                  assertWard(principal, visit)
    pipes/zod-validation.pipe.ts
    filters/error.filter.ts       maps exceptions → { error: { code, message } }
    api-error.ts                  ApiError(code, …) for codes status can't express (CONSENT_REQUIRED)
    todo.ts                       todo('B.x') → 501; Phase B is done when no todo( remains
    clock.ts                      server time (so tests can fake it)
  health/      health.controller.ts
  auth/        auth.module.ts  auth.controller.ts  auth.service.ts
  devices/     devices.module.ts  devices.controller.ts  devices.service.ts  devices.repository.ts
  staff/       staff.*            (same four files)
  visits/      visits.*
  events/      events.*
  replies/     replies.*
  questions/   questions.*
  checks/      checks.*
  alarms/      alarms.*
  drawings/    drawings.*
  consents/    consents.*
  config/      config-sets.*
  retention/   retention.module.ts  retention.job.ts   (Cloud Run job entry)
  assistant/   assistant.module.ts  README.md          (reserved: plan 01)
  forms/       forms.module.ts      README.md          (reserved: plan 01)
  pain-checks/ pain-checks.module.ts README.md         (reserved: plan 03)
test/
  e2e/ app.e2e-spec.ts            boots against the emulators; asserts every route returns 501
  rules/ rules.spec.ts            empty describe blocks, one per rule
```

- **Controllers** carry the real decorators (`@Put(':visitId/events/:eventId')`, `@UseGuards(DeviceGuard)`, `@Roles('nurse')`) and typed parameters from `@contracts`. Each handler calls its service.
- **Services** hold the numbered TODO steps. **Repositories** hold the Firestore paths as TODO steps.
- **Reserved modules** are empty modules with a README pointing at their plan.

- [x] **Step 1: Scaffold, then run** `npm run typecheck && npm run build && npm start`. Checked: `/healthz` returns 200, and stubbed routes return 501.
- [x] **Step 2: Run the e2e test.** Expected: every route returns 501 with `code: 'NOT_IMPLEMENTED'` (36 tests pass; no emulator needed while everything is stubbed).
- [ ] **Step 3: Commit:** `chore(api): NestJS skeleton with every route stubbed` (no git repository yet)

### Task A.4: Flask skeleton

**Files:**

```
backend/inference/
  pyproject.toml  gunicorn.conf.py  Dockerfile  .env.example
  app/__init__.py        create_app(): config, blueprints, error handlers (never echo request data)
  app/config.py
  app/auth.py            verify Firebase ID token; device must have validationMode (TODO B.13)
  app/expression/routes.py   POST /v1/expression-check → abort(501)   (plan 03)
  app/gaze/routes.py         reserved blueprint                        (plan 02)
  app/models/registry.py     model registry (empty)
  tests/test_app.py          app starts; routes return 501
```

- [x] **Step 1: Run** `pytest` (4 tests pass: health, the 501 stub, 413 before the body is read, the 404 error shape).
- [ ] **Step 2: Commit:** `chore(inference): Flask skeleton` (no git repository yet)

### Task A.5: CI and containers

**Files:** `.github/workflows/backend.yml`, `backend/api/Dockerfile`, `backend/inference/Dockerfile` (already in A.4), `backend/docker-compose.yml` (optional: api, inference and emulators together)

- **CI jobs:** contracts tests; api lint, typecheck, unit tests, and e2e plus rules on the emulators; inference pytest; Docker builds for both. Nothing deploys yet.

- [x] Dockerfiles for both services written. `docker-compose.yml` was skipped as optional.
- [ ] **Step 1: Push a branch; all jobs green.** Deferred until the GitHub repository exists.
- [ ] **Step 2: Commit:** `ci: backend pipeline`

### Task A.6: Admin page scaffold

**Files:**
- Create: `frontend/admin.html`, and in `frontend/src/admin/`: `main.tsx`, `AdminApp.tsx` (sign-in gate and Devices / Staff / Settings navigation), `SignIn.tsx`, `DevicesPage.tsx`, `StaffPage.tsx`, `ConfigPage.tsx`, `ui.tsx` (admin-only building blocks, so it doesn't import the board store)
- Modify: `frontend/vite.config.ts` (second build input), `shared/contracts` (`WardQuery`, `ConfigSetSummary`), and the API (`GET /v1/devices`, `GET /v1/staff`, `GET /v1/config-sets`, stubbed)

- Screens show their real layout: headers, table columns, the primary action (disabled) and an empty state naming B.15.
- Dev builds can preview them without signing in; the production build shows only the sign-in form.

- [x] **Step 1: Scaffold.** The frontend typechecks and builds both pages; the API e2e test covers the three new routes (501).
- [ ] **Step 2: Commit:** `chore(admin): admin page scaffold` (no git repository yet)

**Phase A done when:** both services start locally, every route returns 501, and CI is green. **Stop here for review before Phase B.**

---

## Phase B: implement the foundation

Each task below fills the TODOs tagged with its id. Every task: write the failing tests first (unit tests for services against an in-memory fake of the repository; e2e tests on the emulators), implement, run, then commit.

### Task B.1: Common layer
`FirebaseModule` (emulator-aware), `ZodValidationPipe`, `ErrorFilter`, the pino setup with redaction, `clock.ts`.
- **Tests:**
  - the error shape for each exception type;
  - redaction: a log line from a request containing `en`, `text` and `Authorization` contains none of them;
  - a bad body returns 400 `VALIDATION` with field paths.
- [ ] Implement → test → commit `feat(api): common layer`

### Task B.2: Security rules
Write the rules from the summary above.
- **Tests** (`@firebase/rules-unit-testing`): every Review focus rule item, plus "no client write anywhere" and "Storage denies all".
- [ ] Implement → test → commit `feat(backend): firestore and storage rules`

### Task B.3: Devices and device auth
- **Enrolment:**
  - store only `secretHash`, using `crypto.scrypt` with a per-device salt, and return the secret once;
  - token exchange uses `auth.createCustomToken(deviceId, claims)`;
  - update `lastSeenAt` on each exchange (at most once per 5 min);
  - rotation invalidates the old secret, and revocation sets `revokedAt`.
- **Tests:** a wrong secret gets 401; a revoked device gets 401; the claims are correct; the secret never appears in any stored document.
- [ ] Implement → test → commit `feat(api): device enrolment and auth`

### Task B.4: Staff accounts and roles
- **`POST /v1/staff`:** creates the Firebase Auth user (`createUser`), sets custom claims, writes `staff/{uid}`, and sends a password-set link (`generatePasswordResetLink`, delivered by the admin for now).
- **The staff branch of `AuthGuard`** verifies the ID token and loads `staff/{uid}`, cached for 60 s; inactive gets 403. `@Allow` checks the role.
- **`assertWard()`** checks the staff member's wards against the target visit's ward, and blocks clerks on bedside visits.
- **Admin actions** write to `audit`.
- **Tests:** a clerk replying on a bedside board gets 403; a disabled staff member gets 403 even with a valid token; a ward mismatch gets 403; an admin can't remove their own admin role.
- [ ] Implement → test → commit `feat(api): staff accounts and roles`

### Task B.5: Visits
- **Starting a visit** (`PUT`, in one transaction): end the device's current visit (`endReason`), create the new one, and set `devices.currentVisitId`.
- **Ending a visit:** set `endedAt` and `expireAt`, and revoke the visit's consents.
- **Tests:** two starts in a row leave one active visit per device; a retried start is idempotent; ending revokes consents.
- [ ] Implement → test → commit `feat(api): visits`

### Task B.6: Events
- **`PUT` event** (in one transaction):
  - when the same `en` is open (not done) and was created within 2 min, increment `asks` and clear `seen`, as today's store does;
  - otherwise assign `n = nextN++` and create the event;
  - drawings arrive separately (B.9).
- **`seen`, unsee and `done`:** stamp `seenBy`/`doneBy` and the server time; first writer wins.
- **Mapping to today's store:** `isOpenable()` and the Station's open/overdue logic stay on the device, computed from these fields.
- **Tests:** the Review focus items marked B.6, plus a `kind` outside `Kind` gets 400, and a staff-only `kind` (`staff`, `reply`) from a board device gets 403.
- [ ] Implement → test → commit `feat(api): events, seen and done`

### Task B.7: Replies and staff questions
- **Reply:** writes the reply, marks `toEvents` seen (unless already seen), and sets `dueAt` on those events from the reply's minutes.
- **Question:** stores the question. Answering logs an `answer` event (as today: `Staff asked "…" → …`) and sets `answer` and `answeredAt`.
- **Tests:** a reply with a due time sets `dueAt` on each target event; a second answer is a 409; dismissing a reply never deletes it.
- [ ] Implement → test → commit `feat(api): replies and staff questions`

### Task B.8: Check-backs and alarms
- **Check-back:**
  - created by the board after a pain event, with `dueAt` 45 min later (today's `CHECK_MS`);
  - snoozing adds 15 min (`SNOOZE_MS`);
  - answering links the new pain event.
- **Alarm:**
  - raising writes the alarm and an `alert` event in one batch;
  - **acknowledge** (staff) and **cancel** (board) each close it once.
- **Tests:** acknowledging after cancel is a 409; raising twice with the same id gives one alarm.
- [ ] Implement → test → commit `feat(api): check-backs and alarms`

### Task B.9: Drawings
- **Upload:** a JPEG at most 200 KB, checking the magic bytes, not just the content type. Stored at `visits/{v}/drawings/{eventId}.jpg` with `contentType` set, and `imgPath` set on the event.
- **Read:** a signed URL that expires in 5 min.
- **Tests:** a PNG renamed `.jpg` gets 400; an oversize file gets 413; a URL can't be issued for another ward's visit.
- [ ] Implement → test → commit `feat(api): drawings in cloud storage`

### Task B.10: Consents and config
- **Consents:** `PUT` stores who enabled what, `DELETE` sets `revokedAt`, and ending the visit revokes all (B.5). Plans 02 and 03 read `consents/{feature}` and add their feature's `settings`.
- **Config sets:** versioned and immutable once published. A new version is a new id, and devices point at one id.
- **Tests:** a revoked consent stays readable (audit trail) but `active` is false; publishing never changes an existing version.
- [ ] Implement → test → commit `feat(api): consents and config sets`

### Task B.11: Retention job
- **`retention.job.ts`** runs daily on Cloud Run Jobs. It deletes subcollections and Storage files for visits past `expireAt`, then the visit itself, in batches of 400. It's safe to re-run.
- **Tests (emulator):** a seeded visit 31 days after ending is fully gone; an active visit is untouched.
- [ ] Implement → test → commit `feat(api): retention job`

### Task B.12: Frontend `Sync`, auth client and offline queue
**Files:**
- Create: `frontend/src/lib/sync/{index,local,firestore,queue}.ts`, `frontend/src/lib/api.ts` (typed client from `@contracts`), `frontend/src/lib/auth/{device,staff}.ts`, `frontend/src/components/StaffSignIn.tsx`, `frontend/src/components/EnrolDevice.tsx`
- Modify: `frontend/src/store.ts` (actions go through `Sync`), `Station.tsx`, `StaffView.tsx`, `Guide.tsx` (New visit), `TopBar.tsx` (staff menu items require staff sign-in)

**Interface:**

```ts
export interface Sync {
  mode: 'local' | 'firestore'
  startVisit(id: string): Promise<void>; endVisit(id: string, reason: EndReason): Promise<void>
  addEvent(e: NewEvent): Promise<void>; markSeen(id: string, on: boolean): Promise<void>; markDone(id: string): Promise<void>
  sendReply(r: NewReply): Promise<void>; ask(q: NewQuestion): Promise<void>; answer(qId: string, i: number): Promise<void>
  raiseAlarm(id: string): Promise<void>; closeAlarm(id: string, how: 'ack' | 'cancel'): Promise<void>
  watchVisit(id: string, cb: (v: VisitSnapshot) => void): () => void        // board
  watchWard(ward: string, cb: (boards: StationBoard[]) => void): () => void  // station
}
```

**Behaviour:**
- **Queue:** in IndexedDB, keeps order, and survives a reload; one in flight per visit, with backoff from 1 s to 60 s.
- **Optimistic updates:** the store applies the change at once and reconciles from the listener snapshot (server fields like `n`, `seenBy` and `createdAt` win).
- **Staff session:** a second Firebase app, signed out after 2 min idle.
- **Tests:** the existing store tests run against `local` unchanged; new tests cover queue ordering, a 4xx being dropped, and reconciliation replacing a provisional `n`.
- [ ] Implement → test → check in two browsers against the emulators (a board and a Station: a request appears at the Station within 1 s; Mark seen ticks the board's chip) → commit `feat(sync): firestore sync with offline queue and staff sign-in`

### Task B.13: Inference auth (Flask)
- `auth.py` verifies the Firebase ID token, requires `kind: 'device'`, and reads the device doc's `validationMode` (cached for 60 s).
- `MAX_CONTENT_LENGTH` is 64 KB. Error handlers return the API error shape with no request data.
- **Tests:** a non-device token gets 403; `validationMode` false gets 403; a 65 KB body gets 413.
- [ ] Implement → test → commit `feat(inference): token and validation-mode check`

### Task B.15: Admin page
Fill the `TODO(B.15)` blocks in `frontend/src/admin/` and the three list routes. Needs B.3, B.4, B.10 and B.12.

**Backend:**
- `GET /v1/devices` and `GET /v1/staff` are limited to the admin's wards, and an optional `?ward=` must be one of them.
- `GET /v1/config-sets` counts the devices using each set.

**Frontend:**
- **Sign-in:** the staff Firebase app; non-admins see "This page is for ward admins."; signed out after 15 min idle.
- **Devices:** list with last seen, Edit, New secret (shown once), Block (with confirmation). Registering explains the on-tablet flow.
- **Staff:** list, Invite (password link shown once), Change role or wards (the admin's own role is locked), Disable (with confirmation).
- **Settings:** list sets; publish a new version from a copy. Published sets are read-only.

**Tests:**
- e2e: lists never contain `secretHash`; `?ward=` outside the admin's wards gets 403; a nurse gets 403 on every admin route.
- In the browser: invite a staff member, sign in as them, and confirm their role works on the board.

- [ ] Implement → test → commit `feat(admin): admin page for devices, staff and settings`

### Task B.14: Deploy
- **Projects:** `signova-dev` and `signova-prod`, each with Firestore (Native, in the confirmed region), Storage, Auth and the TTL policies (`visits.expireAt`, `idempotency.expireAt`).
- **Cloud Run:**
  - `api`: min instances 1 in prod, so the first tap after a quiet night isn't slow.
  - `inference`: min instances 0; GPU only once plan 03 Phase 4 is approved.
  - `retention`: a daily job.
- **Secrets** in Secret Manager. Service accounts have least privilege: the api gets Firestore, Storage and Auth admin; inference gets read access to `devices` only.
- **CI** deploys `main` to dev automatically; prod deploys are manual and tagged.
- [ ] Deploy to dev → run the e2e suite against dev → commit `chore(deploy): cloud run and firebase projects`

**Phase B done when:** every route above is implemented, all test suites pass in CI, and the two-browser check works against **dev** (not just the emulators).

---

## Later
- **Hospital SSO:** Identity Platform with SAML or OIDC; staff claims come from the identity provider's groups.
- **Push alerts to staff phones** (Firebase Cloud Messaging) for alarms and overdue rows.
- **Reporting:** exports of response times and overdue counts per ward, with no patient words.
- **Integration with the hospital information system:** patient registration, bed lists, and ward mapping from source instead of manual enrolment.
