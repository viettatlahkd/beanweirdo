import { useCallback, useEffect, useRef, useState } from 'react'
import { addKind as apiAddKind, createLog, deleteLog, listHours, patchLog } from '../admin/lib/apiClient'
import { KINDS, SPAN_DAYS, dateStr, dayBefore, type LogEntry } from '../content/hours'
import { useUndoStack } from '../lib/useUndoStack'

export type UseHoursResult = {
  logs: LogEntry[]
  /** The task system — every kind on file, shipped ones plus any added since. */
  kinds: string[]
  /** The project system. */
  projects: string[]
  loading: boolean
  error: string | null
  add(entry: Omit<LogEntry, 'id'>): Promise<LogEntry | null>
  patch(id: string, patch: Partial<Omit<LogEntry, 'id'>>): Promise<void>
  remove(id: string): Promise<void>
  addTag(name: string, system: 'task' | 'project'): Promise<void>
  /** Ctrl+Z / Ctrl+Shift+Z over the last five writes — System conventions, rule 08. */
  undo(): Promise<void>
  redo(): Promise<void>
}

/**
 * Ghi 02's data, in the database.
 *
 * It used to live in localStorage, which meant one browser on one machine: a
 * journal you can't write on your phone and lose by clearing site data. Now it
 * goes through `/api/hours` behind the login, so the same entries follow you
 * everywhere you sign in.
 *
 * Writes apply locally first and reconcile with the row the server returns.
 * Journalling is typing — waiting for a round trip after every keystroke on a
 * duration field would make the screen feel broken. A failed write puts the
 * error on screen and refetches, so the display never quietly disagrees with
 * what was actually saved.
 */
export function useHours(): UseHoursResult {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [kinds, setKinds] = useState<string[]>(KINDS)
  const [projects, setProjects] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { record, undo, redo } = useUndoStack()
  // Reading the current logs inside an undo closure without making every
  // callback depend on them.
  const logsRef = useRef<LogEntry[]>([])
  logsRef.current = logs

  // Only the span the screen actually draws — the history behind it stays on
  // the server rather than growing the payload every day.
  const from = dateStr(dayBefore(SPAN_DAYS - 1))

  const load = useCallback(async () => {
    try {
      const data = await listHours(from)
      setLogs(data.logs)
      setKinds(data.kinds.length > 0 ? data.kinds : KINDS)
      setProjects(data.projects ?? [])
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [from])

  useEffect(() => {
    void load()
  }, [load])

  /** Roll the optimistic change back by refetching, and say why. */
  const failed = useCallback(
    (e: unknown) => {
      setError((e as Error).message)
      void load()
    },
    [load],
  )

  const rawAdd = useCallback(
    async (entry: Omit<LogEntry, 'id'>) => {
      try {
        const saved = await createLog(entry)
        setLogs((ls) => ls.concat([saved]))
        setError(null)
        return saved
      } catch (e) {
        failed(e)
        return null
      }
    },
    [failed],
  )

  const rawPatch = useCallback(
    async (id: string, next: Partial<Omit<LogEntry, 'id'>>) => {
      setLogs((ls) => ls.map((l) => (l.id === id ? { ...l, ...next } : l)))
      try {
        const saved = await patchLog(id, next)
        setLogs((ls) => ls.map((l) => (l.id === id ? saved : l)))
        setError(null)
      } catch (e) {
        failed(e)
      }
    },
    [failed],
  )

  const rawRemove = useCallback(
    async (id: string) => {
      setLogs((ls) => ls.filter((l) => l.id !== id))
      try {
        await deleteLog(id)
        setError(null)
      } catch (e) {
        failed(e)
      }
    },
    [failed],
  )

  const add = useCallback(
    async (entry: Omit<LogEntry, 'id'>) => {
      const saved = await rawAdd(entry)
      if (saved) {
        // Undoing a create deletes it; redoing makes a new row — a different
        // id for the same content, which is as close as a create can be undone.
        let current = saved.id
        record({
          label: 'thêm hoạt động',
          undo: () => rawRemove(current),
          redo: async () => {
            const again = await rawAdd(entry)
            if (again) current = again.id
          },
        })
      }
      return saved
    },
    [rawAdd, rawRemove, record],
  )

  const patch = useCallback(
    async (id: string, next: Partial<Omit<LogEntry, 'id'>>) => {
      const before = logsRef.current.find((l) => l.id === id)
      if (before) {
        const previous = Object.fromEntries(
          Object.keys(next).map((k) => [k, (before as Record<string, unknown>)[k]]),
        ) as Partial<Omit<LogEntry, 'id'>>
        record({
          label: 'sửa hoạt động',
          undo: () => rawPatch(id, previous),
          redo: () => rawPatch(id, next),
        })
      }
      await rawPatch(id, next)
    },
    [rawPatch, record],
  )

  const remove = useCallback(
    async (id: string) => {
      const gone = logsRef.current.find((l) => l.id === id)
      await rawRemove(id)
      if (gone) {
        // Delete is immediate and unconfirmed by design; this is what makes
        // that safe (System conventions, rule 08).
        const { id: _dropped, ...fields } = gone
        let restored: string | null = null
        record({
          label: 'xoá hoạt động',
          undo: async () => {
            const back = await rawAdd(fields)
            restored = back?.id ?? null
          },
          redo: () => rawRemove(restored ?? id),
        })
      }
    },
    [rawAdd, rawRemove, record],
  )

  const addTag = useCallback(
    async (name: string, system: 'task' | 'project') => {
      const trimmed = name.trim()
      const existing = system === 'task' ? kinds : projects
      if (!trimmed || existing.includes(trimmed)) return

      const setter = system === 'task' ? setKinds : setProjects
      setter((xs) => xs.concat([trimmed]))
      try {
        const saved = await apiAddKind(trimmed, system)
        setKinds(saved.kinds)
        setProjects(saved.projects)
        setError(null)
      } catch (e) {
        failed(e)
      }
    },
    [kinds, projects, failed],
  )

  return { logs, kinds, projects, loading, error, add, patch, remove, addTag, undo, redo }
}
