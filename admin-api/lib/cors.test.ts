import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyCorsHeaders, withCors } from './cors.js'

function mockReqRes(method: string) {
  const headers: Record<string, string> = {}
  const req = { method } as any
  const res: any = {
    statusCode: undefined,
    ended: false,
    body: undefined,
    setHeader(key: string, value: string) {
      headers[key] = value
    },
    status(code: number) {
      res.statusCode = code
      return res
    },
    end() {
      res.ended = true
      return res
    },
    json(body: unknown) {
      res.body = body
      return res
    },
  }
  return { req, res, headers }
}

describe('applyCorsHeaders', () => {
  beforeEach(() => {
    process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_ALLOWED_ORIGIN
  })

  it('sets Access-Control-Allow-Origin from ADMIN_ALLOWED_ORIGIN', () => {
    const { req, res, headers } = mockReqRes('GET')
    applyCorsHeaders(req, res)
    expect(headers['Access-Control-Allow-Origin']).toBe('https://admin.example.com')
    expect(headers['Access-Control-Allow-Headers']).toContain('Authorization')
    expect(headers['Access-Control-Allow-Methods']).toContain('GET')
  })
})

describe('withCors', () => {
  beforeEach(() => {
    process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_ALLOWED_ORIGIN
  })

  it('short-circuits OPTIONS with a 204 and never calls the wrapped handler', async () => {
    const inner = vi.fn()
    const { req, res, headers } = mockReqRes('OPTIONS')
    await withCors(inner)(req, res)
    expect(res.statusCode).toBe(204)
    expect(res.ended).toBe(true)
    expect(inner).not.toHaveBeenCalled()
    expect(headers['Access-Control-Allow-Origin']).toBe('https://admin.example.com')
  })

  it('sets headers and calls the wrapped handler for non-OPTIONS requests', async () => {
    const inner = vi.fn()
    const { req, res } = mockReqRes('GET')
    await withCors(inner)(req, res)
    expect(inner).toHaveBeenCalledWith(req, res)
  })
})
