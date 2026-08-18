import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./index.js').default
let signToken: typeof import('../../lib/auth.js').signToken

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./index.js')).default
  signToken = (await import('../../lib/auth.js')).signToken
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

describe('GET /api/modules', () => {
  it('requires auth', async () => {
    const req = mockReq({ method: 'GET' })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('returns modules mapped to camelCase', async () => {
    fromMock.mockReturnValue(
      queryBuilder({
        data: [
          {
            id: 'sensory',
            title: 'Sensory',
            accent: '#111',
            on_color: '#fff',
            tint: '#eee',
            tint2: '#ddd',
            layout: 'band',
            concept: 'c',
            blurb: 'b',
            long_desc: 'ld',
            treatment: 't',
            layout_note: 'ln',
            shot1: 's1',
            shot2: 's2',
            shot3: 's3',
            sort_order: 0,
          },
        ],
        error: null,
      }),
    )

    const token = signToken()
    const req = mockReq({ method: 'GET', headers: authHeaders(token) })
    const res = mockRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.modules).toHaveLength(1)
    expect(res.body.modules[0]).toMatchObject({ id: 'sensory', onColor: '#fff', longDesc: 'ld', sortOrder: 0 })
  })

  it('propagates supabase errors as 500', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: { message: 'boom' } }))
    const token = signToken()
    const req = mockReq({ method: 'GET', headers: authHeaders(token) })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(500)
  })
})

describe('POST /api/modules', () => {
  it('creates a placeholder module at the end of the order', async () => {
    const insert = queryBuilder({ data: { id: 'mod1', title: 'module mới', sort_order: 4 }, error: null })
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [{ sort_order: 3 }], error: null }))
      .mockReturnValueOnce(insert)

    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: { id: 'mod1' }, headers: authHeaders(signToken()) }), res)

    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ id: 'mod1', sort_order: 4 }))
    expect(res.statusCode).toBe(201)
  })

  it('starts at sort_order 1 on an empty table', async () => {
    const insert = queryBuilder({ data: { id: 'mod1' }, error: null })
    fromMock.mockReturnValueOnce(queryBuilder({ data: [], error: null })).mockReturnValueOnce(insert)

    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: {}, headers: authHeaders(signToken()) }), res)

    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 1 }))
  })
})

describe('PUT /api/modules', () => {
  it('rejects a body without an id array', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'PUT', body: { order: 'sensory' }, headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('rewrites sort_order to 1..N in the given order', async () => {
    const first = queryBuilder({ data: null, error: null })
    const second = queryBuilder({ data: null, error: null })
    fromMock
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
      .mockReturnValueOnce(queryBuilder({ data: [], error: null }))

    const res = mockRes()
    await handler(
      mockReq({ method: 'PUT', body: { order: ['roasting', 'sensory'] }, headers: authHeaders(signToken()) }),
      res,
    )

    expect(first.update).toHaveBeenCalledWith({ sort_order: 1 })
    expect(first.eq).toHaveBeenCalledWith('id', 'roasting')
    expect(second.update).toHaveBeenCalledWith({ sort_order: 2 })
    expect(second.eq).toHaveBeenCalledWith('id', 'sensory')
    expect(res.statusCode).toBe(200)
  })
})
