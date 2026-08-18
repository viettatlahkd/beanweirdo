import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../lib/supabase.js', () => ({ getSupabase: () => ({ from: fromMock }) }))

let handler: typeof import('./templates.js').default
let signToken: typeof import('../lib/auth.js').signToken

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./templates.js')).default
  signToken = (await import('../lib/auth.js')).signToken
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

const row = {
  id: 't1',
  name: 'Long-form',
  description: 'Bài rất dài',
  renderer: 'longform',
  body: [{ k: 'h1' }],
  sort_order: 2,
  created_at: 'x',
  updated_at: 'x',
}

describe('GET /api/templates', () => {
  it('requires auth — templates are a writing tool, not public content', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'GET' }), res)
    expect(res.statusCode).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('lists the choices without their bodies', async () => {
    const builder = queryBuilder({ data: [row], error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(mockReq({ method: 'GET', headers: authHeaders(signToken()) }), res)

    // A long-form body is 10KB nobody is reading while choosing.
    expect(builder.select).toHaveBeenCalledWith('id, name, description, renderer, sort_order')
    expect(res.body.templates[0]).toMatchObject({ name: 'Long-form', renderer: 'longform' })
  })

  it('returns one template whole, body included', async () => {
    const builder = queryBuilder({ data: row, error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(mockReq({ method: 'GET', query: { id: 't1' }, headers: authHeaders(signToken()) }), res)

    expect(builder.select).toHaveBeenCalledWith('*')
    expect(res.body.template.body).toEqual([{ k: 'h1' }])
  })

  it('404s for a template that is not there', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'GET', query: { id: 'nope' }, headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /api/templates', () => {
  it('saves an edited body back to the template', async () => {
    const builder = queryBuilder({ data: { ...row, body: [{ k: 'p' }] }, error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: { id: 't1' }, body: { body: [{ k: 'p' }] }, headers: authHeaders(signToken()) }),
      res,
    )

    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ body: [{ k: 'p' }] }))
    expect(res.statusCode).toBe(200)
  })

  it('rejects a body with nothing editable in it', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: { id: 't1' }, body: { renderer: 'cards' }, headers: authHeaders(signToken()) }),
      res,
    )
    // `renderer` is not patchable: changing it would leave stored content that
    // the new renderer was never written for.
    expect(res.statusCode).toBe(400)
  })
})
