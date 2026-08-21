import { useCallback, useEffect, useRef, useState } from 'react'

export type TimerMode = 'up' | 'down'

/**
 * What is kept between renders, screens and page loads. Elapsed time is not
 * stored — it is derived from `since`, which is the whole point: a counter that
 * is incremented by a tick can only be as accurate as the ticks it received.
 */
type Stored = {
  mode: TimerMode
  /** Countdown length, in seconds. Ignored while counting up. */
  target: number
  /** Seconds banked by earlier runs of this session. */
  base: number
  /** Epoch ms the current run started, or null when the clock is not moving. */
  since: number | null
  /** Held by the on-screen-only rule rather than by the person. */
  suspended: boolean
  onScreenOnly: boolean
  /**
   * What the running session will be filed as.
   *
   * Kept beside the clock rather than in the screen's own state: the clock now
   * survives a reload and leaving the page, and a session that comes back
   * running with its name and tags wiped is a session you have to file as
   * "Phiên không tên" under nothing — which undoes the two fixes that put the
   * name and the project there in the first place.
   */
  name: string
  kind: string
  project: string | null
}

export const TIMER_KEY = 'beanweirdo.hours.timer'

/**
 * A session left running is a session forgotten. Restoring one that has been
 * "running" longer than this would log a day of sleep as practice, so it comes
 * back stopped at the cap, for the person to correct or discard.
 */
export const MAX_SESSION_HOURS = 12

const EMPTY: Stored = {
  mode: 'up',
  target: 1500,
  base: 0,
  since: null,
  suspended: false,
  onScreenOnly: false,
  name: '',
  kind: 'đọc',
  project: null,
}

const now = () => Date.now()

/** Seconds this session has counted, as of `at`. */
function elapsed(s: Stored, at: number): number {
  const running = s.since === null ? 0 : Math.max(0, Math.floor((at - s.since) / 1000))
  return s.base + running
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(TIMER_KEY)
    if (!raw) return EMPTY
    const parsed = { ...EMPTY, ...(JSON.parse(raw) as Partial<Stored>) }
    if (parsed.since === null) return parsed
    // Came back from a page load: bank what ran while nothing was watching,
    // and refuse to believe a session older than the cap.
    const ran = elapsed(parsed, now())
    if (ran > MAX_SESSION_HOURS * 3600) {
      return { ...parsed, base: MAX_SESSION_HOURS * 3600, since: null, suspended: false }
    }
    return parsed
  } catch {
    return EMPTY
  }
}

function write(s: Stored) {
  try {
    localStorage.setItem(TIMER_KEY, JSON.stringify(s))
  } catch {
    /* private mode, quota — the timer still works, it just won't survive a reload */
  }
}

/**
 * The stopwatch behind Ghi 02's timer rail.
 *
 * It used to count by adding one to a number every second, which made the
 * reading a count of ticks rather than a measure of time — and a background tab
 * is throttled to roughly one tick a minute, so four hours of work in another
 * tab came back as thirteen minutes. Time is now read from the clock: `since`
 * is a timestamp, and the interval only decides how often the display is
 * repainted. Miss every tick and the number is still right.
 *
 * The session's name and its two tags ride along in the same record, so what
 * comes back after a reload is the whole session, not a bare number.
 *
 * `onScreenOnly` is the opposite promise, for people who want the timer to
 * measure attention rather than duration: while it is on, leaving the tab
 * parks the clock and coming back starts it again.
 */
