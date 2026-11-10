import { Test } from '@nestjs/testing'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { configureApp } from '../../src/app.setup'

/**
 * Phase A contract: every route exists and answers 501 NOT_IMPLEMENTED in the shared error shape.
 * As Phase B tasks land, move each row out of this table and into that module's own e2e spec.
 */
const V = '01JCQ7Z8X9V2K3M4N5P6Q7R8S9'
const ROUTES: [method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string][] = [
  ['get', '/readyz'],
  ['post', '/v1/auth/device-token'],
  ['get', '/v1/me'],
  ['get', '/v1/devices'],
  ['post', '/v1/devices'],
  ['get', '/v1/staff'],
  ['get', '/v1/config-sets'],
  ['get', '/v1/devices/me/config'],
  ['patch', '/v1/devices/dev1'],
  ['post', '/v1/devices/dev1/rotate'],
  ['post', '/v1/devices/dev1/revoke'],
  ['post', '/v1/staff'],
  ['patch', '/v1/staff/uid1'],
  ['post', '/v1/staff/uid1/disable'],
  ['get', '/v1/config-sets/v1'],
  ['put', '/v1/config-sets/v1'],
  ['put', `/v1/visits/${V}`],
  ['post', `/v1/visits/${V}/end`],
  ['put', `/v1/visits/${V}/events/${V}`],
  ['post', `/v1/visits/${V}/events/${V}/seen`],
  ['delete', `/v1/visits/${V}/events/${V}/seen`],
  ['post', `/v1/visits/${V}/events/${V}/done`],
  ['put', `/v1/visits/${V}/replies/${V}`],
  ['post', `/v1/visits/${V}/replies/${V}/dismiss`],
  ['put', `/v1/visits/${V}/questions/${V}`],
  ['post', `/v1/visits/${V}/questions/${V}/answer`],
  ['post', `/v1/visits/${V}/questions/${V}/dismiss`],
  ['put', `/v1/visits/${V}/checks/${V}`],
  ['post', `/v1/visits/${V}/checks/${V}/snooze`],
  ['post', `/v1/visits/${V}/checks/${V}/answer`],
  ['put', `/v1/visits/${V}/alarms/${V}`],
  ['post', `/v1/visits/${V}/alarms/${V}/ack`],
  ['post', `/v1/visits/${V}/alarms/${V}/cancel`],
  ['post', `/v1/visits/${V}/drawings/${V}`],
  ['get', `/v1/visits/${V}/drawings/${V}`],
  ['put', `/v1/visits/${V}/consents/face`],
  ['delete', `/v1/visits/${V}/consents/face`],
]

describe('Phase A scaffold', () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = configureApp(mod.createNestApplication<NestExpressApplication>({ logger: false }))
    await app.init()
  })
  afterAll(() => app.close())

  it('GET /healthz is live', async () => {
    await request(app.getHttpServer()).get('/healthz').expect(200, { status: 'ok' })
  })

  it.each(ROUTES)('%s %s → 501 NOT_IMPLEMENTED', async (method, path) => {
    const res = await request(app.getHttpServer())[method](path).send({})
    expect(res.status).toBe(501)
    expect(res.body.error.code).toBe('NOT_IMPLEMENTED')
  })

  it('an unknown route is a 404 in the same error shape', async () => {
    const res = await request(app.getHttpServer()).get('/v1/nope')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})
