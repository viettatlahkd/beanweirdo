import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listHours = vi.fn()
const renameKind = vi.fn()
const deleteKind = vi.fn()
const addKind = vi.fn()
const assignTags = vi.fn()

vi.mock('../admin/lib/apiClient', () => ({
  listHours: (...a: unknown[]) => listHours(...a),
  renameKind: (...a: unknown[]) => renameKind(...a),
  deleteKind: (...a: unknown[]) => deleteKind(...a),
  addKind: (...a: unknown[]) => addKind(...a),
  assignTags: (...a: unknown[]) => assignTags(...a),
  createLog: vi.fn(),
  patchLog: vi.fn(),
  deleteLog: vi.fn(),
}))

const { useHours } = await import('./useHours')

const log = {
  id: 'log-1',
  date: '2026-08-20',
  name: 'onboarding',
  kind: 'work',
  project: 'Sao đâu',
  mins: 13,
  at: '15:51',
  done: true,
}

/** Ctrl+Z, as the screen would send it. */
const undoKey = () =>
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))

async function mounted() {
  const hook = renderHook(() => useHours())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useHours — renaming and deleting tags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listHours.mockResolvedValue({ logs: [log], kinds: ['đọc', 'work'], projects: ['Sao đâu'] })
    renameKind.mockResolvedValue({ kinds: ['đọc', 'công việc'], projects: ['Sao đâu'] })
    deleteKind.mockResolvedValue({ kinds: ['đọc'], projects: ['Sao đâu'], affected: ['log-1', 'log-old'] })
    addKind.mockResolvedValue({ kinds: ['đọc', 'work'], projects: ['Sao đâu'] })
    assignTags.mockResolvedValue({ moved: 2 })
  })

  it('renames the tag and the activities filed under it', async () => {
    const { result } = await mounted()

    await act(async () => {
      await result.current.renameTag('work', 'công việc', 'task')
    })

    expect(renameKind).toHaveBeenCalledWith('work', 'công việc', 'task')
    expect(result.current.kinds).toEqual(['đọc', 'công việc'])
  })

  it('ignores a rename to the same name, or to nothing', async () => {
    const { result } = await mounted()

    await act(async () => {
      await result.current.renameTag('work', '   ', 'task')
      await result.current.renameTag('work', 'work', 'task')
    })

    expect(renameKind).not.toHaveBeenCalled()
  })

  it('puts the old name back on Ctrl+Z', async () => {
    const { result } = await mounted()

    await act(async () => {
      await result.current.renameTag('work', 'công việc', 'task')
    })
    await act(async () => {
      undoKey()
    })

    expect(renameKind).toHaveBeenLastCalledWith('công việc', 'work', 'task')
  })

  it('passes the reassignment plan through to the delete', async () => {
    const { result } = await mounted()
    const plan = { moves: [{ to: 'đọc', ids: ['log-1'] }] }
    // The refetch that follows the delete sees the reassigned rows.
    listHours.mockResolvedValue({
      logs: [{ ...log, kind: 'đọc' }],
      kinds: ['đọc'],
      projects: ['Sao đâu'],
    })

    await act(async () => {
      await result.current.removeTag('work', 'task', plan)
    })

    expect(deleteKind).toHaveBeenCalledWith('work', 'task', plan)
    expect(result.current.kinds).toEqual(['đọc'])
    expect(result.current.logs[0].kind).toBe('đọc')
  })

  it('restores the tag and every activity that wore it on Ctrl+Z', async () => {
    const { result } = await mounted()

    await act(async () => {
      await result.current.removeTag('work', 'task')
    })
    await act(async () => {
      undoKey()
    })

    await waitFor(() => expect(addKind).toHaveBeenCalledWith('work', 'task'))
    // `log-old` is older than the span on screen; undo still reaches it.
    expect(assignTags).toHaveBeenCalledWith('task', [{ to: 'work', ids: ['log-1', 'log-old'] }])
  })

  it('does not call the bulk endpoint when the tag was on nothing', async () => {
    deleteKind.mockResolvedValue({ kinds: ['đọc'], projects: ['Sao đâu'], affected: [] })
    const { result } = await mounted()

    await act(async () => {
      await result.current.removeTag('work', 'task')
    })
    await act(async () => {
      undoKey()
    })

    await waitFor(() => expect(addKind).toHaveBeenCalled())
    expect(assignTags).not.toHaveBeenCalled()
  })

  it('surfaces a failed delete and refetches rather than showing a tag that is still there', async () => {
    deleteKind.mockRejectedValue(new Error('mất mạng'))
    const { result } = await mounted()

    await act(async () => {
      await result.current.removeTag('work', 'task')
    })

    expect(result.current.error).toBe('mất mạng')
    await waitFor(() => expect(listHours).toHaveBeenCalledTimes(2))
  })
})
