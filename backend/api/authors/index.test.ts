import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let list: typeof import('./index.js').default
let one: typeof import('./[id]/index.js').default
let byline: typeof import('../posts/[id]/authors.js').default
let signToken: typeof import('../../lib/auth.js').signToken

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  fromMock.mockReset()
  list = (await import('./index.js')).default
  one = (await import('./[id]/index.js')).default
  byline = (await import('../posts/[id]/authors.js')).default
  signToken = (await import('../../lib/auth.js')).signToken
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  vi.resetModules()
})

const auth = () => ({ headers: authHeaders(signToken()) })
const A1 = '11111111-1111-4111-8111-111111111111'
const A2 = '22222222-2222-4222-8222-222222222222'
const POST = '99999999-9999-4999-8999-999999999999'
const row = (over = {}) => ({
  id: A1,
  name: 'Nguyễn Đức',
  slug: 'nguyen-duc',
  avatar_url: null,
  bio: '',
  active: true,
  created_at: '2026-09-30T00:00:00Z',
  post_authors: [{ count: 2 }],
  ...over,
})

describe('POST /api/authors', () => {
  it('derives the slug from the name and answers with the contract shape', async () => {
    const insert = queryBuilder({ data: row(), error: null })
    fromMock.mockReturnValue(insert)
    const res = mockRes()
    await list(mockReq({ method: 'POST', body: { name: '  Nguyễn Đức ' }, ...auth() }), res)
    expect(res.statusCode).toBe(201)
    expect(insert.insert).toHaveBeenCalledWith({ name: 'Nguyễn Đức', slug: 'nguyen-duc' })
    expect(res.body.author).toMatchObject({ slug: 'nguyen-duc', post_count: 2 })
    expect(res.body.author).not.toHaveProperty('post_authors')
  })

  it('refuses a field the contract does not name, and says which', async () => {
    const res = mockRes()
    await list(mockReq({ method: 'POST', body: { name: 'An', avatarUrl: 'x' }, ...auth() }), res)
    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({ code: 'invalid', field: 'avatarUrl' })
  })

  it('409s with field slug when the slug is taken', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: { code: '23505', message: 'dup' } }))
    const res = mockRes()
    await list(mockReq({ method: 'POST', body: { name: 'An' }, ...auth() }), res)
    expect(res.statusCode).toBe(409)
    expect(res.body).toMatchObject({ code: 'conflict', field: 'slug' })
  })
})

describe('DELETE /api/authors/:id', () => {
  it('refuses while posts name the author, and says how many', async () => {
    const count = queryBuilder({ data: null, error: null, count: 3 })
    fromMock.mockReturnValue(count)
    const res = mockRes()
    await one(mockReq({ method: 'DELETE', query: { id: A1 }, ...auth() }), res)
    expect(res.statusCode).toBe(409)
    expect(res.body).toMatchObject({ code: 'conflict', details: { post_count: 3 } })
    expect(count.delete).not.toHaveBeenCalled()
  })
})

describe('PUT /api/posts/:id/authors', () => {
  const tables = (current: string[], found: object[]) => {
    const writes = queryBuilder({ data: null, error: null })
    const deletes = queryBuilder({ data: null, error: null })
    let authorWrites = 0
    fromMock.mockImplementation((table: string) => {
      if (table === 'posts') return queryBuilder({ data: { id: POST }, error: null })
      if (table === 'authors') return queryBuilder({ data: found, error: null })
      // post_authors: first the read of who is there now, then the upsert, then the delete.
      authorWrites += 1
      if (authorWrites === 1) return queryBuilder({ data: current.map((author_id) => ({ author_id })), error: null })
      return authorWrites === 2 ? writes : deletes
    })
    return { writes, deletes }
  }

  it('writes the list in order and drops whoever left it', async () => {
    const { writes, deletes } = tables([A1, A2], [row({ id: A2, name: 'Bình', slug: 'binh' })])
    const res = mockRes()
    await byline(mockReq({ method: 'PUT', query: { id: POST }, body: { author_ids: [A2] }, ...auth() }), res)
    expect(res.statusCode).toBe(200)
    expect(writes.upsert).toHaveBeenCalledWith([{ post_id: POST, author_id: A2, position: 0 }], {
      onConflict: 'post_id,author_id',
    })
    expect(deletes.in).toHaveBeenCalledWith('author_id', [A1])
    expect(res.body).toEqual({ authors: [{ id: A2, name: 'Bình', slug: 'binh', avatar_url: null }] })
  })

  it('will not add a turned-off author to a post they are not on', async () => {
    const { writes } = tables([], [row({ active: false })])
    const res = mockRes()
    await byline(mockReq({ method: 'PUT', query: { id: POST }, body: { author_ids: [A1] }, ...auth() }), res)
    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({ code: 'invalid', field: 'author_ids' })
    expect(writes.upsert).not.toHaveBeenCalled()
  })
})
