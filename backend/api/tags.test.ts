import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./tags.js').default
let signToken: typeof import('../lib/auth.js').signToken

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./tags.js')).default
  signToken = (await import('../lib/auth.js')).signToken
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

const auth = () => ({ headers: authHeaders(signToken()) })

/*
 * Một bộ từ vựng, hai thứ đeo nó.
 *
 * Bài mang tag ở `posts.kind`; ghi chép rời mang ở `notes.k`. Trước đây là hai
 * danh sách — bốn chữ trong bảng, bốn chữ khác viết cứng ở giao diện — nên
 * thanh lọc trang Ghi chép và ô chọn tag ở "bài mới" nói hai thứ tiếng.
 *
 * Vì vậy đổi tên và xoá phải đi qua **cả hai bảng**: một tag biến mất ở bên này
 * mà còn sống ở bên kia chính là cái chia đôi ấy quay lại.
 */
describe('đổi tên tag', () => {
  it('giữ nguyên id, chỉ đổi tên hiển thị', async () => {
    // `id` là thứ posts.kind và notes.k đang trỏ tới. Đổi nó theo tên mới thì
    // mọi bài đang đeo tag ấy mất chỗ dựa.
    const tags = queryBuilder({ data: { id: 'note', label: 'note' }, error: null })
    fromMock.mockReturnValue(tags)
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', query: { id: 'note' }, body: { label: 'ghi nhanh' }, ...auth() }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ id: 'note', label: 'ghi nhanh' })
    expect(tags.update).toHaveBeenCalledWith({ label: 'ghi nhanh' })
  })

  it('từ chối tên rỗng', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: { id: 'note', label: 'note' }, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', query: { id: 'note' }, body: { label: '   ' }, ...auth() }), res)
    expect(res.statusCode).toBe(400)
  })

  it('404 khi tag không tồn tại', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', query: { id: 'khong-co' }, body: { label: 'x' }, ...auth() }), res)
    expect(res.statusCode).toBe(404)
  })
})

describe('xoá tag', () => {
  /** tags → posts → notes → tags(delete), theo đúng thứ tự handler gọi. */
  const withWearers = (posts: unknown[], notes: unknown[]) => {
    const found = queryBuilder({ data: { id: 'note', label: 'note' }, error: null })
    const del = queryBuilder({ data: null, error: null })
    const calls = [found, queryBuilder({ data: posts, error: null }), queryBuilder({ data: notes, error: null })]
    let i = 0
    fromMock.mockImplementation(() => calls[i++] ?? del)
    return { found, del }
  }

  it('đòi nói trước chỗ về khi còn bài hoặc ghi chép đang đeo', async () => {
    // Xoá mà bỏ mặc là để lại bài trỏ vào một tag không còn tồn tại: nó biến
    // mất khỏi mọi thanh lọc mà vẫn nằm đó.
    withWearers([{ id: 'p1' }], [])
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: { id: 'note' }, body: {}, ...auth() }), res)
    expect(res.statusCode).toBe(400)
    expect((res.body as { wearing: { posts: string[] } }).wearing.posts).toEqual(['p1'])
  })

  it('xoá thẳng khi không còn gì đeo', async () => {
    withWearers([], [])
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: { id: 'note' }, body: {}, ...auth() }), res)
    expect(res.statusCode).toBe(200)
    expect((res.body as { deleted: string }).deleted).toBe('note')
  })

  it('chuyển cả bài lẫn ghi chép sang tag thay thế rồi mới xoá', async () => {
    withWearers([{ id: 'p1' }], [{ id: 'n1' }])
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: { id: 'note' }, body: { to: 'essay' }, ...auth() }), res)
    expect(res.statusCode).toBe(200)
    expect((res.body as { moved: { posts: string[]; notes: string[] } }).moved).toEqual({
      posts: ['p1'],
      notes: ['n1'],
    })
  })
})
