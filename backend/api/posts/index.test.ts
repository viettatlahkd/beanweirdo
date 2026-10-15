import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../../lib/test-helpers.js'
import { POST_COLUMNS } from '../../lib/posts.js'

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
    expect(res.body.posts[0]).toMatchObject({ id: 'p1', module_id: 'sensory', status: 'draft' })
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

  it('flags posts with edits waiting for Publish', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [SAMPLE_ROW, { ...SAMPLE_ROW, id: 'p2' }], error: null }))
      .mockReturnValueOnce(queryBuilder({ data: [{ post_id: 'p2' }], error: null }))
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(queryBuilder({ data: [{ post_id: 'p2', author_id: 'a2' }, { post_id: 'p2', author_id: 'a1' }], error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'GET', headers: authHeaders(token), query: {} }), res)
    expect(fromMock).toHaveBeenNthCalledWith(2, 'post_drafts')
    expect(res.body.posts.map((p: { has_draft: boolean }) => p.has_draft)).toEqual([false, true])
    // Authors come in byline order, so the list can name the lead author first.
    expect(res.body.posts.map((p: { authors: string[] }) => p.authors)).toEqual([[], ['a2', 'a1']])
  })

  it('still lists posts before migration 0028 has run', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [SAMPLE_ROW], error: null }))
      .mockReturnValueOnce(queryBuilder({ data: null, error: { code: 'PGRST205', message: 'post_drafts not found' } }))
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'GET', headers: authHeaders(token), query: {} }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.posts[0].has_draft).toBe(false)
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
  /* A description is a nicety; requiring it meant writing about a post twice. */
  it('creates a post with no description', async () => {
    const insert = queryBuilder({ data: { id: 'new-id' }, error: null })
    fromMock.mockReturnValueOnce(insert)
    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        headers: authHeaders(token),
        body: { module_id: 'sensory', kind: 'note', en: 'Chỉ có tiêu đề', vi: '' },
      }),
      res,
    )
    expect(res.statusCode).toBe(201)
  })

  it('validates required fields', async () => {
    const req = mockReq({ method: 'POST', headers: authHeaders(token), body: {} })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })

  /*
   * `kind` was fenced to four words a programmer chose. Migration 0020 moved
   * that vocabulary into the `tags` table, so any tag the owner has written is
   * valid — what is left to reject is nothing at all.
   */
  it('takes a post with no dạng bài — the template says what it is now', async () => {
    const insert = queryBuilder({ data: { id: 'new-id' }, error: null })
    fromMock.mockReturnValue(insert)
    await handler(
      mockReq({ method: 'POST', headers: authHeaders(token), body: { module_id: 'sensory', en: 'Title', vi: 'Mô tả' } }),
      mockRes(),
    )
    expect((insert.insert.mock.calls[0][0] as { kind: string }).kind).toBe('')
  })

  it('creates a draft and returns its id', async () => {
    const insert = queryBuilder({ data: { id: 'new-id' }, error: null })
    fromMock.mockReturnValueOnce(insert)

    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      body: { module_id: 'sensory', kind: 'essay', en: 'Title', vi: 'Mô tả' },
    })
    const res = mockRes()
    await handler(req, res)

    expect(res.statusCode).toBe(201)
    expect(res.body).toEqual({ id: 'new-id' })
  })

  /*
   * Migration 0016 dropped `posts.n` and this endpoint kept writing it, so
   * every attempt to create a post failed with "Could not find the 'n' column"
   * — the wizard and the module list's "+ bài" alike. The old test mocked the
   * insert away and asserted only the status code, which a 500 never reached.
   */
  it('writes only columns the posts table has', async () => {
    const insert = queryBuilder({ data: { id: 'new-id' }, error: null })
    fromMock.mockReturnValueOnce(insert)

    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      body: { module_id: 'sensory', kind: 'essay', en: 'Title', vi: 'Mô tả' },
    })
    await handler(req, mockRes())

    const written = Object.keys(insert.insert.mock.calls[0][0] as Record<string, unknown>)
    expect(written).not.toContain('n')
    const unknown = written.filter((c) => !(POST_COLUMNS as readonly string[]).includes(c))
    expect(unknown).toEqual([])
  })

  it('leaves sort_order null, so a new post follows published_at', async () => {
    const insert = queryBuilder({ data: { id: 'new-id' }, error: null })
    fromMock.mockReturnValueOnce(insert)

    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      body: { module_id: 'sensory', kind: 'essay', en: 'Title', vi: 'Mô tả' },
    })
    await handler(req, mockRes())

    const row = insert.insert.mock.calls[0][0] as { sort_order: unknown }
    expect(row.sort_order).toBeNull()
  })

  it('maps a foreign key violation (bad module_id) to 400', async () => {
    fromMock.mockReturnValueOnce(
      queryBuilder({ data: null, error: { code: '23503', message: 'fk violation' } }),
    )

    const req = mockReq({
      method: 'POST',
      headers: authHeaders(token),
      body: { module_id: 'nope', kind: 'essay', en: 'Title', vi: 'Mô tả' },
    })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })
})

