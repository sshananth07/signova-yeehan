import { btnAlt, btnPrimary, input } from './ui.tsx'

/**
 * Staff sign-in for the admin page.
 *
 * TODO(B.15):
 *  1. `signInWithEmailAndPassword(staffAuth, email, password)` on the staff Firebase app (Task B.12).
 *  2. Errors in plain words: wrong password / no account → "Email or password is wrong";
 *     too many tries → "Too many attempts. Wait a minute and try again." Never say which part was wrong.
 *  3. "Forgot password?" → `sendPasswordResetEmail`.
 *  4. Later: hospital SSO button (Identity Platform), replacing email + password.
 */
export function SignIn({ onPreview }: { onPreview?: () => void }) {
  return (
    <main className="grid min-h-full place-items-center bg-bg p-4">
      <form className="grid w-full max-w-[380px] gap-4 rounded-[20px] border border-line bg-surface p-6 shadow-[var(--sh)]" onSubmit={e => e.preventDefault()}>
        <div>
          <h1 className="text-[22px]">Signova Admin</h1>
          <p className="mt-1 text-[14.5px] text-muted">Sign in with your staff account. Admins only.</p>
        </div>
        <label className="grid gap-1.5 text-[14px] font-bold">Email<input className={input} type="email" autoComplete="username" required /></label>
        <label className="grid gap-1.5 text-[14px] font-bold">Password<input className={input} type="password" autoComplete="current-password" required /></label>
        <button className={btnPrimary} disabled title="Available after plan 00 Task B.15">Sign in</button>
        {onPreview && <button type="button" className={btnAlt} onClick={onPreview}>Preview screens (dev only)</button>}
      </form>
    </main>
  )
}
