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

  /*
   * The editor autosaves on every blur. Answering with `*` meant each of those
   * pulled the whole jsonb body back down to report a field the caller had just
   * sent — see the note in index.ts.
   */
  it('answers with the patched columns and never with body', async () => {
    const builder = queryBuilder({ data: { id: 'p1', en: 'New title' }, error: null })
    fromMock.mockReturnValue(builder)
    const req = mockReq({
      method: 'PATCH',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { en: 'New title', body: [{ kind: 'p' }] },
    })
    const res = mockRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const selected = builder.select.mock.calls[0][0] as string
    const columns = selected.split(',').map((c: string) => c.trim())
    expect(columns).toContain('id')
    expect(columns).toContain('en')
    expect(columns).toContain('updated_at')
    expect(columns).not.toContain('body')
    // The write itself still carries body — only the answer leaves it out.
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ body: [{ kind: 'p' }] }))
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

/*
 * `thumbnail_url` là cột dẫn xuất: khách gọi không đặt được nó (nó không nằm
 * trong PATCHABLE), và nó chỉ phụ thuộc vào `body`. Nên đúng một chỗ tính lại
 * nó — chính là chỗ ghi `body` này.
 */
describe('PATCH /api/posts/:id — ảnh đại diện đi theo thân bài', () => {
  it('tính lại khi thân bài đổi', async () => {
    const builder = queryBuilder({ data: { id: 'p1' }, error: null })
    fromMock.mockReturnValue(builder)

    const req = mockReq({
      method: 'PATCH',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { body: [{ k: 'fig', src: '/vua-dan.png' }] },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)

    const written = builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(written.thumbnail_url).toBe('/vua-dan.png')
    // Và câu trả lời vẫn không kéo `body` về.
    expect(builder.select.mock.calls[0][0]).not.toContain('body')
  })

  it('xoá hết ảnh khỏi bài thì ô đại diện cũng trống theo', async () => {
    const builder = queryBuilder({ data: { id: 'p1' }, error: null })
    fromMock.mockReturnValue(builder)

    const req = mockReq({
      method: 'PATCH',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { body: [{ k: 'p', text: 'chữ thôi' }] },
    })
    const res = mockRes()
    await handler(req, res)

    const written = builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(written.thumbnail_url).toBeNull()
  })

  it('không đụng tới nó khi lần sửa này không chạm thân bài', async () => {
    const builder = queryBuilder({ data: { id: 'p1' }, error: null })
    fromMock.mockReturnValue(builder)

    const req = mockReq({
      method: 'PATCH',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { en: 'Tên khác' },
    })
    const res = mockRes()
    await handler(req, res)

    const written = builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(written).not.toHaveProperty('thumbnail_url')
  })

  it('khách gọi không tự đặt được nó', async () => {
    const builder = queryBuilder({ data: { id: 'p1' }, error: null })
    fromMock.mockReturnValue(builder)

    const req = mockReq({
      method: 'PATCH',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { en: 'Tên khác', thumbnail_url: '/tu-dat.png' },
    })
    const res = mockRes()
    await handler(req, res)

    const written = builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(written).not.toHaveProperty('thumbnail_url')
  })
})
