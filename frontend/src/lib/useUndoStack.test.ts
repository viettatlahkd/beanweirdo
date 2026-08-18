import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UNDO_DEPTH, useUndoStack } from './useUndoStack'

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
