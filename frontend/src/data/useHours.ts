import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addKind as apiAddKind,
  assignTags,
  createLog,
  deleteKind,
  deleteLog,
  listHours,
  patchLog,
  renameKind,
  type TagMove,
} from '../admin/lib/apiClient'
import { KICKOFF, KINDS, STATS_DAYS, dateStr, dayBefore, type LogEntry } from '../content/hours'
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
  /** Rename a tag and everything filed under it, in one go. */
  renameTag(name: string, next: string, system: 'task' | 'project'): Promise<void>
  /**
   * Delete a tag. `plan` says what happens to the activities wearing it:
   * `moves` are the ones already spoken for, `rest` catches the remainder
   * (undefined files them as unclassified).
   */
  removeTag(
    name: string,
    system: 'task' | 'project',
    plan?: { moves?: TagMove[]; rest?: string | null },
  ): Promise<void>
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

  // Twelve weeks: the day list draws far less, but the heatmap and the
  // month-to-date figures read the whole window. Older history than this stays
  // on the server rather than growing the payload every day.
  // Never ask for days before the journal existed — see KICKOFF. While the
  // record is younger than the stats window this fetches the whole history,
  // which is the point: it is a few days long.
  const rolling = dateStr(dayBefore(STATS_DAYS - 1))
  const from = rolling < KICKOFF ? KICKOFF : rolling

  /**
   * `keepError` is for the refetch that follows a failed write: rolling the
   * screen back to what is stored is not evidence that the write worked, and
   * clearing the message here made "không lưu được" flash and vanish before it
   * could be read.
   */
  const load = useCallback(
    async (keepError = false) => {
      try {
        const data = await listHours(from)
        setLogs(data.logs)
        setKinds(data.kinds.length > 0 ? data.kinds : KINDS)
        setProjects(data.projects ?? [])
        if (!keepError) setError(null)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [from],
  )

  useEffect(() => {
    void load()
  }, [load])

  /** Roll the optimistic change back by refetching, and say why. */
  const failed = useCallback(
    (e: unknown) => {
      setError((e as Error).message)
      void load(true)
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

  const rawRename = useCallback(
    async (from: string, to: string, system: 'task' | 'project') => {
      const setter = system === 'task' ? setKinds : setProjects
      const column = system === 'task' ? 'kind' : 'project'
      setter((xs) => xs.map((x) => (x === from ? to : x)))
      setLogs((ls) => ls.map((l) => (l[column] === from ? { ...l, [column]: to } : l)))
      try {
        const saved = await renameKind(from, to, system)
        setKinds(saved.kinds)
        setProjects(saved.projects)
        setError(null)
      } catch (e) {
        failed(e)
      }
    },
    [failed],
  )

  const renameTag = useCallback(
    async (name: string, next: string, system: 'task' | 'project') => {
      const trimmed = next.trim()
      if (!trimmed || trimmed === name) return
      await rawRename(name, trimmed, system)
      record({
        label: 'đổi tên tag',
        undo: () => rawRename(trimmed, name, system),
        redo: () => rawRename(name, trimmed, system),
      })
    },
    [rawRename, record],
  )

  const removeTag = useCallback(
    async (
      name: string,
      system: 'task' | 'project',
      plan: { moves?: TagMove[]; rest?: string | null } = {},
    ) => {
      const setter = system === 'task' ? setKinds : setProjects
      setter((xs) => xs.filter((x) => x !== name))
      try {
        const saved = await deleteKind(name, system, plan)
        setKinds(saved.kinds)
        setProjects(saved.projects)
        setError(null)
        // The reassignments touched rows this hook holds; refetch rather than
        // replay the server's arithmetic locally and hope the two agree.
        await load()

        // `affected` is every activity that wore the tag, span or no span, so
        // undo puts back the ones the screen never showed as well.
        record({
          label: 'xoá tag',
          undo: async () => {
            await apiAddKind(name, system)
            if (saved.affected.length > 0) {
              await assignTags(system, [{ to: name, ids: saved.affected }])
            }
            await load()
          },
          redo: async () => {
            await deleteKind(name, system, plan)
            await load()
          },
        })
      } catch (e) {
        failed(e)
      }
    },
    [failed, load, record],
  )

  return {
    logs,
    kinds,
    projects,
    loading,
    error,
    add,
    patch,
    remove,
    addTag,
    renameTag,
    removeTag,
    undo,
    redo,
  }
}
