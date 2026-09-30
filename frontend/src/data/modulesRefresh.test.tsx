import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/*
 * Kéo đổi thứ tự module trong CMS xong, thanh bên ngay cạnh vẫn vẽ thứ tự cũ.
 *
 * Lý do: khu quản trị ghi qua API quản trị, còn thanh bên và Trang chủ đọc
 * thẳng từ Supabase qua `useModules`, và `useModules` chỉ hỏi đúng một lần lúc
 * ứng dụng dựng. Không có gì nối hai đường, nên thứ tự mới chỉ hiện ra sau khi
 * tải lại cả trang.
 *
 * `modulesChanged()` là sợi nối ấy. Test này dựng hook thật rồi đếm số lượt
 * hỏi Supabase, chứ không đọc mã.
 */

function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.then = (resolve: (v: typeof result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder
}

const from = vi.fn()
vi.mock('../lib/supabaseClient', () => ({
  supabase: { from: (...args: unknown[]) => from(...args) },
}))

const { useModules } = await import('./useModules')
const { modulesChanged } = await import('./modulesChanged')

const rows = (order: string[]) => order.map((id, i) => ({ id, title: id, sort_order: i + 1 }))

describe('danh sách module tự hỏi lại khi khu quản trị vừa ghi', () => {
  it('hỏi lại và trả về thứ tự mới', async () => {
    from.mockReturnValue(makeQueryBuilder({ data: rows(['sensory', 'roasting']), error: null }))

    const { result } = renderHook(() => useModules())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data.map((m) => m.id)).toEqual(['sensory', 'roasting'])

    // Chủ site kéo roasting lên trên; máy chủ nay trả về thứ tự đã đổi.
    from.mockReturnValue(makeQueryBuilder({ data: rows(['roasting', 'sensory']), error: null }))
    act(() => modulesChanged())

    await waitFor(() => expect(result.current.data.map((m) => m.id)).toEqual(['roasting', 'sensory']))
  })

  it('không xoá trắng danh sách trong lúc hỏi lại', async () => {
    from.mockReturnValue(makeQueryBuilder({ data: rows(['sensory']), error: null }))

    const { result } = renderHook(() => useModules())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => modulesChanged())
    // `loading` bật lại là thanh bên nháy thành khung rỗng một nhịp — trông như
    // hỏng chứ không như vừa cập nhật.
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toHaveLength(1)
  })

  it('hook đã gỡ thì không còn hỏi nữa', async () => {
    from.mockReturnValue(makeQueryBuilder({ data: rows(['sensory']), error: null }))

    const { unmount, result } = renderHook(() => useModules())
    await waitFor(() => expect(result.current.loading).toBe(false))
    unmount()

    const before = from.mock.calls.length
    act(() => modulesChanged())
    expect(from.mock.calls.length).toBe(before)
  })
})
