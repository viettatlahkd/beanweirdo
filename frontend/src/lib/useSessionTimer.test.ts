import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_SESSIONS, MAX_SESSION_HOURS, TIMER_KEY, useSessionTimer } from './useSessionTimer'

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

describe('useSessionTimer — one clock', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(START)
    setVisibility('visible')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with a single blank session, expanded', () => {
    const { result } = renderHook(() => useSessionTimer())
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.open.id).toBe(result.current.sessions[0].id)
    expect(result.current.open.name).toBe('')
    expect(result.current.open.kind).toBe('đọc')
    expect(result.current.open.project).toBeNull()
  })

  it('measures time rather than counting ticks, so a throttled tab still adds up', () => {
    const { result } = renderHook(() => useSessionTimer())
    const id = result.current.open.id
    act(() => result.current.start(id))

    skip(4 * 3600_000)

    expect(result.current.open.sec).toBe(4 * 3600)
    expect(result.current.open.usedSec).toBe(4 * 3600)
  })

  it('banks the elapsed time on pause and carries on from there', () => {
    const { result } = renderHook(() => useSessionTimer())
    const id = result.current.open.id
    act(() => result.current.start(id))
    skip(600_000)
    act(() => result.current.pause(id))

    expect(result.current.open.running).toBe(false)
    expect(result.current.open.sec).toBe(600)

    skip(3600_000)
    expect(result.current.open.sec).toBe(600)

    act(() => result.current.start(id))
    skip(60_000)
    expect(result.current.open.sec).toBe(660)
  })

  it('clears the name on reset but keeps the tags for the next session', () => {
    const { result } = renderHook(() => useSessionTimer())
    const id = result.current.open.id
    act(() => {
      result.current.setName(id, 'đọc chương 4')
      result.current.setProject(id, 'Sao đâu')
      result.current.start(id)
    })
    skip(600_000)
    act(() => result.current.reset(id))

    expect(result.current.open.name).toBe('')
    expect(result.current.open.project).toBe('Sao đâu')
    expect(result.current.open.sec).toBe(0)
  })

  it('refuses to restore a session left running past the cap', () => {
    localStorage.setItem(
      TIMER_KEY,
      JSON.stringify({
        sessions: [
          {
            id: 'old',
            mode: 'up',
            target: 1500,
            base: 0,
            since: START - (MAX_SESSION_HOURS + 6) * 3600_000,
            suspended: false,
            onScreenOnly: false,
            name: 'bỏ quên',
            kind: 'đọc',
            project: null,
          },
        ],
        openId: 'old',
      }),
    )

    const { result } = renderHook(() => useSessionTimer())

    expect(result.current.open.running).toBe(false)
    expect(result.current.open.sec).toBe(MAX_SESSION_HOURS * 3600)
  })
})

