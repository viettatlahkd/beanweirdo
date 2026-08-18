import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./hours.js').default
let signToken: typeof import('../lib/auth.js').signToken

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./hours.js')).default
  signToken = (await import('../lib/auth.js')).signToken
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

const row = {
  id: 'log-1',
  date: '2026-08-18',
  name: 'Cupping 6 mẫu',
  kind: 'thực hành',
  mins: 90,
  at: '06:30:00',
  done: true,
  created_at: '2026-08-18T00:00:00Z',
}

describe('GET /api/hours', () => {
  it('requires auth — the practice log is private', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'GET' }), res)
    expect(res.statusCode).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('returns the span\'s logs and every kind in one round trip', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [row], error: null }))
      .mockReturnValueOnce(queryBuilder({ data: [{ name: 'đọc' }, { name: 'viết' }], error: null }))

    const res = mockRes()
    await handler(mockReq({ method: 'GET', headers: authHeaders(signToken()) }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body.kinds).toEqual(['đọc', 'viết'])
    // Postgres returns HH:MM:SS; the journal only ever shows HH:MM.
    expect(res.body.logs[0].at).toBe('06:30')
  })

  it('limits the query to the requested span', async () => {
    const logs = queryBuilder({ data: [], error: null })
    fromMock.mockReturnValueOnce(logs).mockReturnValueOnce(queryBuilder({ data: [], error: null }))

    const res = mockRes()
    await handler(mockReq({ method: 'GET', query: { from: '2026-08-01' }, headers: authHeaders(signToken()) }), res)

    expect(logs.gte).toHaveBeenCalledWith('date', '2026-08-01')
    expect(res.statusCode).toBe(200)
  })
})

describe('POST /api/hours', () => {
  it('rejects a log with no kind', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'POST', body: { date: '2026-08-18', mins: 30, at: '09:00' }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('rejects a non-positive duration', async () => {
    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        body: { date: '2026-08-18', kind: 'đọc', mins: 0, at: '09:00' },
        headers: authHeaders(signToken()),
      }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('creates the log and hands the saved row back', async () => {
    const builder = queryBuilder({ data: row, error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        body: { date: '2026-08-18', kind: 'thực hành', mins: 90, at: '06:30', name: 'Cupping 6 mẫu' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ mins: 90, done: true }))
    expect(res.statusCode).toBe(201)
    expect(res.body.log.id).toBe('log-1')
  })
})

describe('PATCH / DELETE /api/hours', () => {
  it('needs an id', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', body: { mins: 45 }, headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(400)
  })

  it('writes only the fields the journal may edit', async () => {
    const builder = queryBuilder({ data: row, error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(
      mockReq({
        method: 'PATCH',
        query: { id: 'log-1' },
        body: { mins: 45, id: 'hacked', created_at: 'nope' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(builder.update).toHaveBeenCalledWith({ mins: 45 })
    expect(res.statusCode).toBe(200)
  })

  it('404s when the log is gone', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(
      mockReq({ method: 'DELETE', query: { id: 'nope' }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /api/hours?resource=kinds', () => {
  it('treats an already-existing kind as success, not an error', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [{ sort_order: 4 }], error: null }))
      // 23505 = unique violation: the caller wanted the kind to exist, and it does.
      .mockReturnValueOnce(queryBuilder({ data: null, error: { code: '23505', message: 'duplicate' } }))
      .mockReturnValueOnce(queryBuilder({ data: [{ name: 'đọc' }], error: null }))

    const res = mockRes()
    await handler(
      mockReq({ method: 'POST', query: { resource: 'kinds' }, body: { name: 'đọc' }, headers: authHeaders(signToken()) }),
      res,
    )

    expect(res.statusCode).toBe(200)
    expect(res.body.kinds).toEqual(['đọc'])
  })

  it('rejects a blank name', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'POST', query: { resource: 'kinds' }, body: { name: '   ' }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })
})
