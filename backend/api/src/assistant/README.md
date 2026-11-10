# assistant (reserved)

Filled by [plan 01](../../../../docs/plan/01-assistant-dialogs.md) Phase 2, Tasks 2.1–2.4:

- `POST /v1/assistant/turn`, streaming `BoardEvent`s as `text/event-stream`, called with the staff session token.
- `provider.ts` and `providers/<name>.ts`, plus `providers/fake.ts` for tests. Provider keys go in Secret Manager.
- `prompt.ts`, `context.ts` and `turn.ts`. Tool calls are stored at `visits/{visitId}/assistantTurns/{turnId}`.

Don't add routes here before plan 01 Phase 2 starts.
