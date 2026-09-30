import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryBuilder, mockReq, mockRes, authHeaders } from '../../../lib/test-helpers.js'

const fromMock = vi.fn()
vi.mock('../../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: fromMock }),
}))

let handler: typeof import('./index.js').default
let signToken: typeof import('../../../lib/auth.js').signToken

beforeEach(async () => {
  process.env.ADMIN_SESSION_SECRET = 'test-secret'
  process.env.ADMIN_ALLOWED_ORIGIN = 'https://admin.example.com'
  fromMock.mockReset()
  handler = (await import('./index.js')).default
  signToken = (await import('../../../lib/auth.js')).signToken
})

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_ALLOWED_ORIGIN
  vi.resetModules()
})

const row = {
  id: 'sensory',
  title: 'sensory',
  accent: '#F2A0A5',
  on_color: '#3B2A2B',
  tint: '#FBE7E5',
  tint2: '#F6D2D4',
  layout: 'band',
  concept: 'flavor',
  blurb: 'b',
  long_desc: 'ld',
  treatment: 't',
  layout_note: 'ln',
  shot1: 's1',
  shot2: 's2',
  shot3: 's3',
  img1: null,
  img2: null,
  img3: null,
  sort_order: 1,
}

const q = (id = 'sensory') => ({ id })

describe('PATCH /api/modules/:id', () => {
  it('requires auth', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'PATCH', query: q(), body: { title: 'x' } }), res)
    expect(res.statusCode).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('maps camelCase keys onto their columns', async () => {
    const builder = queryBuilder({ data: { ...row, long_desc: 'new' }, error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: q(), body: { long_desc: 'new' }, headers: authHeaders(signToken()) }),
      res,
    )

    expect(builder.update).toHaveBeenCalledWith({ long_desc: 'new' })
    expect(res.statusCode).toBe(200)
    expect(res.body.module.long_desc).toBe('new')
  })

  it('ignores unknown keys and 400s when nothing editable is left', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: q(), body: { sort_order: 4 }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('rejects an unknown layout', async () => {
    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: q(), body: { layout: 'mosaic' }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('404s when the module does not exist', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: q('nope'), body: { title: 'x' }, headers: authHeaders(signToken()) }),
      res,
    )
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/modules/:id', () => {
  it('returns 204 once the row is gone', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: { id: 'sensory' }, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: q(), headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(204)
    expect(res.ended).toBe(true)
  })

  it('404s when the module does not exist', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: null, error: null }))
    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: q('nope'), headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(404)
  })
})

describe('/api/modules/:id — other methods', () => {
  it('rejects GET with 405', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'GET', query: q(), headers: authHeaders(signToken()) }), res)
    expect(res.statusCode).toBe(405)
  })
})

/*
 * Số lượt đi tới database cho một lần bấm nút. Ba bài dưới đây khoá lại thiết
 * kế chứ không chỉ khoá kết quả — nếu ai đó thêm một lượt đọc "cho chắc" vào
 * đường thường, chúng đỏ.
 */
describe('/api/modules/:id — số câu lệnh', () => {
  it('xoá một module không có con là MỘT câu', async () => {
    const builder = queryBuilder({ data: { id: 'sensory' }, error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: q(), headers: authHeaders(signToken()) }), res)

    expect(res.statusCode).toBe(204)
    // Phép chặn "còn module con" là của khoá ngoại, không phải của route —
    // nên đường thường không trả tiền cho nó.
    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(builder.delete).toHaveBeenCalled()
  })

  it('khoá ngoại chặn thì mới đọc, và nói rõ còn mấy cái', async () => {
    fromMock
      // 23503 = còn hàng khác trỏ vào. Với `modules` thì chỉ có thể là module con.
      .mockReturnValueOnce(queryBuilder({ data: null, error: { code: '23503', message: 'fk' } }))
      .mockReturnValueOnce(queryBuilder({ data: [{ id: 'con-1' }, { id: 'con-2' }], error: null }))

    const res = mockRes()
    await handler(mockReq({ method: 'DELETE', query: q(), headers: authHeaders(signToken()) }), res)

    expect(res.statusCode).toBe(409)
    expect(res.body.error).toMatch(/2 module/)
    expect(fromMock).toHaveBeenCalledTimes(2)
  })

  it('sửa module thôi trả về cả bản ghi', async () => {
    const builder = queryBuilder({ data: { id: 'sensory', title: 'tên mới' }, error: null })
    fromMock.mockReturnValue(builder)

    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: q(), body: { title: 'tên mới' }, headers: authHeaders(signToken()) }),
      res,
    )

    expect(res.statusCode).toBe(200)
    const columns = builder.select.mock.calls[0][0] as string
    expect(columns).toBe('id, title')
    // Mấy cột nặng nhất của một module, không cột nào được đi theo.
    expect(columns).not.toContain('long_desc')
    expect(columns).not.toContain('feature_cells')
    expect(columns).not.toContain('page_img')
  })
})

/*
 * Và cái KHÔNG gộp được, cố ý: hỏi "đưa module này vào trong module kia có tạo
 * vòng không" thì phải nhìn cả cây, không nhét vào `WHERE` của câu ghi được.
 * Bài kiểm này giữ cho lượt đọc ấy khỏi bị ai đó dọn nhầm.
 */
describe('/api/modules/:id — phép chặn vòng cha-con vẫn đọc cả cây', () => {
  it('đọc cây trước khi ghi, khi và chỉ khi patch có parent_id', async () => {
    fromMock
      .mockReturnValueOnce(queryBuilder({ data: [{ id: 'sensory', parent_id: null }], error: null }))
      .mockReturnValueOnce(queryBuilder({ data: { id: 'sensory', parent_id: null }, error: null }))

    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: q(), body: { parent_id: null }, headers: authHeaders(signToken()) }),
      res,
    )

    expect(res.statusCode).toBe(200)
    expect(fromMock).toHaveBeenCalledTimes(2)
  })

  it('không đọc cây cho một lần sửa không đụng parent_id', async () => {
    fromMock.mockReturnValue(queryBuilder({ data: { id: 'sensory', title: 'x' }, error: null }))

    const res = mockRes()
    await handler(
      mockReq({ method: 'PATCH', query: q(), body: { title: 'x' }, headers: authHeaders(signToken()) }),
      res,
    )

    expect(fromMock).toHaveBeenCalledTimes(1)
  })
})
