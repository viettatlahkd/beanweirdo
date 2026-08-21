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

const { useModules, landingModules, indexModules, sidebarModules } = await import('./useModules')

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

describe('module surfaces', () => {
  const mod = (
    id: string,
    kind: 'normal' | 'special',
    visibility: 'public' | 'private',
    sort_order: number,
  ) => ({ id, kind, visibility, sort_order }) as never

  // Ghi 02 sorts before Ghi 01 here, and biochem is renumbered above sensory,
  // so a wrong sort shows up rather than passing by luck.
  const all = [
    mod('biochem', 'normal', 'public', 9),
    mod('ghi02', 'special', 'private', 101),
    mod('sensory', 'normal', 'public', 20),
    mod('ghi01', 'special', 'public', 102),
  ]

  it('trang chủ lists reading modules only — the journals are not a gallery', () => {
    expect(landingModules(all).map((m) => m.id)).toEqual(['biochem', 'sensory'])
  })

  it('mục lục lists the public journals too — special is not the same as hidden', () => {
    expect(indexModules(all).map((m) => m.id)).toEqual(['biochem', 'sensory', 'ghi01'])
  })

  it('never lists a private module anywhere', () => {
    for (const surface of [landingModules, indexModules, sidebarModules]) {
      expect(surface(all).map((m) => m.id)).not.toContain('ghi02')
    }
  })

  it('puts every reading module above every journal, whatever the CMS numbering', () => {
    // sensory is numbered 20, well past Ghi 01's band, yet still sorts above it.
    const ids = sidebarModules(all).map((m) => m.id)
    expect(ids.indexOf('sensory')).toBeLessThan(ids.indexOf('ghi01'))
  })

  it('keeps a module whose kind or visibility has not been set', () => {
    expect(landingModules([mod('sensory', undefined as never, undefined as never, 1)])).toHaveLength(1)
  })
})
