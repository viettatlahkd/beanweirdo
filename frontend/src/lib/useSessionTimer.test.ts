import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_SESSION_HOURS, TIMER_KEY, useSessionTimer } from './useSessionTimer'

const START = new Date('2026-08-21T09:00:00').getTime()

/**
 * Move the wall clock forward by `ms`, letting the repaint interval fire once —
 * roughly what a throttled background tab gets over any span at all. Advancing
 * the fake timers also advances `Date`, so the jump is set one tick short.
 */
function skip(ms: number) {
  act(() => {
    vi.setSystemTime(Date.now() + ms - 1000)
    vi.advanceTimersByTime(1000)
  })
}

function setVisibility(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

describe('useSessionTimer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(START)
    setVisibility('visible')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('measures time rather than counting ticks, so a throttled tab still adds up', () => {
    const { result } = renderHook(() => useSessionTimer())
    act(() => result.current.start())

    // Four hours pass with the tab in the background: the interval fired once.
    skip(4 * 3600_000)

    expect(result.current.sec).toBe(4 * 3600)
    expect(result.current.usedSec).toBe(4 * 3600)
  })

  it('banks the elapsed time on pause and carries on from there', () => {
    const { result } = renderHook(() => useSessionTimer())
    act(() => result.current.start())
    skip(600_000)
    act(() => result.current.pause())

    expect(result.current.running).toBe(false)
    expect(result.current.sec).toBe(600)

    // Paused means paused — an hour on the clock adds nothing.
    skip(3600_000)
    expect(result.current.sec).toBe(600)

    act(() => result.current.start())
    skip(60_000)
    expect(result.current.sec).toBe(660)
  })

  it('survives a reload with the clock still running', () => {
    const first = renderHook(() => useSessionTimer())
    act(() => first.result.current.start())
    skip(300_000)
    first.unmount()

    // Page reloads three hours later; the session was never stopped.
    skip(3 * 3600_000)
    const { result } = renderHook(() => useSessionTimer())

    expect(result.current.running).toBe(true)
    expect(result.current.sec).toBe(300 + 3 * 3600)
  })

  it('refuses to restore a session left running past the cap', () => {
    localStorage.setItem(
      TIMER_KEY,
      JSON.stringify({
        mode: 'up',
        target: 1500,
        base: 0,
        since: START - (MAX_SESSION_HOURS + 6) * 3600_000,
        suspended: false,
        onScreenOnly: false,
      }),
    )

    const { result } = renderHook(() => useSessionTimer())

    expect(result.current.running).toBe(false)
    expect(result.current.sec).toBe(MAX_SESSION_HOURS * 3600)
  })

  it('keeps counting through a hidden tab by default', () => {
    const { result } = renderHook(() => useSessionTimer())
    act(() => result.current.start())

    setVisibility('hidden')
    skip(1800_000)
    setVisibility('visible')

    expect(result.current.running).toBe(true)
    expect(result.current.sec).toBe(1800)
  })

  it('parks the clock while hidden once on-screen-only is asked for', () => {
    const { result } = renderHook(() => useSessionTimer())
    act(() => result.current.setOnScreenOnly(true))
    act(() => result.current.start())
    skip(60_000)

    setVisibility('hidden')
    skip(1800_000)
    expect(result.current.suspended).toBe(true)

    setVisibility('visible')
    skip(60_000)

    // The half hour away is not practice; the two minutes at the screen are.
    expect(result.current.sec).toBe(120)
    expect(result.current.running).toBe(true)
  })

  it('hands the clock back when the rule is switched off mid-park', () => {
    const { result } = renderHook(() => useSessionTimer())
    act(() => result.current.setOnScreenOnly(true))
    act(() => result.current.start())
    skip(60_000)
    setVisibility('hidden')
    skip(600_000)

    act(() => result.current.setOnScreenOnly(false))
    skip(60_000)

    expect(result.current.suspended).toBe(false)
    expect(result.current.running).toBe(true)
    expect(result.current.sec).toBe(120)
  })

  it('finishes a countdown that ran out while the tab was hidden', () => {
    const onFinish = vi.fn()
    const { result } = renderHook(() => useSessionTimer({ onFinish }))
    act(() => result.current.setTarget(900))
    act(() => result.current.start())

    setVisibility('hidden')
    skip(3600_000)
    setVisibility('visible')

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(result.current.running).toBe(false)
    expect(result.current.sec).toBe(0)
    // What gets logged is the countdown's length, not the hour it sat at zero.
    expect(result.current.usedSec).toBe(900)
  })

  it('starts a fresh session after reset', () => {
    const { result } = renderHook(() => useSessionTimer())
    act(() => result.current.start())
    skip(600_000)
    act(() => result.current.reset())

    expect(result.current.sec).toBe(0)
    expect(result.current.running).toBe(false)
  })
})

describe('useSessionTimer — the session, not just the clock', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(START)
    setVisibility('visible')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('brings the name and both tags back through a reload', () => {
    const first = renderHook(() => useSessionTimer())
    act(() => {
      first.result.current.setName('NAUCode: Onb review')
      first.result.current.setKind('work')
      first.result.current.setProject('Sao đâu')
      first.result.current.start()
    })
    skip(90 * 60_000)
    first.unmount()

    const { result } = renderHook(() => useSessionTimer())

    // The whole session comes back, not a bare number with nothing to file it as.
    expect(result.current.running).toBe(true)
    expect(result.current.sec).toBe(90 * 60)
    expect(result.current.name).toBe('NAUCode: Onb review')
    expect(result.current.kind).toBe('work')
    expect(result.current.project).toBe('Sao đâu')
  })

  it('clears the name on reset but keeps the tags for the next session', () => {
    const { result } = renderHook(() => useSessionTimer())
    act(() => {
      result.current.setName('đọc chương 4')
      result.current.setKind('đọc')
      result.current.setProject('Sao đâu')
      result.current.start()
    })
    skip(600_000)
    act(() => result.current.reset())

    expect(result.current.name).toBe('')
    // The next session is usually the same work for the same project.
    expect(result.current.kind).toBe('đọc')
    expect(result.current.project).toBe('Sao đâu')
    expect(result.current.sec).toBe(0)
  })

  it('starts with no name, the default kind and no project', () => {
    const { result } = renderHook(() => useSessionTimer())
    expect(result.current.name).toBe('')
    expect(result.current.kind).toBe('đọc')
    expect(result.current.project).toBeNull()
  })

  it('lets a project be cleared back to none', () => {
    const { result } = renderHook(() => useSessionTimer())
    act(() => result.current.setProject('Sao đâu'))
    act(() => result.current.setProject(null))
    expect(result.current.project).toBeNull()
  })

  it('keeps the session readable when a stored record predates these fields', () => {
    // A tab left open across the deploy that added them.
    localStorage.setItem(
      TIMER_KEY,
      JSON.stringify({ mode: 'up', target: 1500, base: 300, since: null, suspended: false, onScreenOnly: false }),
    )
    const { result } = renderHook(() => useSessionTimer())

    expect(result.current.sec).toBe(300)
    expect(result.current.name).toBe('')
    expect(result.current.kind).toBe('đọc')
    expect(result.current.project).toBeNull()
  })
})
