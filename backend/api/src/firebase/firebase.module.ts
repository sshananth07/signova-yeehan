import { Global, Module } from '@nestjs/common'
import { getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { env } from '../config/env'

export const FIREBASE_APP = Symbol('FIREBASE_APP')
export const FIRESTORE = Symbol('FIRESTORE')
export const FIREBASE_AUTH = Symbol('FIREBASE_AUTH')
export const STORAGE = Symbol('STORAGE')

/**
 * firebase-admin, emulator-aware: when FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST /
 * FIREBASE_STORAGE_EMULATOR_HOST are set, the SDK talks to the Emulator Suite. On Cloud Run it
 * uses the service account (Application Default Credentials). Nothing connects until first use.
 *
 * TODO(B.1):
 *  1. Call `getFirestore(app).settings({ ignoreUndefinedProperties: true })` once, so optional
 *     contract fields never write `undefined`.
 *  2. Add a `readyz` check helper here (a 1-doc read with a 2 s timeout) for HealthController.
 */
@Global()
@Module({
  providers: [
    {
      provide: FIREBASE_APP,
      useFactory: (): App => getApps()[0] ?? initializeApp({ projectId: env.GOOGLE_CLOUD_PROJECT, storageBucket: env.STORAGE_BUCKET }),
    },
    { provide: FIRESTORE, useFactory: (app: App) => getFirestore(app), inject: [FIREBASE_APP] },
    { provide: FIREBASE_AUTH, useFactory: (app: App) => getAuth(app), inject: [FIREBASE_APP] },
    { provide: STORAGE, useFactory: (app: App) => getStorage(app), inject: [FIREBASE_APP] },
  ],
  exports: [FIREBASE_APP, FIRESTORE, FIREBASE_AUTH, STORAGE],
})
export class FirebaseModule {}
