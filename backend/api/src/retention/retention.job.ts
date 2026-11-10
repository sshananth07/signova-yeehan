import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { RetentionModule } from './retention.module'
import { RetentionService } from './retention.service'

/** Cloud Run Jobs entry point (daily). Run locally: npm run build && npm run job:retention */
async function main() {
  const app = await NestFactory.createApplicationContext(RetentionModule)
  try {
    const deleted = await app.get(RetentionService).run()
    console.log(JSON.stringify({ job: 'retention', deleted }))
  } finally {
    await app.close()
  }
}

main().catch(err => {
  console.error(JSON.stringify({ job: 'retention', error: String(err?.message ?? err) }))
  process.exit(1)
})
