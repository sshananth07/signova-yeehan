# pain-checks (reserved)

Filled by [plan 03](../../../../docs/plan/03-grimace-pain-check.md) Phase 3, Tasks 3.1–3.3:

- `PUT /v1/visits/:visitId/pain-checks/:promptId` stores an outcome. Without an active `face` consent it returns 409 `CONSENT_REQUIRED`; it checks consent through `ConsentsRepository`.
- `PUT /v1/visits/:visitId/station-notes/:noteId` and `POST …/seen` handle unanswered-check notes, rate-limited from config.
- The data lives at `visits/{v}/painChecks` and `visits/{v}/stationNotes`, and the retention job deletes both with the visit.
