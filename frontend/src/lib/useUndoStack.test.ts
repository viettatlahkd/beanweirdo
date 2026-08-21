import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UNDO_DEPTH, UNDO_TTL_MS, useUndoStack } from './useUndoStack'

function press(key: string, opts: { shift?: boolean } = {}) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey: opts.shift ?? false, bubbles: true }),
  )
}

describe('useUndoStack', () => {
  it('undoes the most recent action, and redoes it with shift', async () => {
    const undo = vi.fn()
    const redo = vi.fn()
    const { result } = renderHook(() => useUndoStack())

    act(() => result.current.record({ label: 'sửa', undo, redo }))

    await act(async () => press('z'))
    expect(undo).toHaveBeenCalledTimes(1)

    await act(async () => press('z', { shift: true }))
    expect(redo).toHaveBeenCalledTimes(1)
  })

  it('keeps only the last five — the sixth pushes the oldest out', async () => {
    const calls: number[] = []
    const { result } = renderHook(() => useUndoStack())

    act(() => {
      for (let i = 1; i <= UNDO_DEPTH + 1; i++) {
        result.current.record({ label: `#${i}`, undo: () => calls.push(i), redo: () => {} })
      }
    })

    // Six undos, but only five actions survive — the first is gone.
    for (let i = 0; i < UNDO_DEPTH + 1; i++) await act(async () => press('z'))
    expect(calls).toEqual([6, 5, 4, 3, 2])
  })

  it('leaves typing alone — inside a field the browser owns Ctrl+Z', async () => {
    const undo = vi.fn()
    const { result } = renderHook(() => useUndoStack())
    act(() => result.current.record({ label: 'sửa', undo, redo: vi.fn() }))

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    await act(async () => press('z'))
    expect(undo).not.toHaveBeenCalled()

    input.remove()
  })

  it('drops the redo branch once a new action is recorded', async () => {
    const redoA = vi.fn()
    const undoB = vi.fn()
    const { result } = renderHook(() => useUndoStack())

    act(() => result.current.record({ label: 'A', undo: vi.fn(), redo: redoA }))
    await act(async () => press('z'))

    act(() => result.current.record({ label: 'B', undo: undoB, redo: vi.fn() }))
    await act(async () => press('z', { shift: true }))

    // Redo now belongs to B's branch; A's is unreachable.
    expect(redoA).not.toHaveBeenCalled()
  })
})

describe('useUndoStack — the ten-minute buffer', () => {
  it('forgets an action once its ten minutes are up', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T09:00:00'))
    const undo = vi.fn()
    const { result } = renderHook(() => useUndoStack())

    act(() => result.current.record({ label: 'xoá tag', undo, redo: vi.fn() }))

    vi.setSystemTime(Date.now() + UNDO_TTL_MS + 1000)
    await act(async () => press('z'))

    expect(undo).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('still holds an action inside the window', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T09:00:00'))
    const undo = vi.fn()
    const { result } = renderHook(() => useUndoStack())

    act(() => result.current.record({ label: 'xoá tag', undo, redo: vi.fn() }))

    vi.setSystemTime(Date.now() + UNDO_TTL_MS - 1000)
    await act(async () => press('z'))

    expect(undo).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('expires the stale ones without taking the fresh ones with them', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T09:00:00'))
    const old = vi.fn()
    const recent = vi.fn()
    const { result } = renderHook(() => useUndoStack())

    act(() => result.current.record({ label: 'cũ', undo: old, redo: vi.fn() }))
    vi.setSystemTime(Date.now() + UNDO_TTL_MS - 1000)
    act(() => result.current.record({ label: 'mới', undo: recent, redo: vi.fn() }))

    // Two minutes on: the first entry is past its ten, the second is not.
    vi.setSystemTime(Date.now() + 2 * 60_000)
    await act(async () => press('z'))
    await act(async () => press('z'))

    expect(recent).toHaveBeenCalledTimes(1)
    expect(old).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('gives an undone action a fresh ten minutes to be redone in', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T09:00:00'))
    const redo = vi.fn()
    const { result } = renderHook(() => useUndoStack())

    act(() => result.current.record({ label: 'xoá tag', undo: vi.fn(), redo }))
    vi.setSystemTime(Date.now() + UNDO_TTL_MS - 5000)
    await act(async () => press('z'))

    // Taking it back was just now, even though the action itself was a while ago.
    vi.setSystemTime(Date.now() + 60_000)
    await act(async () => press('z', { shift: true }))

    expect(redo).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
