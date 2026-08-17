import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./modules.js').default
let signToken: typeof import('../lib/auth.js').signToken

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./modules.js')).default
  signToken = (await import('../lib/auth.js')).signToken
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
