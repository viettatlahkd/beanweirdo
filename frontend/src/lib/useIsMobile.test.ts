import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIsMobile } from './useIsMobile'
import { layout } from '../design/tokens'

/*
 * jsdom không có `window.matchMedia`.
 *
 * Nếu hook đổ vỡ hoặc trả `true` khi thiếu nó, mọi test cũ của trang phải sửa —
 * chúng viết cho nhánh desktop. Trả `false` là cách giữ nguyên toàn bộ chúng, và
 * `lib/Rise.tsx` đã thủ đúng kiểu ấy với `prefers-reduced-motion` từ trước.
 */
const original = Object.getOwnPropertyDescriptor(window, 'matchMedia')
afterEach(() => {
  if (original) Object.defineProperty(window, 'matchMedia', original)
  else delete (window as { matchMedia?: unknown }).matchMedia
})

const fakeMedia = (matches: boolean) => {
  const mq = { matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: () => mq })
  return mq
}

describe('useIsMobile', () => {
  it('không có matchMedia thì là desktop', () => {
    delete (window as { matchMedia?: unknown }).matchMedia
    expect(renderHook(() => useIsMobile()).result.current).toBe(false)
  })

  it('khớp truy vấn thì là mobile', () => {
    fakeMedia(true)
    expect(renderHook(() => useIsMobile()).result.current).toBe(true)
  })

  it('không khớp thì là desktop', () => {
    fakeMedia(false)
    expect(renderHook(() => useIsMobile()).result.current).toBe(false)
  })

  it('nghe đổi bề ngang, và gỡ tai nghe khi thôi', () => {
    const mq = fakeMedia(false)
    const { unmount } = renderHook(() => useIsMobile())
    expect(mq.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    unmount()
    expect(mq.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('một ngưỡng duy nhất, lấy từ token', () => {
    expect(layout.mobileMax).toBe(899)
  })
})
