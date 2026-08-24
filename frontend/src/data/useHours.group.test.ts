import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listHours = vi.fn()
const createLog = vi.fn()
const deleteLog = vi.fn()

vi.mock('../admin/lib/apiClient', () => ({
  listHours: (...a: unknown[]) => listHours(...a),
  createLog: (...a: unknown[]) => createLog(...a),
  deleteLog: (...a: unknown[]) => deleteLog(...a),
  patchLog: vi.fn(),
  renameKind: vi.fn(),
  deleteKind: vi.fn(),
  addKind: vi.fn(),
  assignTags: vi.fn(),
}))

const { useHours } = await import('./useHours')

const parent = {
  id: 'p',
  date: '2026-08-23',
  name: 'beanweirdo: web code',
  kind: 'thực hành',
  project: 'Work',
  mins: 30,
  at: '13:42',
  done: true,
}
const sitting = (id: string, at: string, mins: number) => ({
  ...parent,
  id,
  name: '',
  at,
  mins,
  parentId: 'p',
})

/** Ctrl+Z, as the screen would send it. */
const undoKey = () =>
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))

async function mounted() {
  const hook = renderHook(() => useHours())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useHours — xoá cả cụm là một bước hoàn tác', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listHours.mockResolvedValue({
      logs: [parent, sitting('s1', '13:42', 180), sitting('s2', '23:10', 80)],
      kinds: ['thực hành'],
      projects: ['Work'],
    })
    deleteLog.mockResolvedValue(undefined)
  })

  it('deletes the sittings before the heading', async () => {
    const { result } = await mounted()

    await act(async () => {
      await result.current.removeGroup('p')
    })

    // A heading with live sittings under it is a state nothing should ever
    // render, so the children go first.
    expect(deleteLog.mock.calls.map((c) => c[0])).toEqual(['s1', 's2', 'p'])
    expect(result.current.logs).toHaveLength(0)
  })

  it('brings the whole group back on one Ctrl+Z', async () => {
    let n = 0
    createLog.mockImplementation(async (fields: Record<string, unknown>) => ({
      ...fields,
      id: 'new-' + ++n,
    }))
    const { result } = await mounted()

    await act(async () => {
      await result.current.removeGroup('p')
    })
    await act(async () => {
      undoKey()
    })
    await waitFor(() => expect(result.current.logs).toHaveLength(3))

    // Four rows went; one press brought all four back — not the first of four
    // presses through three states that never existed.
    const back = result.current.logs
    const head = back.find((l) => !l.parentId)!
    expect(head.name).toBe('beanweirdo: web code')
    // The heading comes back with a new id, so each sitting is re-parented
    // onto whatever that turned out to be.
    expect(back.filter((l) => l.parentId === head.id)).toHaveLength(2)
    expect(back.filter((l) => l.parentId === 'p')).toHaveLength(0)
  })

  it('restores the sittings with their own times and lengths', async () => {
    let n = 0
    createLog.mockImplementation(async (fields: Record<string, unknown>) => ({
      ...fields,
      id: 'new-' + ++n,
    }))
    const { result } = await mounted()

    await act(async () => {
      await result.current.removeGroup('p')
    })
    await act(async () => {
      undoKey()
    })
    await waitFor(() => expect(result.current.logs).toHaveLength(3))

    const kids = result.current.logs.filter((l) => l.parentId)
    expect(kids.map((k) => [k.at, k.mins])).toEqual([
      ['13:42', 180],
      ['23:10', 80],
    ])
  })

  it('does nothing when the id is not on file', async () => {
    const { result } = await mounted()

    await act(async () => {
      await result.current.removeGroup('gone')
    })

    expect(deleteLog).not.toHaveBeenCalled()
    expect(result.current.logs).toHaveLength(3)
  })
})
