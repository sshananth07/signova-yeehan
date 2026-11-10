/**
 * Firestore and Storage security rules tests (plan 00 Task B.2). They run against the emulator:
 *   cd backend && firebase emulators:exec --only auth,firestore,storage "npm --prefix api run test:rules"
 *
 * TODO(B.2): add `@firebase/rules-unit-testing`, then for each case:
 *   const env = await initializeTestEnvironment({ projectId: 'demo-signova', firestore: { rules: readFileSync('../firestore.rules', 'utf8') } })
 *   seed with env.withSecurityRulesDisabled(...), then assertSucceeds / assertFails as the given token.
 */
describe('firestore rules', () => {
  it.todo('no client can write anywhere (board, station, staff, unauthenticated)')
  it.todo('a board reads its own visit and its subcollections')
  it.todo("a board can't read another board's visit")
  it.todo('a station reads visits in its ward only')
  it.todo('a nurse from ward A cannot read a ward B visit')
  it.todo('staff, audit and idempotency are unreadable by clients')
  it.todo('a board reads its own device doc and its config set only')
})

describe('storage rules', () => {
  it.todo('Storage denies every client read and write (drawings only via signed URLs)')
})
