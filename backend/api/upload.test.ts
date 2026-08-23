import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReq, mockRes, authHeaders } from '../lib/test-helpers.js'

const parseMock = vi.fn()
const formidableFactory = vi.fn(() => ({ parse: parseMock }))
vi.mock('formidable', () => ({ default: formidableFactory }))

const readFileMock = vi.fn()
const unlinkMock = vi.fn()
// formidable reaches for the module's default export, so the mock has to carry
// one as well as the named functions the handler itself calls.
vi.mock('node:fs/promises', () => ({
  readFile: readFileMock,
  unlink: unlinkMock,
  default: { readFile: readFileMock, unlink: unlinkMock },
}))

const uploadMock = vi.fn()
const getPublicUrlMock = vi.fn()
vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({
    storage: { from: () => ({ upload: uploadMock, getPublicUrl: getPublicUrlMock }) },
  }),
}))

let handler: typeof import('./upload.js').default
let signToken: typeof import('../lib/auth.js').signToken
let token: string

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  parseMock.mockReset()
  formidableFactory.mockClear()
  readFileMock.mockReset().mockResolvedValue(Buffer.from('fake-bytes'))
  unlinkMock.mockReset().mockResolvedValue(undefined)
  uploadMock.mockReset()
  getPublicUrlMock.mockReset()
  handler = (await import('./upload.js')).default
  signToken = (await import('../lib/auth.js')).signToken
  token = signToken()
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

describe('POST /api/upload', () => {
  it('requires auth', async () => {
    const req = mockReq({ method: 'POST' })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(401)
    expect(parseMock).not.toHaveBeenCalled()
  })

  it('400s when no file field is present', async () => {
    parseMock.mockResolvedValue([{}, {}])
    const req = mockReq({ method: 'POST', headers: authHeaders(token) })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })

  it('uploads the file to the post-images bucket and returns its public url', async () => {
    parseMock.mockResolvedValue([
      {},
      { file: [{ filepath: '/tmp/upload-1', originalFilename: 'photo.jpg', mimetype: 'image/jpeg' }] },
    ])
    uploadMock.mockResolvedValue({ error: null })
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://supabase.local/storage/post-images/xyz.jpg' } })

    const req = mockReq({ method: 'POST', headers: authHeaders(token) })
    const res = mockRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.url).toBe('https://supabase.local/storage/post-images/xyz.jpg')
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/\.jpg$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/jpeg' }),
    )
    expect(unlinkMock).toHaveBeenCalledWith('/tmp/upload-1')
  })

  it('returns 500 when the storage upload fails', async () => {
    parseMock.mockResolvedValue([
      {},
      { file: { filepath: '/tmp/upload-2', originalFilename: 'a.png', mimetype: 'image/png' } },
    ])
    uploadMock.mockResolvedValue({ error: { message: 'bucket full' } })

    const req = mockReq({ method: 'POST', headers: authHeaders(token) })
    const res = mockRes()
    await handler(req, res)
    expect(res.statusCode).toBe(500)
  })
})
