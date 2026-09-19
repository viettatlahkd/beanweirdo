import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.in = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.single = vi.fn(() => Promise.resolve(result))
  builder.maybeSingle = vi.fn(() => Promise.resolve(result))
  builder.then = (resolve: (v: typeof result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder
}

const from = vi.fn()
vi.mock('../lib/supabaseClient', () => ({
  supabase: { from: (...args: unknown[]) => from(...args) },
}))

const { usePublishedPosts } = await import('./usePublishedPosts')

describe('usePublishedPosts', () => {
  beforeEach(() => {
    from.mockClear()
  })

  it('xếp theo bốn tầng: ghim, vị trí tự chọn, ngày đăng, rồi ngày trên mặt bài', async () => {
    const rows = [{ id: 'p1', module_id: 'biochem', n: '01' }]
    const builder = makeQueryBuilder({ data: rows, error: null })
    from.mockReturnValue(builder)

    const { result } = renderHook(() => usePublishedPosts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(from).toHaveBeenCalledWith('posts')
    expect(builder.eq).toHaveBeenCalledWith('status', 'published')
    // Đúng thứ tự này. `sort_order` rỗng xuống dưới, vì rỗng nghĩa là chưa ai
    // chọn vị trí cho bài đó. Tầng cuối gỡ hoà khi một loạt bài được đăng cùng
    // một lượt và chung dấu thời gian — phải khớp với `lib/postOrder.ts`.
    expect(builder.order.mock.calls).toEqual([
      ['pinned', { ascending: false }],
      ['sort_order', { ascending: true, nullsFirst: false }],
      ['published_at', { ascending: false }],
      ['date_label', { ascending: false }],
    ])
    expect(result.current.data).toEqual(rows)
  })

  it('adds a module_id filter when moduleId is given', async () => {
    const builder = makeQueryBuilder({ data: [], error: null })
    from.mockReturnValue(builder)

    renderHook(() => usePublishedPosts({ moduleId: 'roasting' }))
    await waitFor(() => expect(builder.eq).toHaveBeenCalledWith('module_id', 'roasting'))
  })

  it('honors a custom orderBy/ascending, e.g. Archive sorting newest first by date_label', async () => {
    const builder = makeQueryBuilder({ data: [], error: null })
    from.mockReturnValue(builder)

    renderHook(() => usePublishedPosts({ orderBy: 'date_label', ascending: false }))
    await waitFor(() => expect(builder.order).toHaveBeenCalledWith('date_label', { ascending: false }))
  })

  it('skips the fetch entirely when enabled is false', async () => {
    const { result } = renderHook(() => usePublishedPosts({ enabled: false }))

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual([])
    expect(from).not.toHaveBeenCalled()
  })

  it('surfaces a query error and clears data', async () => {
    const builder = makeQueryBuilder({ data: null, error: { message: 'nope' } })
    from.mockReturnValue(builder)

    const { result } = renderHook(() => usePublishedPosts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('nope')
    expect(result.current.data).toEqual([])
  })
})

/*
 * Cái đắt nhất của trang công khai không phải số lượt gọi, mà là cỡ gói dữ
 * liệu: `select('*')` kéo `body` — toàn bộ nội dung — của **mọi** bài đã đăng,
 * trên mỗi lần vẽ. Thanh bên gọi hook này không kèm `moduleId`, nên nó kéo cả
 * site về. Ba bài dưới đây khoá lại chuyện đó.
 */
describe('usePublishedPosts — không kéo thân bài về', () => {
  beforeEach(() => {
    from.mockClear()
  })

  it('mặc định không hỏi `body`, và có hỏi `thumbnail_url`', async () => {
    const builder = makeQueryBuilder({ data: [], error: null })
    from.mockReturnValue(builder)

    const { result } = renderHook(() => usePublishedPosts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const columns = (builder.select as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(columns).not.toBe('*')
    expect(columns.split(', ')).not.toContain('body')
    expect(columns).toContain('thumbnail_url')
  })

  it('kể cả khi lấy cả bài lưu trữ — đường đó cũng từng là `*`', async () => {
    const builder = makeQueryBuilder({ data: [], error: null })
    from.mockReturnValue(builder)

    const { result } = renderHook(() => usePublishedPosts({ includeArchived: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const columns = (builder.select as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(columns.split(', ')).not.toContain('body')
    expect(builder.in).toHaveBeenCalledWith('status', ['published', 'archived'])
  })

  it('withBody mới lấy cả hàng — đúng một màn cần, là trang Ghi', async () => {
    const builder = makeQueryBuilder({ data: [], error: null })
    from.mockReturnValue(builder)

    const { result } = renderHook(() => usePublishedPosts({ moduleId: 'ghi01', withBody: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect((builder.select as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('*')
  })
})
