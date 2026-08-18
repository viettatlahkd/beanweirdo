import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./site.js').default
let signToken: typeof import('../lib/auth.js').signToken

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./site.js')).default
  signToken = (await import('../lib/auth.js')).signToken
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

describe('GET /api/site', () => {
  it('requires auth', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'GET' }), res)
    expect(res.statusCode).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('returns the stored overrides', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: { data: { t1: 'Overridden' } }, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'GET', headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.site).toEqual({ t1: 'Overridden' })
  })

  it('returns an empty object on a fresh install (no row yet)', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'GET', headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.site).toEqual({})
  })
})

describe('PATCH /api/site', () => {
  it('rejects a non-object body', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', body: ['nope'], headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(400)
  })

  it('shallow-merges into the existing copy', async () => {
    const upserted = queryBuilder({ data: { data: { t1: 'Kept', t2: 'New' } }, error: null })
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: { data: { t1: 'Kept' } }, error: null }))
      .mockReturnValueOnce(upserted)

    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', body: { t2: 'New' }, headers: authHeaders(signToken()) }), res)

    expect(res.statusCode).toBe(200)
    expect(upserted.upsert ?? upserted.insert).toBeDefined()
    expect(res.body.site).toEqual({ t1: 'Kept', t2: 'New' })
  })

  it("drops a field set to '' so the frontend default takes over again", async () => {
    const upserted = queryBuilder({ data: { data: {} }, error: null })
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: { data: { t1: 'Overridden' } }, error: null }))
      .mockReturnValueOnce(upserted)

    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', body: { t1: '' }, headers: authHeaders(signToken()) }), res)

    expect(res.statusCode).toBe(200)
    expect(upserted.upsert).toHaveBeenCalledWith(expect.objectContaining({ data: {} }))
  })

  it('merges nested `sections` rather than replacing it', async () => {
    const upserted = queryBuilder({ data: { data: {} }, error: null })
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: { data: { sections: { Public: 'Đọc' } } }, error: null }))
      .mockReturnValueOnce(upserted)

    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', body: { sections: { Admin: 'Hậu trường' } }, headers: authHeaders(signToken()) }),
      res,
    )

    expect(res.statusCode).toBe(200)
    expect(upserted.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ data: { sections: { Public: 'Đọc', Admin: 'Hậu trường' } } }),
    )
  })
})

describe('/api/site — other methods', () => {
  it('rejects DELETE with 405', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(405)
  })
})
