# forms (reserved)

Filled by [plan 01](../../../../docs/plan/01-assistant-dialogs.md) Task 2.5:

- `PUT /v1/visits/:visitId/forms/:formId` stores `visits/{visitId}/forms/{formId}` as `{ kind, values, summary }`.
- Private fields (name, IC/passport, phone) are encrypted at field level with Cloud KMS before writing.
- Security rules deny client reads of `forms`. Staff read the decrypted values through a NestJS route only.
