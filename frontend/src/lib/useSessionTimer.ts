import { useCallback, useEffect, useRef, useState } from 'react'

export type TimerMode = 'up' | 'down'

/**
 * One stopwatch. Elapsed time is not stored — it is derived from `since`, which
 * is the whole point: a counter incremented by a tick can only be as accurate
 * as the ticks it received, and a background tab receives about one a minute.
 *
 * The name and the two tags ride along with the clock rather than living in
 * the screen's state, so what comes back after a reload is the whole session
 * and not a bare number with nothing to file it under.
 */
export type Session = {
  id: string
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
  name: string
  kind: string
  project: string | null
}

/** A session plus the numbers derived from it, ready to draw. */
export type SessionView = Session & {
  running: boolean
  /** What the clock face shows: counting up, or what a countdown has left. */
  sec: number
  /** Seconds worth logging — a countdown reports what it burned, not what is left. */
  usedSec: number
}

type Stored = {
  sessions: Session[]
  /**
   * Which session is expanded, or `''` for none — clicking away from the rail
   * collapses everything, because a panel left open is a panel taking up room
   * for work that is no longer happening.
   */
  openId: string
}

export const TIMER_KEY = 'beanweirdo.hours.timer'

/**
 * A session left running is a session forgotten. Restoring one that has been
 * "running" longer than this would log a day of sleep as practice, so it comes
 * back stopped at the cap, for the person to correct or discard.
 */
export const MAX_SESSION_HOURS = 12

/**
 * How many clocks can run at once.
 *
 * Not a technical limit — the rail is about 620px tall and a collapsed session
 * takes ~52px, so past five the expanded session gets pushed out of sight and
 * the thing you are actually working on is the thing you can't see.
 */
export const MAX_SESSIONS = 5

const now = () => Date.now()

let seq = 0
/** Unique within a page load, which is all an id has to be here. */
const newId = () => `s${now().toString(36)}-${seq++}`

export function blankSession(from?: Partial<Session>): Session {
  return {
    mode: 'up',
    // 30 phút, một mốc có sẵn — mặc định cũ là 1500 giây (25 phút), và vì nó
    // không nằm trong bốn mốc nên hàng hẹn giờ tự mọc thêm chip 25′ cho ai
    // chưa từng đặt gì.
    target: 1800,
    base: 0,
    since: null,
    suspended: false,
    onScreenOnly: false,
    name: '',
    kind: 'đọc',
    project: null,
    ...from,
    // A caller passing a stored record keeps its id; a caller passing only
    // fields to seed a new session gets the fresh one above.
    id: from?.id ?? newId(),
  }
}

/** Seconds this session has counted, as of `at`. */
function elapsed(s: Session, at: number): number {
  const running = s.since === null ? 0 : Math.max(0, Math.floor((at - s.since) / 1000))
  return s.base + running
}

/** Bank what ran while nothing was watching, and disbelieve a forgotten session. */
function restore(s: Session): Session {
  if (s.since === null) return s
  const ran = elapsed(s, now())
  if (ran > MAX_SESSION_HOURS * 3600) {
    return { ...s, base: MAX_SESSION_HOURS * 3600, since: null, suspended: false }
  }
  return s
}

/**
 * Read what is stored, including records written before this screen could run
 * more than one clock — those hold a single session at the top level, and a tab
 * left open across the deploy must not lose the session it is timing.
 */
function read(): Stored {
  const fresh = blankSession()
  try {
    const raw = localStorage.getItem(TIMER_KEY)
    if (!raw) return { sessions: [fresh], openId: fresh.id }
    const parsed = JSON.parse(raw) as Partial<Stored> & Partial<Session>

    if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
      const sessions = parsed.sessions.map((s) => restore(blankSession(s)))
      const openId = sessions.some((s) => s.id === parsed.openId)
        ? (parsed.openId as string)
        : sessions[sessions.length - 1].id
      return { sessions, openId }
    }

    // The one-session shape. Everything it held is still meaningful.
    const only = restore(blankSession(parsed as Partial<Session>))
    return { sessions: [only], openId: only.id }
  } catch {
    return { sessions: [fresh], openId: fresh.id }
  }
}

