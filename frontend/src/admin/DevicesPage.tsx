import { btnPrimary, Page, Table } from './ui.tsx'

/**
 * Devices: every board and Station in the admin's wards.
 *
 * TODO(B.15):
 *  1. GET /v1/devices?ward= → rows: label, location, ward, type (Front desk / Bedside / Station),
 *     config set, last seen ("3 min ago"; > 1 day shown in amber), status (Active / Blocked).
 *  2. Row actions: Edit (PATCH /v1/devices/:id: label, location, config set),
 *     New secret (POST …/rotate; shows the secret ONCE with a copy button and "Enter it on the device"),
 *     Block (POST …/revoke; confirm dialog: "This device stops working within the hour.").
 *  3. "Register a device" explains the on-device flow instead of a form: open the board on the new
 *     tablet → Staff menu → Register this device → admin signs in there (EnrolDevice.tsx, Task B.12).
 *     That way the secret goes straight onto the tablet and nobody types it.
 */
export function DevicesPage() {
  return (
    <Page title="Devices" sub="Boards and Stations in your wards. Block a lost tablet here." action={<button className={btnPrimary} disabled>Register a device</button>}>
      <Table cols={['Device', 'Location', 'Ward', 'Type', 'Settings', 'Last seen', 'Status']} empty="Device list arrives with plan 00 Task B.15." />
    </Page>
  )
}
