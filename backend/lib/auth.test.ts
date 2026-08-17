import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requireAuth, signToken, verifyToken } from './auth.js'

function mockRes() {
  const res: { statusCode?: number; body?: unknown; status: (c: number) => typeof res; json: (b: unknown) => typeof res } = {
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(body: unknown) {
      res.body = body
      return res
    },
  }
  return res
}

describe('signToken / verifyToken', () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'test-secret'
  })
  afterEach(() => {
    delete process.env.ADMIN_SESSION_SECRET
    vi.useRealTimers()
  })

  it('round-trips a freshly signed token', () => {
    const token = signToken()
    const payload = verifyToken(token)
    expect(payload).not.toBeNull()
    expect(payload!.exp).toBeGreaterThan(payload!.iat)
  })

  it('has the base64url(payload) + "." + base64url(signature) shape', () => {
    const token = signToken()
    const parts = token.split('.')
    expect(parts).toHaveLength(2)
    expect(parts[0]).not.toMatch(/[+/=]/)
    expect(parts[1]).not.toMatch(/[+/=]/)
  })

  it('rejects a tampered payload', () => {
    const token = signToken()
    const [payloadB64, sig] = token.split('.')
    const tamperedPayload = Buffer.from(JSON.stringify({ iat: 0, exp: 9999999999 })).toString('base64url')
    expect(verifyToken(`${tamperedPayload}.${sig}`)).toBeNull()
  })

  it('rejects a tampered signature', () => {
    const token = signToken()
    const [payloadB64] = token.split('.')
    expect(verifyToken(`${payloadB64}.not-a-real-signature`)).toBeNull()
  })

  it('rejects malformed tokens', () => {
    expect(verifyToken('')).toBeNull()
    expect(verifyToken('no-dot-here')).toBeNull()
    expect(verifyToken('a.b.c')).toBeNull()
    expect(verifyToken(undefined)).toBeNull()
    expect(verifyToken(null)).toBeNull()
  })

  it('rejects an expired token', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const token = signToken(60) // expires in 60s
    vi.setSystemTime(new Date('2026-01-01T00:02:00Z')) // +120s
    expect(verifyToken(token)).toBeNull()
  })

  it('accepts a token right up until expiry', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const token = signToken(60)
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'))
    expect(verifyToken(token)).not.toBeNull()
  })

  it('defaults to a 7 day expiry', () => {
    const before = Math.floor(Date.now() / 1000)
    const token = signToken()
    const payload = verifyToken(token)!
    const sevenDays = 7 * 24 * 60 * 60
    expect(payload.exp - payload.iat).toBe(sevenDays)
    expect(payload.iat).toBeGreaterThanOrEqual(before)
  })
})

describe('requireAuth', () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'test-secret'
  })
  afterEach(() => {
    delete process.env.ADMIN_SESSION_SECRET
  })

  it('returns 401 when the Authorization header is missing', () => {
    const req = { headers: {} } as any
    const res = mockRes()
    expect(requireAuth(req, res as any)).toBe(false)
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when the header does not start with Bearer', () => {
    const req = { headers: { authorization: 'Basic abc' } } as any
    const res = mockRes()
    expect(requireAuth(req, res as any)).toBe(false)
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for an invalid token', () => {
    const req = { headers: { authorization: 'Bearer garbage' } } as any
    const res = mockRes()
    expect(requireAuth(req, res as any)).toBe(false)
    expect(res.statusCode).toBe(401)
  })

  it('returns true and writes nothing for a valid token', () => {
    const token = signToken()
    const req = { headers: { authorization: `Bearer ${token}` } } as any
    const res = mockRes()
    expect(requireAuth(req, res as any)).toBe(true)
    expect(res.statusCode).toBeUndefined()
  })
})
