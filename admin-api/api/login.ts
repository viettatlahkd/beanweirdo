import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../lib/cors.js'
import { signToken } from '../lib/auth.js'

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    res.status(500).json({ error: 'Server misconfigured: ADMIN_PASSWORD is not set' })
    return
  }

  const body = (req.body ?? {}) as { password?: unknown }
  const password = body.password

  if (typeof password !== 'string' || password.length === 0 || password !== expected) {
    res.status(401).json({ error: 'Invalid password' })
    return
  }

  const token = signToken()
  res.status(200).json({ token })
}

export default withCors(handler)
