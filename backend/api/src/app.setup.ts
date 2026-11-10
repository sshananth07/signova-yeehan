import type { NestExpressApplication } from '@nestjs/platform-express'
import { env } from './config/env'

/** Shared by main.ts and the e2e tests, so tests hit the same paths and settings as production. */
export function configureApp(app: NestExpressApplication) {
  app.setGlobalPrefix('v1', { exclude: ['healthz', 'readyz'] })
  app.enableCors({ origin: env.CORS_ORIGINS, allowedHeaders: ['Authorization', 'Content-Type', 'X-Device-Id'] })
  app.enableShutdownHooks()
  // TODO(B.9): app.useBodyParser('raw', { type: 'image/jpeg', limit: MAX_DRAWING_BYTES }) for drawing uploads.
  return app
}
