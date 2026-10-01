import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./portfolio.js').default
let pageColumns: typeof import('./portfolio.js').pageColumns
let signToken: typeof import('../lib/auth.js').signToken

const row = {
  id: 'p1',
  slug: 'bibi',
  title: 'bibi',
  intro: '',
  palette: 'biz',
  blocks: [{ type: 'head' }],
  status: 'draft',
  sort_order: 0,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
}

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  const mod = await import('./portfolio.js')
  handler = mod.default
  pageColumns = mod.pageColumns
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

  it('GET returns every page and the design tokens', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [row], error: null }))
      .mockReturnValueOnce(queryBuilder({ data: { data: { radius: { r1: 2 } } }, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'GET', headers: auth() }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.pages).toEqual([expect.objectContaining({ id: 'p1', slug: 'bibi', sortOrder: 0 })])
    expect(res.body.design).toEqual({ radius: { r1: 2 } })
  })

  it('GET returns empty design on a fresh install', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'GET', headers: auth() }), res)
    expect(res.body).toEqual({ pages: [], design: {} })
  })

  it('POST needs slug and title', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: { title: 'x' }, headers: auth() }), res)
    expect(res.statusCode).toBe(400)
  })

  it('POST rejects a slug that cannot go into a URL', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: { slug: 'Bi Bi', title: 'x' }, headers: auth() }), res)
    expect(res.statusCode).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('POST creates a page', async () => {
    const insert = queryBuilder({ data: row, error: null })
    fromMock.mockReturnValueOnce(insert)
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: { slug: 'bibi', title: 'bibi', blocks: [] }, headers: auth() }), res)
    expect(res.statusCode).toBe(201)
    expect(insert.insert).toHaveBeenCalledWith({ slug: 'bibi', title: 'bibi', blocks: [] })
  })

  it('POST answers 409 when the slug is taken', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: { code: '23505', message: 'dup' } }))
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: { slug: 'bibi', title: 'bibi' }, headers: auth() }), res)
    expect(res.statusCode).toBe(409)
  })

  it('PATCH needs an id', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', body: { title: 'x' }, headers: auth() }), res)
    expect(res.statusCode).toBe(400)
  })

  it('PATCH updates only the fields sent', async () => {
    const update = queryBuilder({ data: { ...row, status: 'published' }, error: null })
    fromMock.mockReturnValueOnce(update)
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', query: { id: 'p1' }, body: { status: 'published' }, headers: auth() }), res)
    expect(res.statusCode).toBe(200)
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }))
    expect(update.update.mock.calls[0][0]).not.toHaveProperty('title')
  })

  it('PATCH 404s on a missing page', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', query: { id: 'nope' }, body: { title: 'x' }, headers: auth() }), res)
    expect(res.statusCode).toBe(404)
  })

  it('DELETE removes a page', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: { id: 'p1' }, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: { id: 'p1' }, headers: auth() }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ id: 'p1' })
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

describe('pageColumns', () => {
  it('maps sortOrder and checks status', () => {
    expect(pageColumns({ sortOrder: 3 })).toEqual({ sort_order: 3 })
    expect(pageColumns({ status: 'archived' })).toBeTypeOf('string')
    expect(pageColumns({ blocks: {} })).toBeTypeOf('string')
  })
})
