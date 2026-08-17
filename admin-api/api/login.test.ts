import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import handler from './login.js'
import { mockReq, mockRes } from '../lib/test-helpers.js'

describe('POST /api/login', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple'
    process.env.ADMIN_SESSION_SECRET = 'test-secret'
    process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_PASSWORD
    delete process.env.ADMIN_SESSION_SECRET
    delete process.env.ADMIN_ALLOWED_ORIGIN
  })

  it('issues a token for the correct password', async () => {
    const req = mockReq({ method: 'POST', body: { password: 'correct-horse-battery-staple' } })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.split('.')).toHaveLength(2)
  })

  it('rejects the wrong password with 401', async () => {
    const req = mockReq({ method: 'POST', body: { password: 'nope' } })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(401)
    expect(res.body.token).toBeUndefined()
  })

  it('rejects a missing password with 401', async () => {
    const req = mockReq({ method: 'POST', body: {} })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(401)
  })

  it('rejects non-POST methods with 405', async () => {
    const req = mockReq({ method: 'GET' })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(405)
  })

  it('handles OPTIONS preflight with 204 and CORS headers', async () => {
    const req = mockReq({ method: 'OPTIONS' })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(204)
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://admin.example.com')
  })

  it('returns 500 when ADMIN_PASSWORD is not configured', async () => {
    delete process.env.ADMIN_PASSWORD
    const req = mockReq({ method: 'POST', body: { password: 'anything' } })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(500)
  })
})
