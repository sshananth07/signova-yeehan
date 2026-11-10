import { btnPrimary, Page, Table } from './ui.tsx'

/**
 * Settings: versioned config sets (dwell time for eye control, face-check sensitivity, …).
 *
 * TODO(B.15):
 *  1. GET /v1/config-sets → rows: id, version, devices using it.
 *  2. "Publish new version": copy the chosen set into an editable form (fields from ConfigSet in
 *     @contracts; plan 02 adds `gaze`, plan 03 adds `face`), then PUT /v1/config-sets/:newId.
 *     Published sets are read-only: there is no edit, only "publish a new version".
 *  3. Moving devices onto a set happens on the Devices page (Edit → Settings).
 */
export function ConfigPage() {
  return (
    <Page title="Settings" sub="Settings sets for devices. Publish a new version to change one." action={<button className={btnPrimary} disabled>Publish new version</button>}>
      <Table cols={['Set', 'Version', 'Devices using it']} empty="Settings sets arrive with plan 00 Task B.15." />
    </Page>
  )
}