describe('PUT /api/posts', () => {
  it('requires a module_id', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'PUT', body: { order: ['a'] }, headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(400)
  })

  it('requires order to be an array of ids', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'PUT', body: { module_id: 'sensory', order: 'a' }, headers: authHeaders(signToken()) }),
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
        body: { module_id: 'sensory', order: ['post-b', 'post-a'] },
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
      .mockReturnValueOnce(insert)

    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        body: { module_id: 'biochem', kind: 'note', en: 'Bài mới', vi: 'mô tả', templateId: 't1' },
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

  it('copies an existing post: content comes across, status does not', async () => {
    const insert = queryBuilder({ data: { id: 'copy' }, error: null })
    fromMock
      .mockReturnValueOnce(
        queryBuilder({
          data: {
            template: 'memo',
            body: [{ k: 'p', t: 'thân bài' }, { k: 'fig', src: '/hat-ca-phe.jpg', ar: '1.5' }],
            lead: 'dẫn',
            hero_image_url: '/a.jpg',
            hero_caption: 'chú thích',
            plate_images: { a: '/o.jpg' },
            pull_quote: 'trích',
            further_reading: ['x'],
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(queryBuilder({ data: null, error: null }))
      .mockReturnValueOnce(insert)

    await handler(
      mockReq({
        method: 'POST',
        body: { module_id: 'biochem', kind: 'note', en: 'Bản sao', vi: 'y', fromPostId: 'p1' },
        headers: authHeaders(signToken()),
      }),
      mockRes(),
    )

    const row = insert.insert.mock.calls[0][0] as Record<string, unknown>
    expect(row.template).toBe('memo')
    // Text and pictures both come across.
    expect(row.body).toEqual([{ k: 'p', t: 'thân bài' }, { k: 'fig', src: '/hat-ca-phe.jpg', ar: '1.5' }])
    expect(row.lead).toBe('dẫn')
    expect(row.hero_image_url).toBe('/a.jpg')
    expect(row.hero_caption).toBe('chú thích')
    expect(row.plate_images).toEqual({ a: '/o.jpg' })
    expect(row.thumbnail_url).toBe('/hat-ca-phe.jpg')
    // A copy is a draft nobody has published or placed.
    expect(row.sort_order).toBeNull()
    expect(row).not.toHaveProperty('status')
    expect(row).not.toHaveProperty('pinned')
    expect(row).not.toHaveProperty('published_at')
  })

  it('copies the unpublished edits of a published post, not its live text', async () => {
    const insert = queryBuilder({ data: { id: 'copy' }, error: null })
    fromMock
      .mockReturnValueOnce(
        queryBuilder({
          data: { template: 'memo', body: [{ k: 'p', t: 'cũ' }], lead: 'dẫn cũ', pull_quote: 'trích', further_reading: null },
          error: null,
        }),
      )
      .mockReturnValueOnce(queryBuilder({ data: { data: { body: [{ k: 'p', t: 'mới' }], lead: 'dẫn mới', en: 'Tên mới' } }, error: null }))
      .mockReturnValueOnce(insert)

    await handler(
      mockReq({
        method: 'POST',
        body: { module_id: 'biochem', kind: 'note', en: 'Bản sao', vi: 'y', fromPostId: 'p1' },
        headers: authHeaders(signToken()),
      }),
      mockRes(),
    )

    expect(fromMock).toHaveBeenNthCalledWith(2, 'post_drafts')
    const row = insert.insert.mock.calls[0][0] as Record<string, unknown>
    expect(row.body).toEqual([{ k: 'p', t: 'mới' }])
    expect(row.lead).toBe('dẫn mới')
    expect(row.pull_quote).toBe('trích')
    // The copy's own title is the one typed in the dialog, never the draft's.
    expect(row.en).toBe('Bản sao')
  })

  it('rejects a post id that does not exist', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        body: { module_id: 'biochem', kind: 'note', en: 'x', vi: 'y', fromPostId: 'gone' },
        headers: authHeaders(signToken()),
      }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('refuses a template and a post at once — they disagree about the body', async () => {
    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        body: { module_id: 'biochem', kind: 'note', en: 'x', vi: 'y', templateId: 't1', fromPostId: 'p1' },
        headers: authHeaders(signToken()),
      }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('rejects a template id that does not exist', async () => {
    fromMock.mockReturnValueOnce(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        body: { module_id: 'biochem', kind: 'note', en: 'x', vi: 'y', templateId: 'gone' },
        headers: authHeaders(signToken()),
      }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('still creates an empty post when no template is named', async () => {
    const insert = queryBuilder({ data: { id: 'new' }, error: null })
    fromMock.mockReturnValueOnce(insert)

    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        body: { module_id: 'biochem', kind: 'note', en: 'x', vi: 'y' },
        headers: authHeaders(signToken()),
      }),
      res,
    )

    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ template: 'article', body: null }))
  })
})

/*
 * Cột `thumbnail_url` (xem docs/inbox/qa/2026-09-18-qa-39-thumbnail-url.sql).
 *
 * Trước đây danh sách bài gửi cả `body` ra trình duyệt chỉ để tìm một tấm ảnh,
 * nên mở /ad-post là tải toàn bộ nội dung mọi bài. Giờ máy chủ có đọc `body`
 * để cắt dòng xem trước, nhưng chỉ gửi đi dòng ấy, không gửi `body`.
 */
describe('GET /api/posts — không gửi body ra trình duyệt', () => {
  it('gửi thumbnail_url và dòng xem trước, không gửi body', async () => {
    const builder = queryBuilder({ data: [{ ...SAMPLE_ROW, body: [{ p: 'Câu đầu bài.' }] }], error: null })
    fromMock.mockReturnValue(builder)

    const req = mockReq({ method: 'GET', headers: authHeaders(token), query: {} })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(200)

    expect(builder.select.mock.calls[0][0] as string).toContain('thumbnail_url')
    const [post] = (res.body as { posts: Record<string, unknown>[] }).posts
    expect(post).not.toHaveProperty('body')
    expect(post).toMatchObject({ excerpt: 'Câu đầu bài.', read_minutes: 1 })
  })
})
