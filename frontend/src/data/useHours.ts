import { useCallback, useEffect, useState } from 'react'
import { addKind as apiAddKind, createLog, deleteLog, listHours, patchLog } from '../admin/lib/apiClient'
import { KINDS, SPAN_DAYS, dateStr, dayBefore, type LogEntry } from '../content/hours'

export type UseHoursResult = {
  logs: LogEntry[]
  /** Every kind on file — the four shipped ones plus any added since. */
  kinds: string[]
  loading: boolean
  error: string | null
  add(entry: Omit<LogEntry, 'id'>): Promise<LogEntry | null>
  patch(id: string, patch: Partial<Omit<LogEntry, 'id'>>): Promise<void>
  remove(id: string): Promise<void>
  addKind(name: string): Promise<void>
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Only the span the screen actually draws — the history behind it stays on
  // the server rather than growing the payload every day.
  const from = dateStr(dayBefore(SPAN_DAYS - 1))

  const load = useCallback(async () => {
    try {
      const data = await listHours(from)
      setLogs(data.logs)
      setKinds(data.kinds.length > 0 ? data.kinds : KINDS)
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

  const add = useCallback(
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

  const patch = useCallback(
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

  const remove = useCallback(
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

  const addKind = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed || kinds.includes(trimmed)) return
      setKinds((ks) => ks.concat([trimmed]))
      try {
        setKinds(await apiAddKind(trimmed))
        setError(null)
      } catch (e) {
        failed(e)
      }
    },
    [kinds, failed],
  )

  return { logs, kinds, loading, error, add, patch, remove, addKind }
}