export function useSessionTimer({ onFinish }: { onFinish?: () => void } = {}) {
  const [state, setState] = useState<Stored>(read)
  // Repaint pulse — the value is never read, only its change.
  const [, pulse] = useState(0)
  const finishedRef = useRef(false)

  const update = useCallback((next: Stored | ((s: Stored) => Stored)) => {
    setState((s) => {
      const value = typeof next === 'function' ? next(s) : next
      write(value)
      return value
    })
  }, [])

  const running = state.since !== null
  const ran = elapsed(state, now())
  const sec = state.mode === 'down' ? Math.max(0, state.target - ran) : ran
  /** Seconds worth logging — a countdown reports what it burned, not what is left. */
  const usedSec = state.mode === 'down' ? Math.min(state.target, ran) : ran

  // Repaint while the clock moves. One second is the display's resolution, not
  // the timer's: the reading is computed from the timestamp either way.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => pulse((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])

  // A countdown that reaches zero stops itself, wherever the tab was when it
  // happened — including "was hidden for an hour", in which case this fires on
  // the first render after coming back.
  useEffect(() => {
    if (state.mode !== 'down' || !running || sec > 0) {
      if (sec > 0) finishedRef.current = false
      return
    }
    if (finishedRef.current) return
    finishedRef.current = true
    update((s) => ({ ...s, base: s.target, since: null, suspended: false }))
    onFinish?.()
  }, [state.mode, running, sec, update, onFinish])

  // The on-screen-only rule, and the reason a hidden tab is watched at all.
  useEffect(() => {
    function onVisibility() {
      update((s) => {
        if (document.visibilityState === 'hidden') {
          if (!s.onScreenOnly || s.since === null) return s
          return { ...s, base: elapsed(s, now()), since: null, suspended: true }
        }
        if (!s.suspended) return s
        return { ...s, since: now(), suspended: false }
      })
      pulse((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [update])

  const start = useCallback(() => {
    finishedRef.current = false
    update((s) => (s.since === null ? { ...s, since: now(), suspended: false } : s))
  }, [update])

  const pause = useCallback(() => {
    update((s) => (s.since === null ? { ...s, suspended: false } : { ...s, base: elapsed(s, now()), since: null, suspended: false }))
  }, [update])

  /**
   * Finish with this session and start a blank one. The name goes, the tags
   * stay: the next session is usually the same kind of work for the same
   * project, and making someone re-pick both every time is the friction the
   * rail's auto-select exists to remove.
   */
  const reset = useCallback(() => {
    finishedRef.current = false
    update((s) => ({ ...s, base: 0, since: null, suspended: false, name: '' }))
  }, [update])

  const setMode = useCallback(
    (mode: TimerMode) => {
      finishedRef.current = false
      update((s) => ({ ...s, mode, base: 0, since: null, suspended: false }))
    },
    [update],
  )

  const setTarget = useCallback(
    (target: number) => {
      finishedRef.current = false
      update((s) => ({ ...s, mode: 'down', target, base: 0, since: null, suspended: false }))
    },
    [update],
  )

  const setName = useCallback((name: string) => update((s) => ({ ...s, name })), [update])
  const setKind = useCallback((kind: string) => update((s) => ({ ...s, kind })), [update])
  const setProject = useCallback(
    (project: string | null) => update((s) => ({ ...s, project })),
    [update],
  )

  const setOnScreenOnly = useCallback(
    (onScreenOnly: boolean) => {
      update((s) => {
        // Turning the rule off while it is holding the clock hands it back.
        if (!onScreenOnly && s.suspended) return { ...s, onScreenOnly, since: now(), suspended: false }
        if (onScreenOnly && document.visibilityState === 'hidden' && s.since !== null) {
          return { ...s, onScreenOnly, base: elapsed(s, now()), since: null, suspended: true }
        }
        return { ...s, onScreenOnly }
      })
    },
    [update],
  )

  return {
    mode: state.mode,
    target: state.target,
    onScreenOnly: state.onScreenOnly,
    name: state.name,
    kind: state.kind,
    project: state.project,
    setName,
    setKind,
    setProject,
    /** True while the on-screen-only rule is parking a session the person started. */
    suspended: state.suspended,
    running,
    sec,
    usedSec,
    start,
    pause,
    reset,
    setMode,
    setTarget,
    setOnScreenOnly,
  }
}
