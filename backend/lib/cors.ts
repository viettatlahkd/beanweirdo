import type { VercelRequest, VercelResponse } from '@vercel/node'

export type Handler = (req: VercelRequest, res: VercelResponse) => void | Promise<void>

/**
 * Sets CORS headers on every response and short-circuits OPTIONS preflight
 * requests with a 204. Every route in this app is wrapped with `withCors` so
 * none of them can forget it.
 */
export function applyCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  const origin = process.env.ADMIN_ALLOWED_ORIGIN ?? ''
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
}

export function withCors(handler: Handler): Handler {
  return async (req, res) => {
    applyCorsHeaders(req, res)
    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }
    await handler(req, res)
  }
}
