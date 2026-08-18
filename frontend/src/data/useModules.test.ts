import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

const { useModules, readingModules } = await import('./useModules')

describe('useModules', () => {
  it('fetches every module ordered by sort_order, ascending', async () => {
    const rows = [
      { id: 'sensory', title: 'sensory', sort_order: 1 },
      { id: 'biochem', title: 'biochemistry 101', sort_order: 2 },
    ]
    const builder = makeQueryBuilder({ data: rows, error: null })
    from.mockReturnValue(builder)

    const { result } = renderHook(() => useModules())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(from).toHaveBeenCalledWith('modules')
    expect(builder.select).toHaveBeenCalledWith('*')
    expect(builder.order).toHaveBeenCalledWith('sort_order', { ascending: true })
    expect(result.current.data).toEqual(rows)
    expect(result.current.error).toBeNull()
  })

  it('surfaces a query error and clears data', async () => {
    const builder = makeQueryBuilder({ data: null, error: { message: 'boom' } })
    from.mockReturnValue(builder)

    const { result } = renderHook(() => useModules())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('boom')
    expect(result.current.data).toEqual([])
  })
})

describe('readingModules', () => {
  const mod = (id: string, kind: 'normal' | 'special') => ({ id, kind }) as never

  it('leaves the journals out — they have pages of their own', () => {
    // Listing Ghi 01 beside sensory would introduce it a second time under a
    // different name (migration 0012).
    const all = [mod('sensory', 'normal'), mod('ghi01', 'special'), mod('biochem', 'normal')]
    expect(readingModules(all).map((m) => m.id)).toEqual(['sensory', 'biochem'])
  })

  it('keeps a module whose kind has not been set', () => {
    expect(readingModules([mod('sensory', undefined as never)])).toHaveLength(1)
  })
})
