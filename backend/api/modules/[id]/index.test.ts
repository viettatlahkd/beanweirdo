import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../../../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./index.js').default
let signToken: typeof import('../../../lib/auth.js').signToken

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./index.js')).default
  signToken = (await import('../../../lib/auth.js')).signToken
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

const row = {
  id: 'sensory',
  title: 'sensory',
  accent: '#F2A0A5',
  on_color: '#3B2A2B',
  tint: '#FBE7E5',
  tint2: '#F6D2D4',
  layout: 'band',
  concept: 'flavor',
  blurb: 'b',
  long_desc: 'ld',
  treatment: 't',
  layout_note: 'ln',
  shot1: 's1',
  shot2: 's2',
  shot3: 's3',
  img1: null,
  img2: null,
  img3: null,
  sort_order: 1,
}

const q = (id = 'sensory') => ({ id })

describe('PATCH /api/modules/:id', () => {
  it('requires auth', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', query: q(), body: { title: 'x' } }), res)
    expect(res.statusCode).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('maps camelCase keys onto their columns', async () => {
    const builder = queryBuilder({ data: { ...row, long_desc: 'new' }, error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: q(), body: { longDesc: 'new' }, headers: authHeaders(signToken()) }),
      res,
    )

    expect(builder.update).toHaveBeenCalledWith({ long_desc: 'new' })
    expect(res.statusCode).toBe(200)
    expect(res.body.module.longDesc).toBe('new')
  })

  it('ignores unknown keys and 400s when nothing editable is left', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: q(), body: { sortOrder: 4 }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('rejects an unknown layout', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: q(), body: { layout: 'mosaic' }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('404s when the module does not exist', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: q('nope'), body: { title: 'x' }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/modules/:id', () => {
  it('returns 204 once the row is gone', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: { id: 'sensory' }, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: q(), headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(204)
    expect(res.ended).toBe(true)
  })

  it('404s when the module does not exist', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: q('nope'), headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(404)
  })
})

describe('/api/modules/:id — other methods', () => {
  it('rejects GET with 405', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'GET', query: q(), headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(405)
  })
})
