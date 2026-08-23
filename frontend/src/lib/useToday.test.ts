import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToday } from './useToday'

function setVisibility(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

describe('useToday — a tab left open overnight', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-22T23:58:00'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rolls over to the new day while nobody touches the tab', () => {
    const { result } = renderHook(() => useToday())
    expect(result.current).toBe('2026-08-22')

    act(() => {
      vi.setSystemTime(new Date('2026-08-23T00:01:00'))
      vi.advanceTimersByTime(60_000)
    })

    expect(result.current).toBe('2026-08-23')
  })

  it('catches up the moment the tab is looked at again', () => {
    const { result } = renderHook(() => useToday())

    // Buried for hours — the common case, and the one the timer alone would be
    // slow to catch on a throttled background tab.
    vi.setSystemTime(new Date('2026-08-24T09:30:00'))
    setVisibility('visible')

    expect(result.current).toBe('2026-08-24')
  })

  it('stays put on a day that does not change', () => {
    const { result } = renderHook(() => useToday())
    const first = result.current

    act(() => {
      // Advancing the fake timers advances `Date` too, so the jump is set well
      // clear of midnight — this is a tick inside one day, not across two.
      vi.advanceTimersByTime(60_000)
    })

    // Same string, and the same reference: an unchanged day must not churn
    // every consumer of it once a minute.
    expect(result.current).toBe(first)
  })
})
