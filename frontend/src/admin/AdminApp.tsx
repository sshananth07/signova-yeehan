import { useState } from 'react'
import { ConfigPage } from './ConfigPage.tsx'
import { DevicesPage } from './DevicesPage.tsx'
import { SignIn } from './SignIn.tsx'
import { StaffPage } from './StaffPage.tsx'

type PageKey = 'devices' | 'staff' | 'settings'
const PAGES: { k: PageKey; label: string }[] = [
  { k: 'devices', label: 'Devices' },
  { k: 'staff', label: 'Staff' },
  { k: 'settings', label: 'Settings' },
]

/**
 * Admin page (plan 00 Task B.15): devices, staff accounts and config sets for the admin's wards.
 *
 * TODO(B.15):
 *  1. `session` comes from the staff Firebase app (lib/auth/staff.ts, Task B.12). No session → <SignIn/>.
 *  2. After sign-in, call GET /v1/me; role !== 'admin' → "This page is for ward admins." and a sign-out button.
 *  3. Ward picker in the header when the admin has more than one ward; pages pass it as `?ward=`.
 *  4. Sign out after 15 min idle (admins work at a desk, so longer than the board's 2 min).
 *  Until then, dev builds can preview the screens without signing in.
 */
export function AdminApp() {
  const [preview, setPreview] = useState(false)
  const [page, setPage] = useState<PageKey>('devices')
  const session = null // TODO(B.15): staff session

  if (!session && !preview) return <SignIn onPreview={import.meta.env.DEV ? () => setPreview(true) : undefined} />

  return (
    <div className="min-h-full bg-bg">
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 max-sm:px-4">
          <b className="text-[17px]">Signova Admin</b>
          <nav aria-label="Admin sections" className="flex gap-1">
            {PAGES.map(p => (
              <button key={p.k} onClick={() => setPage(p.k)} aria-current={page === p.k ? 'page' : undefined}
                className={'min-h-10 rounded-[10px] px-3.5 text-[14.5px] font-bold transition-[background-color] duration-200 ' + (page === p.k ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-surface-2')}>
                {p.label}
              </button>
            ))}
          </nav>
          {preview && <span className="ml-auto rounded-full bg-surface-2 px-3 py-1 text-[12.5px] font-bold text-muted">Preview · not signed in</span>}
        </div>
      </header>
      <main>
        {page === 'devices' && <DevicesPage />}
        {page === 'staff' && <StaffPage />}
        {page === 'settings' && <ConfigPage />}
      </main>
    </div>
  )
}
