import { z } from 'zod'
import { IsoTime } from './common'

/** Uploads are raw `image/jpeg` bodies, checked by magic bytes, not just content type. */
export const MAX_DRAWING_BYTES = 200 * 1024

/** `GET` returns a short-lived signed URL; Storage itself is never readable by clients. */
export const DrawingUrl = z.object({ url: z.url(), expiresAt: IsoTime })
export type DrawingUrl = z.infer<typeof DrawingUrl>