function write(s: Stored) {
  try {
    localStorage.setItem(TIMER_KEY, JSON.stringify(s))
  } catch {
    /* private mode, quota — the timers still work, they just won't survive a reload */
  }
}

function viewOf(s: Session, at: number): SessionView {
  const ran = elapsed(s, at)
  return {
    ...s,
    running: s.since !== null,
    sec: s.mode === 'down' ? Math.max(0, s.target - ran) : ran,
    usedSec: s.mode === 'down' ? Math.min(s.target, ran) : ran,
  }
}

/**
 * The stopwatches behind Ghi 02's timer rail — several at once.
 *
 * Two activities can genuinely run side by side (something fermenting while you
 * read), so a session is no longer a singleton. One session is expanded at a
 * time; the rest keep counting from a collapsed line. Every clock is a
 * timestamp, so a session that is out of sight is not out of time.
 */
export function useSessionTimer({ onFinish }: { onFinish?: (s: Session) => void } = {}) {
  const [state, setState] = useState<Stored>(read)
  // Repaint pulse — the value is never read, only its change.
  const [, pulse] = useState(0)
  const finished = useRef<Set<string>>(new Set())

  const update = useCallback((next: (s: Stored) => Stored) => {
    setState((s) => {
      const value = next(s)
      write(value)
      return value
    })
  }, [])

  /** Apply a change to one session, leaving the others alone. */
  const patch = useCallback(
    (id: string, fn: (s: Session) => Session) =>
      update((st) => ({ ...st, sessions: st.sessions.map((s) => (s.id === id ? fn(s) : s)) })),
    [update],
  )

  const at = now()
  const sessions = state.sessions.map((s) => viewOf(s, at))
  const open = sessions.find((s) => s.id === state.openId) ?? null
  const anyRunning = sessions.some((s) => s.running)

  // Repaint while any clock moves. One second is the display's resolution, not
  // the timer's: every reading is computed from a timestamp either way.
  useEffect(() => {
    if (!anyRunning) return
    const id = window.setInterval(() => pulse((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [anyRunning])

  // A countdown that reaches zero stops itself, wherever the tab was when it
  // happened — including "was hidden for an hour", in which case this fires on
  // the first render after coming back. Each session is tracked separately, so
  // two countdowns ending together both get their moment.
  useEffect(() => {
    for (const s of sessions) {
      if (s.mode !== 'down' || !s.running) continue
      if (s.sec > 0) {
        finished.current.delete(s.id)
        continue
      }
      if (finished.current.has(s.id)) continue
      finished.current.add(s.id)
      patch(s.id, (x) => ({ ...x, base: x.target, since: null, suspended: false }))
      onFinish?.(s)
    }
  })

  // The on-screen-only rule, per session: one activity may need the screen and
  // another may not.
  useEffect(() => {
    function onVisibility() {
      const hidden = document.visibilityState === 'hidden'
      update((st) => ({
        ...st,
        sessions: st.sessions.map((s) => {
          if (hidden) {
            if (!s.onScreenOnly || s.since === null) return s
            return { ...s, base: elapsed(s, now()), since: null, suspended: true }
          }
          if (!s.suspended) return s
          return { ...s, since: now(), suspended: false }
        }),
      }))
      pulse((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [update])

  const start = useCallback(
    (id: string) => {
      finished.current.delete(id)
      patch(id, (s) => (s.since === null ? { ...s, since: now(), suspended: false } : s))
    },
    [patch],
  )

  const pause = useCallback(
    (id: string) =>
      patch(id, (s) =>
        s.since === null
          ? { ...s, suspended: false }
          : { ...s, base: elapsed(s, now()), since: null, suspended: false },
      ),
    [patch],
  )

  /**
   * Finish with this session and start it over blank. The name goes, the tags
   * stay: the next session is usually the same kind of work for the same
   * project, and re-picking both every time is the friction the rail's
   * auto-select exists to remove.
   */
  const reset = useCallback(
    (id: string) => {
      finished.current.delete(id)
      patch(id, (s) => ({ ...s, base: 0, since: null, suspended: false, name: '' }))
    },
    [patch],
  )

  /**
   * Start this session's clock over without ending the session. Everything that
   * says *what* is being timed stays — name, tags, mode, countdown length — and
   * only the reading goes back to zero. A clock that was moving keeps moving,
   * so a countdown rolls straight into its next round.
   *
   * Deliberately not the same as `reset`, which also clears the name: that one
   * means "done with this, on to the next thing", this one means "same thing,
   * from the top". Re-typing the name and re-picking both tags to correct a
   * clock left running by mistake is the friction worth removing here.
   */
  const restart = useCallback(
    (id: string) => {
      finished.current.delete(id)
      patch(id, (s) => ({ ...s, base: 0, since: s.since === null ? null : now() }))
    },
    [patch],
  )

  const setMode = useCallback(
    (id: string, mode: TimerMode) => {
      finished.current.delete(id)
      patch(id, (s) => ({ ...s, mode, base: 0, since: null, suspended: false }))
    },
    [patch],
  )

  const setTarget = useCallback(
    (id: string, target: number) => {
      finished.current.delete(id)
      patch(id, (s) => ({ ...s, mode: 'down', target, base: 0, since: null, suspended: false }))
    },
    [patch],
  )

  const setName = useCallback((id: string, name: string) => patch(id, (s) => ({ ...s, name })), [patch])
  const setKind = useCallback((id: string, kind: string) => patch(id, (s) => ({ ...s, kind })), [patch])
  const setProject = useCallback(
    (id: string, project: string | null) => patch(id, (s) => ({ ...s, project })),
    [patch],
  )

  const setOnScreenOnly = useCallback(
    (id: string, onScreenOnly: boolean) =>
      patch(id, (s) => {
        // Turning the rule off while it is holding the clock hands it back.
        if (!onScreenOnly && s.suspended) return { ...s, onScreenOnly, since: now(), suspended: false }
        if (onScreenOnly && document.visibilityState === 'hidden' && s.since !== null) {
          return { ...s, onScreenOnly, base: elapsed(s, now()), since: null, suspended: true }
        }
        return { ...s, onScreenOnly }
      }),
    [patch],
  )

  /** Expand one session; whichever was expanded collapses. */
  const openSession = useCallback((id: string) => update((st) => ({ ...st, openId: id })), [update])

  /** Collapse everything — nothing is being worked on. */
  const collapseAll = useCallback(() => update((st) => ({ ...st, openId: '' })), [update])

  /**
   * A new clock, expanded, carrying the tags of the one that was open — the
   * next activity is usually filed the same way, and the name is the only part
   * that is always different.
   */
  const addSession = useCallback(
    () =>
      update((st) => {
        if (st.sessions.length >= MAX_SESSIONS) return st
        const from = st.sessions.find((s) => s.id === st.openId)
        const next = blankSession({ kind: from?.kind, project: from?.project ?? null })
        return { sessions: st.sessions.concat([next]), openId: next.id }
      }),
    [update],
  )

  /**
   * Drop a session. The rail always holds at least one, so removing the last
   * one leaves a blank in its place rather than an empty rail with no way back.
   */
  const removeSession = useCallback(
    (id: string) =>
      update((st) => {
        finished.current.delete(id)
        const left = st.sessions.filter((s) => s.id !== id)
        if (left.length === 0) {
          const fresh = blankSession()
          return { sessions: [fresh], openId: fresh.id }
        }
        const openId = st.openId === id ? left[left.length - 1].id : st.openId
        return { sessions: left, openId }
      }),
    [update],
  )

  return {
    /** Every clock, in the order they were created. */
    sessions,
    /** The expanded one, or null when everything is collapsed. */
    open,
    openId: open?.id ?? '',
    /**
     * Whether another clock can be started. A nameless session would give the
     * collapsed list a row with nothing to tell it apart by.
     */
    canAdd: sessions.length < MAX_SESSIONS && (open?.name.trim().length ?? 0) > 0,
    openSession,
    collapseAll,
    addSession,
    removeSession,
    start,
    pause,
    reset,
    restart,
    setMode,
    setTarget,
    setName,
    setKind,
    setProject,
    setOnScreenOnly,
  }
}
