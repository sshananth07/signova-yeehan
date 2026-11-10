import { z } from 'zod'

/** Client-generated ids: every create is `PUT` on one of these, so retries are idempotent. */
export const Ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'Expected a ULID')

/** Every patient-facing string exists in English and Malay (frontend `Bi`). */
export const Bi = z.object({ en: z.string().min(1).max(1000), bm: z.string().min(1).max(1000) })
export type Bi = z.infer<typeof Bi>

/** Server-stamped times travel as ISO strings; Firestore stores them as Timestamps. */
export const IsoTime = z.iso.datetime()

export const Profile = z.enum(['fd', 'bs'])
export type Profile = z.infer<typeof Profile>

/** Mirrors `Kind` in frontend/src/lib/types.ts. */
export const Kind = z.enum(['request', 'need', 'reply', 'symptom', 'feeling', 'question', 'pain', 'answer', 'typed', 'message', 'alert', 'staff'])
export type Kind = z.infer<typeof Kind>

/** The icon set lives in the frontend sprite; the backend only stores the name. */
export const IconName = z.string().min(1).max(40)

export const ErrorCode = z.enum(['NOT_FOUND', 'FORBIDDEN', 'UNAUTHENTICATED', 'VALIDATION', 'CONFLICT', 'CONSENT_REQUIRED', 'RATE_LIMITED', 'TOO_LARGE', 'NOT_IMPLEMENTED', 'INTERNAL'])
export type ErrorCode = z.infer<typeof ErrorCode>

/** The one error shape every route returns (plan 00, API conventions). */
export const ErrorBody = z.object({
  error: z.object({ code: ErrorCode, message: z.string(), details: z.unknown().optional() }),
})
export type ErrorBody = z.infer<typeof ErrorBody>

/** Path params shared by every visit-scoped route. */
export const VisitParams = z.object({ visitId: Ulid })
export type VisitParams = z.infer<typeof VisitParams>
