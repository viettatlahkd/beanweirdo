import { createHmac, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60

export interface TokenPayload {
  iat: number
  exp: number
}

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (padded.length % 4)) % 4
  return Buffer.from(padded + '='.repeat(padLength), 'base64')
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set')
  return secret
}

function sign(payloadB64: string): string {
  const digest = createHmac('sha256', getSessionSecret()).update(payloadB64).digest()
  return base64url(digest)
}

/** Issues a signed bearer token: base64url(payload) + '.' + base64url(HMAC-SHA256(payload)). */
export function signToken(expiresInSeconds: number = SEVEN_DAYS_SECONDS): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: TokenPayload = { iat: now, exp: now + expiresInSeconds }
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  return `${payloadB64}.${sign(payloadB64)}`
}

/** Verifies signature and expiry. Returns the decoded payload, or null if invalid/expired. */
export function verifyToken(token: string | undefined | null): TokenPayload | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, signature] = parts

  let expectedSigBuf: Buffer
  let actualSigBuf: Buffer
  try {
    expectedSigBuf = base64urlDecode(sign(payloadB64))
    actualSigBuf = base64urlDecode(signature)
  } catch {
    return null
  }
  if (expectedSigBuf.length !== actualSigBuf.length || !timingSafeEqual(expectedSigBuf, actualSigBuf)) {
    return null
  }

  let payload: TokenPayload
  try {
    payload = JSON.parse(base64urlDecode(payloadB64).toString('utf8'))
  } catch {
    return null
  }
  if (typeof payload.exp !== 'number' || typeof payload.iat !== 'number') return null
  if (Math.floor(Date.now() / 1000) > payload.exp) return null
  return payload
}

/**
 * Guard every protected route calls first. Returns true and lets the caller
 * continue when the request carries a valid `Authorization: Bearer <token>`
 * header; otherwise writes a 401 JSON response and returns false.
 */
export function requireAuth(req: VercelRequest, res: VercelResponse): boolean {
  /*
   * Không cache phản hồi của khu admin, ở đâu cả.
   *
   * Vercel mặc định cho `public, max-age=0, must-revalidate` và CDN của họ coi
   * `public` là được phép giữ. Kết quả: `/api/site` bị cache ở biên — đo được
   * `x-vercel-cache: HIT` với `age: 466` — nên CMS tải lại trang là nhận bản cũ,
   * trong khi trang công khai đọc thẳng Supabase nên vẫn tươi. Chủ site soạn
   * xong, thấy web đúng, mở CMS lại thì thấy bản cũ, và tưởng nội dung mất.
   *
   * Đây còn là dữ liệu sau đăng nhập: một phản hồi của khu admin nằm trong cache
   * dùng chung là chuyện không nên xảy ra dù có đúng nội dung hay không.
   */
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  const header = req.headers.authorization
  if (!header || Array.isArray(header) || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return false
  }
  const token = header.slice('Bearer '.length).trim()
  if (!verifyToken(token)) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return false
  }
  return true
}
