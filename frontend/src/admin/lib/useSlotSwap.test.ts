import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSlotSwap } from './useSlotSwap'

const drag = (r: { current: ReturnType<typeof useSlotSwap> }, from: number, to: number) => {
  act(() => r.current.slotProps(from).onDragStart())
  act(() => r.current.slotProps(to).onDragOver({ preventDefault: () => {} }))
  act(() => r.current.slotProps(to).onDrop())
}

describe('kéo ảnh sang khung khác', () => {
  it('hai khung đổi chỗ cho nhau', () => {
    const onSwap = vi.fn()
    const { result } = renderHook(() => useSlotSwap(onSwap))
    drag(result, 0, 2)
    expect(onSwap).toHaveBeenCalledWith(0, 2)
  })

  it('thả lại đúng chỗ cũ thì không đổi gì', () => {
    const onSwap = vi.fn()
    const { result } = renderHook(() => useSlotSwap(onSwap))
    drag(result, 1, 1)
    expect(onSwap).not.toHaveBeenCalled()
  })

  it('đánh dấu khung đang kéo và khung sắp thả, rồi dọn sạch', () => {
    const { result } = renderHook(() => useSlotSwap(vi.fn()))
    act(() => result.current.slotProps(0).onDragStart())
    act(() => result.current.slotProps(1).onDragOver({ preventDefault: () => {} }))
    expect(result.current.from).toBe(0)
    expect(result.current.over).toBe(1)

    act(() => result.current.slotProps(1).onDrop())
    expect(result.current.from).toBeNull()
    expect(result.current.over).toBeNull()
  })

  it('bỏ kéo giữa chừng cũng dọn sạch', () => {
    const { result } = renderHook(() => useSlotSwap(vi.fn()))
    act(() => result.current.slotProps(0).onDragStart())
    act(() => result.current.slotProps(0).onDragEnd())
    expect(result.current.from).toBeNull()
  })
})
