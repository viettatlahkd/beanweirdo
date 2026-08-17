import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../../../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./status.js').default
let signToken: typeof import('../../../lib/auth.js').signToken
let token: string

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./status.js')).default
  signToken = (await import('../../../lib/auth.js')).signToken
  token = signToken()
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

function fullRow(status: string, previousStatus: string | null = null) {
  return {
    id: 'p1',
    module_id: 'sensory',
    n: '01',
    en: 'T',
    vi: 'V',
    kind: 'essay',
    date_label: '2026.08',
    slug: null,
    body: null,
    hero_caption: null,
    lead: null,
    pull_quote: null,
    further_reading: null,
    status,
    template: 'article',
    hero_image_url: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    published_at: null,
    deleted_at: null,
    previous_status: previousStatus,
  }
}

describe('POST /api/posts/:id/status', () => {
  it('requires auth', async () => {
    const req = mockReq({ method: 'POST', query: { id: 'p1' }, body: { action: 'publish' } })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(401)
  })

  it('rejects an unknown action with 400', async () => {
    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { action: 'teleport' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('404s when the post does not exist', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      query: { id: 'missing' },
      body: { action: 'publish' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(404)
  })

  it('publish: draft -> published', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: { id: 'p1', status: 'draft', previous_status: null }, error: null }))
      .mockReturnValueOnce(queryBuilder({ data: fullRow('published'), error: null }))

    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { action: 'publish' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.post.status).toBe('published')
  })

  it('rejects archiving a draft with 400', async () => {
    fromMock.mockReturnValueOnce(
      queryBuilder({ data: { id: 'p1', status: 'draft', previous_status: null }, error: null }),
    )

    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { action: 'archive' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/archive/)
  })

  it('delete: published -> deleted, records previous_status', async () => {
    fromMock
      .mockReturnValueOnce(
        queryBuilder({ data: { id: 'p1', status: 'published', previous_status: null }, error: null }),
      )
      .mockReturnValueOnce(queryBuilder({ data: fullRow('deleted', 'published'), error: null }))

    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { action: 'delete' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.post.status).toBe('deleted')
    expect(res.body.post.previousStatus).toBe('published')
  })

  it('restore-trash: deleted -> previous_status, clearing deleted_at/previous_status', async () => {
    fromMock
      .mockReturnValueOnce(
        queryBuilder({ data: { id: 'p1', status: 'deleted', previous_status: 'archived' }, error: null }),
      )
      .mockReturnValueOnce(queryBuilder({ data: fullRow('archived', null), error: null }))

    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { action: 'restore-trash' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.post.status).toBe('archived')
    expect(res.body.post.previousStatus).toBeNull()
  })

  it('permanently-delete: deleted -> hard delete, no post in response', async () => {
    fromMock
      .mockReturnValueOnce(
        queryBuilder({ data: { id: 'p1', status: 'deleted', previous_status: 'draft' }, error: null }),
      )
      .mockReturnValueOnce(queryBuilder({ error: null }))

    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { action: 'permanently-delete' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ deleted: true })

    const deleteBuilder = fromMock.mock.results[1].value
    expect(deleteBuilder.delete).toHaveBeenCalled()
  })

  it('rejects permanently-delete on a non-deleted post', async () => {
    fromMock.mockReturnValueOnce(
      queryBuilder({ data: { id: 'p1', status: 'published', previous_status: null }, error: null }),
    )
    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { action: 'permanently-delete' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })
})
