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

const { usePost } = await import('./usePost')

describe('usePost', () => {
  beforeEach(() => {
    from.mockClear()
  })

  it('fetches a single post by id via maybeSingle', async () => {
    const row = { id: 'p1', en: 'Chlorogenic Acids (CGA)', module_id: 'biochem' }
    const builder = makeQueryBuilder({ data: row, error: null })
    from.mockReturnValue(builder)

    const { result } = renderHook(() => usePost('p1'))
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(from).toHaveBeenCalledWith('posts')
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1')
    expect(builder.maybeSingle).toHaveBeenCalled()
    expect(result.current.data).toEqual(row)
  })

  it('does not fetch and returns null data when id is null', () => {
    const { result } = renderHook(() => usePost(null))

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it('resolves data to null when no row matches (post not found / not public)', async () => {
    const builder = makeQueryBuilder({ data: null, error: null })
    from.mockReturnValue(builder)

    const { result } = renderHook(() => usePost('missing'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('surfaces a query error', async () => {
    const builder = makeQueryBuilder({ data: null, error: { message: 'denied' } })
    from.mockReturnValue(builder)

    const { result } = renderHook(() => usePost('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('denied')
  })
})
