import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./notes.js').default
let signToken: typeof import('../lib/auth.js').signToken

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./notes.js')).default
  signToken = (await import('../lib/auth.js')).signToken
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

const row = {
  id: 'note-1',
  d: '2026-08-18',
  k: 'quan sát',
  t: 'Nước cứng và lớp crema',
  b: 'Cùng máy, cùng hạt, đổi nước.',
  len: 'ngắn',
  media_hint: null,
  portrait: false,
  created_at: '2026-08-18T00:00:00Z',
}

describe('auth', () => {
  it('requires a token to write — reading is public and goes elsewhere', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: {} }), res)
    expect(res.statusCode).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })
})

describe('POST /api/notes', () => {
  it('creates a blank note dated today, ready to be typed into', async () => {
    const builder = queryBuilder({ data: row, error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: {}, headers: authHeaders(signToken()) }), res)

    const today = new Date().toISOString().slice(0, 10)
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ d: today, t: '', b: '', k: 'quan sát', len: 'ngắn' }),
    )
    expect(res.statusCode).toBe(201)
  })

  it('rejects a kind outside the four the schema allows', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: { k: 'linh tinh' }, headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('rejects an unknown length', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: { len: 'khổng lồ' }, headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(400)
  })
})

describe('PATCH /api/notes', () => {
  it('needs an id', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', body: { t: 'x' }, headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(400)
  })

  it('maps mediaHint onto its column and ignores anything else', async () => {
    const builder = queryBuilder({ data: row, error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(
      mockReq({
        method: 'PATCH',
        query: { id: 'note-1' },
        body: { mediaHint: 'ảnh — mặt cháo', id: 'hacked' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(builder.update).toHaveBeenCalledWith({ media_hint: 'ảnh — mặt cháo' })
    expect(res.statusCode).toBe(200)
    expect(res.body.note.mediaHint).toBeNull()
  })

  it('400s when nothing editable was sent', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: { id: 'note-1' }, body: { nope: 1 }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })
})

describe('DELETE /api/notes', () => {
  it('returns 204 once the note is gone', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: { id: 'note-1' }, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: { id: 'note-1' }, headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(204)
  })

  it('404s when it was already deleted', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: { id: 'gone' }, headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(404)
  })
})
