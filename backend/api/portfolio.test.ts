import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./portfolio.js').default
let signToken: typeof import('../lib/auth.js').signToken

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  const mod = await import('./portfolio.js')
  handler = mod.default
  signToken = (await import('../lib/auth.js')).signToken
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

const auth = () => authHeaders(signToken())

describe('/api/portfolio', () => {
  it('requires auth', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'GET' }), res)
    expect(res.statusCode).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('GET returns the design tokens, empty on a fresh install', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: { data: { radius: { r1: 2 } } }, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'GET', headers: auth() }), res)
    expect(res.body).toEqual({ design: { radius: { r1: 2 } } })
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: null }))
    const fresh = mockRes()
    await handler(mockReq({ method: 'GET', headers: auth() }), fresh)
    expect(fresh.body).toEqual({ design: {} })
  })

  it('PATCH design merges one level deep and null resets a key', async () => {
    const upsert = queryBuilder({ data: { data: { colors: { paper: '#fff', ink: '#111' } } }, error: null })
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: { data: { colors: { paper: '#eee', ink: '#111', line: '#ddd' } } }, error: null }))
      .mockReturnValueOnce(upsert)
    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: { part: 'design' }, body: { colors: { paper: '#fff', line: null } }, headers: auth() }),
      res,
    )
    expect(res.statusCode).toBe(200)
    expect(upsert.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ data: { colors: { paper: '#fff', ink: '#111' } } }),
    )
  })

  it('PATCH design rejects a non-object body', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', query: { part: 'design' }, body: [1], headers: auth() }), res)
    expect(res.statusCode).toBe(400)
  })
})
