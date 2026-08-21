import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../../../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./index.js').default
let signToken: typeof import('../../../lib/auth.js').signToken
let token: string

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./index.js')).default
  signToken = (await import('../../../lib/auth.js')).signToken
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
  slug: null,
  body: null,
  hero_caption: null,
  lead: null,
  pull_quote: null,
  further_reading: null,
  status: 'draft',
  template: 'article',
  hero_image_url: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  published_at: null,
  deleted_at: null,
  previous_status: null,
}

describe('GET /api/posts/:id', () => {
  it('requires auth', async () => {
    const req = mockReq({ method: 'GET', query: { id: 'p1' } })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(401)
  })

  it('400s when id is missing', async () => {
    const req = mockReq({ method: 'GET', headers: authHeaders(token), query: {} })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })

  it('returns the full post detail', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: SAMPLE_ROW, error: null }))
    const req = mockReq({ method: 'GET', headers: authHeaders(token), query: { id: 'p1' } })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.post).toMatchObject({ id: 'p1', en: 'Title', status: 'draft' })
  })

  it('404s when the post does not exist', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const req = mockReq({ method: 'GET', headers: authHeaders(token), query: { id: 'missing' } })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /api/posts/:id', () => {
  it('400s when no updatable fields are provided', async () => {
    const req = mockReq({ method: 'PATCH', headers: authHeaders(token), query: { id: 'p1' }, body: {} })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('updates only the provided fields and bumps updated_at', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: { ...SAMPLE_ROW, en: 'New title' }, error: null }))
    const req = mockReq({
      method: 'PATCH',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { en: 'New title' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.post.en).toBe('New title')

    const builder = fromMock.mock.results[0].value
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ en: 'New title', updated_at: expect.any(String) }))
  })

  it('404s when updating a post that does not exist', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const req = mockReq({
      method: 'PATCH',
      headers: authHeaders(token),
      query: { id: 'missing' },
      body: { en: 'x' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(404)
  })
})
