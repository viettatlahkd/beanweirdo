// Real end-to-end wiring check against the local Docker Supabase stack
// (`npx supabase start` in backend/). Skips gracefully — never fails — when
// that stack isn't reachable, so `vitest run` stays green in CI/sandboxes
// that don't have Docker running.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { mockReq, mockRes, authHeaders } from '../lib/test-helpers.js'

function loadDotEnvLocal(): void {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadDotEnvLocal()

async function isSupabaseReachable(): Promise<boolean> {
  const url = process.env.SUPABASE_URL
  if (!url) return false
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1500)
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: process.env.SUPABASE_SECRET_KEY ?? '' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    return res.status < 500
  } catch {
    return false
  }
}

describe('integration: real local Supabase', () => {
  it('POST /api/login issues a token verifiable end-to-end using the real env password', async (ctx) => {
    if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
      ctx.skip()
      return
    }

    const handler = (await import('./login.js')).default
    const { verifyToken } = await import('../lib/auth.js')

    const req = mockReq({ method: 'POST', body: { password: process.env.ADMIN_PASSWORD } })
    const res = mockRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(verifyToken(res.body.token)).not.toBeNull()
  })

  it('GET /api/posts hits the real local Supabase and returns rows', async (ctx) => {
    if (!(await isSupabaseReachable())) {
      ctx.skip()
      return
    }

    const handler = (await import('./posts/index.js')).default
    const { signToken } = await import('../lib/auth.js')

    const req = mockReq({
      method: 'GET',
      headers: authHeaders(signToken()),
      query: { status: 'all' },
    })
    const res = mockRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body.posts)).toBe(true)
  })
})
