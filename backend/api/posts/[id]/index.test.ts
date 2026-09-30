import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../../../lib/test-helpers.js'

const fromMock = vi.fn()
const rpcMock = vi.fn()
vi.mock('../../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock, rpc: rpcMock }),
}))

let handler: typeof import('./index.js').default
let signToken: typeof import('../../../lib/auth.js').signToken
let token: string

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  rpcMock.mockReset()
  // stage_post_draft (0029) answers with the post's status; a draft is written straight through.
  rpcMock.mockResolvedValue({ data: 'draft', error: null })
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

  it('returns the full post detail, with its byline in order', async () => {
    const byline = [
      { position: 0, authors: { id: 'a2', name: 'Bình', slug: 'binh', avatar_url: null } },
      { position: 1, authors: { id: 'a1', name: 'An', slug: 'an', avatar_url: null } },
    ]
    fromMock.mockImplementation((table: string) =>
      queryBuilder({ data: table === 'post_authors' ? byline : SAMPLE_ROW, error: null }),
    )
    const req = mockReq({ method: 'GET', headers: authHeaders(token), query: { id: 'p1' } })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.post).toMatchObject({ id: 'p1', en: 'Title', status: 'draft' })
    expect(res.body.post.authors.map((a: { id: string }) => a.id)).toEqual(['a2', 'a1'])
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
    const selected = builder.select.mock.calls.at(-1)![0] as string
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
    rpcMock.mockResolvedValue({ data: null, error: null })
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

/*
 * `sort_order` đánh 1..N **trong một module** (xem `handleReorder`), nên nó
 * không mang sang nhà mới được: số 3 của module cũ là số 3 của một dãy khác.
 */
describe('PATCH /api/posts/:id — chuyển bài sang module khác', () => {
  it('ghi module mới và bỏ vị trí tự chọn', async () => {
    const builder = queryBuilder({ data: { id: 'p1', module_id: 'roastery' }, error: null })
    fromMock.mockReturnValue(builder)

    const req = mockReq({
      method: 'PATCH',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { module_id: 'roastery' },
    })
    const res = mockRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const written = builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(written.module_id).toBe('roastery')
    expect(written.sort_order).toBeNull()
  })

  it('nhường lại nếu chính lượt vá ấy tự đặt vị trí', async () => {
    const builder = queryBuilder({ data: { id: 'p1' }, error: null })
    fromMock.mockReturnValue(builder)

    const req = mockReq({
      method: 'PATCH',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { module_id: 'roastery', sort_order: 2 },
    })
    const res = mockRes()
    await handler(req, res)

    const written = builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(written.sort_order).toBe(2)
  })

  it('không đụng vị trí khi lần sửa này không chuyển module', async () => {
    const builder = queryBuilder({ data: { id: 'p1' }, error: null })
    fromMock.mockReturnValue(builder)

    const req = mockReq({
      method: 'PATCH',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { en: 'Tên mới' },
    })
    const res = mockRes()
    await handler(req, res)

    const written = builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(written).not.toHaveProperty('sort_order')
  })
})

describe('PATCH a published post — edits wait for Publish (migrations 0028, 0029)', () => {
  it('stages content in one call and leaves posts alone', async () => {
    rpcMock.mockResolvedValue({ data: 'published', error: null })
    const req = mockReq({
      method: 'PATCH',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { lead: 'Mới', body: [{ k: 'p' }] },
    })
    const res = mockRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.post).toEqual({ id: 'p1', has_draft: true })
    expect(rpcMock).toHaveBeenCalledWith('stage_post_draft', {
      p_id: 'p1',
      // The derived thumbnail rides along, so Publish copies it with the body.
      p_content: { lead: 'Mới', body: [{ k: 'p' }], thumbnail_url: null },
      p_now: expect.any(String),
    })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('still applies filing at once — a pin is not content', async () => {
    const builder = queryBuilder({ data: { id: 'p1', pinned: true }, error: null })
    fromMock.mockReturnValue(builder)
    const req = mockReq({ method: 'PATCH', headers: authHeaders(token), query: { id: 'p1' }, body: { pinned: true } })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(rpcMock).not.toHaveBeenCalled()
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ pinned: true }))
  })

  /*
   * The bug this replaced: a refused draft write (the grant was missing from
   * 0028) was read as "no table yet" and the edit went to `posts`, live.
   */
  it('never writes a published post live when the draft cannot be saved', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied for table post_drafts' } })
    const live = queryBuilder({ data: { id: 'p1' }, error: null })
    fromMock.mockReturnValue(live)
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', headers: authHeaders(token), query: { id: 'p1' }, body: { lead: 'Mới' } }), res)
    expect(res.statusCode).toBe(500)
    expect(live.update).not.toHaveBeenCalled()
  })

  it('refuses a published post before 0029 is run, still writes a draft post', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } })
    const published = queryBuilder({ data: { status: 'published' }, error: null })
    fromMock.mockReturnValue(published)
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', headers: authHeaders(token), query: { id: 'p1' }, body: { lead: 'Mới' } }), res)
    expect(res.statusCode).toBe(500)
    expect(published.update).not.toHaveBeenCalled()

    const draft = queryBuilder({ data: { status: 'draft' }, error: null })
    fromMock.mockReturnValue(draft)
    const res2 = mockRes()
    await handler(mockReq({ method: 'PATCH', headers: authHeaders(token), query: { id: 'p1' }, body: { lead: 'Mới' } }), res2)
    expect(res2.statusCode).toBe(200)
    expect(draft.update).toHaveBeenCalledWith(expect.objectContaining({ lead: 'Mới' }))
  })
})

describe('GET shows the editor the unpublished version', () => {
  it('lays pending edits over the published row', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: { ...SAMPLE_ROW, status: 'published' }, error: null }))
      .mockReturnValueOnce(queryBuilder({ data: { data: { en: 'Tiêu đề mới' } }, error: null }))
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))
    const req = mockReq({ method: 'GET', headers: authHeaders(token), query: { id: 'p1' } })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.post).toMatchObject({ en: 'Tiêu đề mới', has_draft: true })
  })
})
