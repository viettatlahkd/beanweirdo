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

  it('xếp theo ba tầng: ghim trước, vị trí tự chọn, rồi ngày đăng', async () => {
    const rows = [{ id: 'p1', module_id: 'biochem', n: '01' }]
    const builder = makeQueryBuilder({ data: rows, error: null })
    from.mockReturnValue(builder)

    const { result } = renderHook(() => usePublishedPosts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(from).toHaveBeenCalledWith('posts')
    expect(builder.eq).toHaveBeenCalledWith('status', 'published')
    // Ba tầng, đúng thứ tự này. `sort_order` rỗng xuống dưới, vì rỗng nghĩa là
    // chưa ai chọn vị trí cho bài đó.
    expect(builder.order.mock.calls).toEqual([
      ['pinned', { ascending: false }],
      ['sort_order', { ascending: true, nullsFirst: false }],
      ['published_at', { ascending: false }],
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
