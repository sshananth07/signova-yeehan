// Writes dist/schema/<Name>.json for every exported zod schema, so the Flask service
// validates against the same contracts (plan 00 Task A.1). Run: npm run schema
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { z } from 'zod'

const contracts = createRequire(import.meta.url)('../dist/index.js') as Record<string, unknown>
const out = new URL('../dist/schema/', import.meta.url)
mkdirSync(out, { recursive: true })

let n = 0
for (const [name, value] of Object.entries(contracts)) {
  if (!(value instanceof z.ZodType)) continue
  writeFileSync(new URL(`${name}.json`, out), JSON.stringify(z.toJSONSchema(value, { unrepresentable: 'any' }), null, 2))
  n++
}
console.log(`wrote ${n} schemas to dist/schema/`)
