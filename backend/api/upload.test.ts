import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReq, mockRes, authHeaders } from '../lib/test-helpers.js'

const createSignedUploadUrlMock = vi.fn()
const getPublicUrlMock = vi.fn()
vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: createSignedUploadUrlMock,
        getPublicUrl: getPublicUrlMock,
      }),
    },
  }),
}))

let handler: typeof import('./upload.js').default
let signToken: typeof import('../lib/auth.js').signToken
let token: string

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  createSignedUploadUrlMock.mockReset().mockResolvedValue({
    data: { path: 'x', token: 'signed-token', signedUrl: 'https://storage/sign' },
    error: null,
  })
  getPublicUrlMock.mockReset().mockReturnValue({ data: { publicUrl: 'https://cdn/post-images/x.jpg' } })
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
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: { filename: 'a.jpg' } }), res)
    expect(res.statusCode).toBe(401)
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled()
  })

  it('rejects anything but POST', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'GET', headers: authHeaders(token) }), res)
    expect(res.statusCode).toBe(405)
  })

  /*
   * Cái đang được giữ ở đây: route này KHÔNG nhận tệp. Nó ký một vé rồi thôi,
   * nên thời gian chờ của người dùng chỉ còn một lượt tải chứ không phải hai.
   */
  it('signs a ticket and never touches the file', async () => {
    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        headers: authHeaders(token),
        body: { filename: 'ảnh bìa.JPG', contentType: 'image/jpeg' },
      }),
      res,
    )

    expect(res.statusCode).toBe(200)
    expect(res.body.token).toBe('signed-token')
    expect(res.body.url).toBe('https://cdn/post-images/x.jpg')

    // Tên tệp lưu trữ là uuid + đuôi lấy từ tên gốc, hạ về chữ thường.
    const signedPath = createSignedUploadUrlMock.mock.calls[0][0] as string
    expect(signedPath).toMatch(/^[0-9a-f-]{36}\.jpg$/)
  })

  it('falls back to the mime type when the name carries no extension', async () => {
    const res = mockRes()
    await handler(
      mockReq({
        method: 'POST',
        headers: authHeaders(token),
        body: { filename: 'clipboard', contentType: 'image/png' },
      }),
      res,
    )
    expect(createSignedUploadUrlMock.mock.calls[0][0]).toMatch(/\.png$/)
  })

  it('500s when the ticket cannot be signed', async () => {
    createSignedUploadUrlMock.mockResolvedValue({ data: null, error: { message: 'bucket gone' } })
    const res = mockRes()
    await handler(
      mockReq({ method: 'POST', headers: authHeaders(token), body: { filename: 'a.jpg' } }),
      res,
    )
    expect(res.statusCode).toBe(500)
    expect(res.body.error).toBe('bucket gone')
  })
})
