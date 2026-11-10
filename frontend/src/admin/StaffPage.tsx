import { btnPrimary, Page, Table } from './ui.tsx'

/**
 * Staff: accounts for the admin's wards.
 *
 * TODO(B.15):
 *  1. GET /v1/staff?ward= → rows: name, staff no., role (Nurse / Clerk / Admin), wards, status.
 *  2. "Invite staff" sheet: name, staff no., email, role, wards (only the admin's own wards are offered)
 *     → POST /v1/staff → show the password-set link ONCE with a copy button.
 *  3. Row actions: Change role or wards (PATCH /v1/staff/:uid; the admin's own role is locked),
 *     Disable (POST …/disable; confirm: "They are signed out everywhere at once.").
 */
export function StaffPage() {
  return (
    <Page title="Staff" sub="Who can sign in, and what they can do." action={<button className={btnPrimary} disabled>Invite staff</button>}>
      <Table cols={['Name', 'Staff no.', 'Role', 'Wards', 'Status']} empty="Staff list arrives with plan 00 Task B.15." />
    </Page>
  )
}