describe('useSessionTimer — several clocks at once', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(START)
    setVisibility('visible')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  /** Name the open session so `canAdd` lets another one start. */
  function named(result: { current: ReturnType<typeof useSessionTimer> }, name: string) {
    act(() => result.current.setName(result.current.open.id, name))
  }

  it('runs two clocks side by side, each counting its own time', () => {
    const { result } = renderHook(() => useSessionTimer())
    const first = result.current.open.id
    named(result, 'Cấy men ngày 4')
    act(() => result.current.start(first))
    skip(3600_000)

    act(() => result.current.addSession())
    const second = result.current.open.id
    act(() => result.current.start(second))
    skip(600_000)

    const a = result.current.sessions.find((s) => s.id === first)!
    const b = result.current.sessions.find((s) => s.id === second)!
    // An hour and ten minutes for the first; ten for the second.
    expect(a.sec).toBe(4200)
    expect(b.sec).toBe(600)
    expect(a.running && b.running).toBe(true)
  })

  it('expands the newest session and leaves the others collapsed', () => {
    const { result } = renderHook(() => useSessionTimer())
    const first = result.current.open.id
    named(result, 'việc một')
    act(() => result.current.addSession())

    expect(result.current.sessions).toHaveLength(2)
    expect(result.current.open.id).not.toBe(first)
    // Order is order of creation, so the list above never reshuffles.
    expect(result.current.sessions[0].id).toBe(first)
  })

  it('hands the new session the open one’s tags but not its name', () => {
    const { result } = renderHook(() => useSessionTimer())
    const first = result.current.open.id
    act(() => {
      result.current.setName(first, 'Cấy men ngày 4')
      result.current.setKind(first, 'thực hành')
      result.current.setProject(first, 'Sao đâu')
    })
    act(() => result.current.addSession())

    expect(result.current.open.kind).toBe('thực hành')
    expect(result.current.open.project).toBe('Sao đâu')
    expect(result.current.open.name).toBe('')
  })

  it('will not start a clock for an activity with no name', () => {
    const { result } = renderHook(() => useSessionTimer())
    expect(result.current.canAdd).toBe(false)

    named(result, 'có tên rồi')
    expect(result.current.canAdd).toBe(true)
  })

  it('stops at the cap', () => {
    const { result } = renderHook(() => useSessionTimer())
    for (let i = 0; i < MAX_SESSIONS + 2; i++) {
      named(result, `việc ${i}`)
      act(() => result.current.addSession())
    }
    expect(result.current.sessions).toHaveLength(MAX_SESSIONS)
    expect(result.current.canAdd).toBe(false)
  })

  it('switches which one is expanded without touching any clock', () => {
    const { result } = renderHook(() => useSessionTimer())
    const first = result.current.open.id
    named(result, 'việc một')
    act(() => result.current.start(first))
    act(() => result.current.addSession())
    skip(300_000)

    act(() => result.current.openSession(first))

    expect(result.current.open.id).toBe(first)
    expect(result.current.open.running).toBe(true)
    expect(result.current.open.sec).toBe(300)
  })

  it('removes one and expands what is left', () => {
    const { result } = renderHook(() => useSessionTimer())
    const first = result.current.open.id
    named(result, 'việc một')
    act(() => result.current.addSession())
    const second = result.current.open.id

    act(() => result.current.removeSession(second))

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.open.id).toBe(first)
  })

  it('always leaves one clock behind, even when the last is removed', () => {
    const { result } = renderHook(() => useSessionTimer())
    act(() => result.current.removeSession(result.current.open.id))

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.open.name).toBe('')
  })

  it('brings every clock back through a reload, still running', () => {
    const first = renderHook(() => useSessionTimer())
    act(() => first.result.current.setName(first.result.current.open.id, 'việc một'))
    act(() => first.result.current.start(first.result.current.open.id))
    act(() => first.result.current.addSession())
    act(() => first.result.current.setName(first.result.current.open.id, 'việc hai'))
    act(() => first.result.current.start(first.result.current.open.id))
    skip(1800_000)
    first.unmount()

    const { result } = renderHook(() => useSessionTimer())

    expect(result.current.sessions).toHaveLength(2)
    expect(result.current.sessions.map((s) => s.name)).toEqual(['việc một', 'việc hai'])
    expect(result.current.sessions.every((s) => s.running)).toBe(true)
    expect(result.current.open.name).toBe('việc hai')
  })

  it('parks only the sessions that asked for the on-screen rule', () => {
    const { result } = renderHook(() => useSessionTimer())
    const fermenting = result.current.open.id
    named(result, 'ủ men')
    act(() => result.current.start(fermenting))

    act(() => result.current.addSession())
    const reading = result.current.open.id
    act(() => {
      result.current.setOnScreenOnly(reading, true)
      result.current.start(reading)
    })
    skip(60_000)

    setVisibility('hidden')
    skip(1800_000)
    setVisibility('visible')

    const a = result.current.sessions.find((s) => s.id === fermenting)!
    const b = result.current.sessions.find((s) => s.id === reading)!
    // Fermentation does not need you watching; reading does.
    expect(a.sec).toBe(1860)
    expect(b.sec).toBe(60)
  })

  it('ends each countdown separately', () => {
    const onFinish = vi.fn()
    const { result } = renderHook(() => useSessionTimer({ onFinish }))
    const first = result.current.open.id
    named(result, 'việc một')
    act(() => {
      result.current.setTarget(first, 900)
      result.current.start(first)
    })
    act(() => result.current.addSession())
    const second = result.current.open.id
    act(() => {
      result.current.setTarget(second, 3600)
      result.current.start(second)
    })

    skip(1200_000)

    // The 15-minute countdown is done; the hour one is still going.
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(result.current.sessions.find((s) => s.id === first)!.running).toBe(false)
    expect(result.current.sessions.find((s) => s.id === second)!.running).toBe(true)
  })
})

describe('useSessionTimer — records written before this screen had more than one clock', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(START)
    setVisibility('visible')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps a session that was running when the shape changed', () => {
    // A tab left open across the deploy: one session at the top level.
    localStorage.setItem(
      TIMER_KEY,
      JSON.stringify({
        mode: 'up',
        target: 1500,
        base: 0,
        since: START - 90 * 60_000,
        suspended: false,
        onScreenOnly: false,
        name: 'NAUCode: Onb review',
        kind: 'work',
        project: 'Sao đâu',
      }),
    )

    const { result } = renderHook(() => useSessionTimer())

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.open.running).toBe(true)
    expect(result.current.open.sec).toBe(90 * 60)
    expect(result.current.open.name).toBe('NAUCode: Onb review')
    expect(result.current.open.project).toBe('Sao đâu')
  })

  it('fills in fields an even older record never had', () => {
    localStorage.setItem(
      TIMER_KEY,
      JSON.stringify({ mode: 'up', target: 1500, base: 300, since: null, suspended: false, onScreenOnly: false }),
    )

    const { result } = renderHook(() => useSessionTimer())

    expect(result.current.open.sec).toBe(300)
    expect(result.current.open.name).toBe('')
    expect(result.current.open.kind).toBe('đọc')
    expect(result.current.open.project).toBeNull()
  })

  it('survives a stored value that is not JSON at all', () => {
    localStorage.setItem(TIMER_KEY, 'không phải json')
    const { result } = renderHook(() => useSessionTimer())
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.open.sec).toBe(0)
  })
})
