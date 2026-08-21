import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./index.js').default
let signToken: typeof import('../../lib/auth.js').signToken
let token: string

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./index.js')).default
  signToken = (await import('../../lib/auth.js')).signToken
  token = signToken()
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

const SAMPLE_ROW = {
  id: 'p1',
  module_id: 'sensory',
  en: 'Title',
  vi: 'Mô tả',
  kind: 'essay',
  date_label: '2026.08',
  status: 'draft',
  template: 'article',
  hero_image_url: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  published_at: null,
}

describe('GET /api/posts', () => {
  it('requires auth', async () => {
    const req = mockReq({ method: 'GET' })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(401)
  })

  it('lists all posts by default', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: [SAMPLE_ROW], error: null }))
    const req = mockReq({ method: 'GET', headers: authHeaders(token), query: {} })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.posts).toHaveLength(1)
    expect(res.body.posts[0]).toMatchObject({ id: 'p1', moduleId: 'sensory', status: 'draft' })
  })

  it('accepts status=draft|published|archived|deleted|all', async () => {
    for (const status of ['draft', 'published', 'archived', 'deleted', 'all']) {
      fromMock.mockReturnValue(queryBuilder({ data: [], error: null }))
      const req = mockReq({ method: 'GET', headers: authHeaders(token), query: { status } })
      const res = mockRes()
      await handler(req, res)
      expect(res.statusCode).toBe(200)
    }
  })

  it('rejects an invalid status filter with 400', async () => {
    const req = mockReq({ method: 'GET', headers: authHeaders(token), query: { status: 'bogus' } })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })
})

describe('POST /api/posts', () => {
  it('validates required fields', async () => {
    const req = mockReq({ method: 'POST', headers: authHeaders(token), body: {} })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })

  it('rejects an invalid kind', async () => {
    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      body: { moduleId: 'sensory', kind: 'bogus', en: 'E', vi: 'V' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })

  it('creates a draft and returns its id', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ count: 3, error: null })) // count query
      .mockReturnValueOnce(queryBuilder({ data: { id: 'new-id' }, error: null })) // insert

    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      body: { moduleId: 'sensory', kind: 'essay', en: 'Title', vi: 'Mô tả' },
    })
    const res = mockRes()
    await handler(req, res)

    expect(res.statusCode).toBe(201)
    expect(res.body).toEqual({ id: 'new-id' })
  })

  it('maps a foreign key violation (bad moduleId) to 400', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(queryBuilder({ data: null, error: { code: '23503', message: 'fk violation' } }))

    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      body: { moduleId: 'nope', kind: 'essay', en: 'Title', vi: 'Mô tả' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })
})

describe('PUT /api/posts', () => {
  it('requires a moduleId', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'PUT', body: { order: ['a'] }, headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(400)
  })

  it('requires order to be an array of ids', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'PUT', body: { moduleId: 'sensory', order: 'a' }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('rewrites sort_order, scoped to the module', async () => {
    const first = queryBuilder({ data: null, error: null })
    const second = queryBuilder({ data: null, error: null })
    fromMock
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))

    const res = mockRes()
    await handler(
      mockReq({
        method: 'PUT',
        body: { moduleId: 'sensory', order: ['post-b', 'post-a'] },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(first.update).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 1 }))
    expect(first.eq).toHaveBeenCalledWith('id', 'post-b')
    expect(first.eq).toHaveBeenCalledWith('module_id', 'sensory')
    // The reader's number comes from the list on screen, so order is all that
    // is stored — nothing writes a display number any more.
    expect(second.update).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 2 }))
    expect(second.update).toHaveBeenCalledWith(expect.not.objectContaining({ n: expect.anything() }))
    expect(res.statusCode).toBe(200)
  })
})

describe('POST /api/posts — starting from a template', () => {
  it('copies the template body into the new post and takes its renderer', async () => {
    const insert = queryBuilder({ data: { id: 'new' }, error: null })
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: { renderer: 'longform', body: [{ k: 'h1' }] }, error: null }))
      .mockReturnValueOnce(queryBuilder({ data: [], error: null, count: 2 }))
      .mockReturnValueOnce(insert)

    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        body: { moduleId: 'biochem', kind: 'note', en: 'Bài mới', vi: 'mô tả', templateId: 't1' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    // Picking a template that starts empty was the whole bug: the choice only
    // set a column and the writer got a blank page.
    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'longform', body: [{ k: 'h1' }] }),
    )
    expect(res.statusCode).toBe(201)
  })

  it('rejects a template id that does not exist', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        body: { moduleId: 'biochem', kind: 'note', en: 'x', vi: 'y', templateId: 'gone' },
        headers: authHeaders(signToken()),
      }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('still creates an empty post when no template is named', async () => {
    const insert = queryBuilder({ data: { id: 'new' }, error: null })
    fromMock.mockReturnValueOnce(queryBuilder({ data: [], error: null, count: 0 })).mockReturnValueOnce(insert)

    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        body: { moduleId: 'biochem', kind: 'note', en: 'x', vi: 'y' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ template: 'article', body: null }))
  })
})
