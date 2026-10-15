import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../../../lib/test-helpers.js'

const fromMock = vi.fn()
const rpcMock = vi.fn()
vi.mock('../../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock, rpc: rpcMock }),
}))

let handler: typeof import('./status.js').default
let signToken: typeof import('../../../lib/auth.js').signToken
let token: string

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  rpcMock.mockReset()
  // fold_post_draft (0029): a draft post with nothing pending.
  rpcMock.mockResolvedValue({ data: { status: 'draft', applied: false }, error: null })
  handler = (await import('./status.js')).default
  signToken = (await import('../../../lib/auth.js')).signToken
  token = signToken()
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

function fullRow(status: string, previous_status: string | null = null) {
  return {
    id: 'p1',
    module_id: 'sensory',
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
    previous_status: previous_status,
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
    rpcMock.mockResolvedValue({ data: null, error: null })
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

  /*
   * Bốn hành động dưới đây là MỘT câu lệnh. Phép kiểm "bài đang ở trạng thái
   * nào" nằm trong mệnh đề `WHERE` của chính câu ghi, nên `toHaveBeenCalledTimes(1)`
   * ở đây không phải chi tiết vặt — nó chính là điều đang được giữ.
   */
  it('publish: draft -> published, in one statement', async () => {
    const builder = queryBuilder({
      data: { id: 'p1', status: 'published', published_at: 'now', updated_at: 'now' },
      error: null,
    })
    fromMock.mockReturnValue(builder)

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

    // The fold (one RPC) and the status change (one statement).
    expect(rpcMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(builder.in).toHaveBeenCalledWith('status', ['draft'])
    // Và câu trả lời không kéo cả bài về: chỉ những cột vừa ghi.
    expect(builder.select.mock.calls[0][0]).not.toContain('body')
  })

  it('rejects archiving a draft with 400', async () => {
    fromMock
      // Câu ghi không khớp dòng nào: bài đang là draft, `archive` chỉ áp được
      // từ published.
      .mockReturnValueOnce(queryBuilder({ data: null, error: null }))
      // Chỉ ở nhánh hỏng mới đọc, để nói rõ vì sao.
      .mockReturnValueOnce(queryBuilder({ data: { status: 'draft' }, error: null }))

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
    expect(res.body.error).toMatch(/draft/)
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
    expect(res.body.post.previous_status).toBe('published')
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
    expect(res.body.post.previous_status).toBeNull()
  })

  it('permanently-delete: deleted -> hard delete, in one statement', async () => {
    const builder = queryBuilder({ data: { id: 'p1' }, error: null })
    fromMock.mockReturnValue(builder)

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

    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(builder.delete).toHaveBeenCalled()
    // Cái giữ cho một bài chưa xoá mềm không bị xoá cứng.
    expect(builder.in).toHaveBeenCalledWith('status', ['deleted'])
  })

  it('rejects permanently-delete on a non-deleted post', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: null, error: null }))
      .mockReturnValueOnce(queryBuilder({ data: { status: 'published' }, error: null }))

    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      query: { id: 'p1' },
      body: { action: 'permanently-delete' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/published/)
  })
})

describe('Publish on a published post publishes its pending edits (migrations 0028, 0029)', () => {
  it('is one call: the fold copies the draft and reports the post already live', async () => {
    rpcMock.mockResolvedValue({ data: { status: 'published', applied: true }, error: null })
    const req = mockReq({ method: 'POST', headers: authHeaders(token), query: { id: 'p1' }, body: { action: 'publish' } })
    const res = mockRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ post: { id: 'p1', status: 'published' }, applied: true })
    expect(rpcMock).toHaveBeenCalledWith('fold_post_draft', { p_id: 'p1', p_now: expect.any(String) })
    // published_at is not touched: nothing else runs.
    expect(fromMock).not.toHaveBeenCalled()
  })
})
