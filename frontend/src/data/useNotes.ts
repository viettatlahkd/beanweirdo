import { useCallback, useEffect, useState } from 'react'
import { createNote, deleteNote, patchNote } from '../admin/lib/apiClient'
import { BLANK_NOTE, type Note, type NoteKind, type NoteLength } from '../content/notes'
import { supabase } from '../lib/supabaseClient'

/** A row of the public `notes` table — see backend/supabase/migrations/0008. */
type NoteRow = {
  id: string
  d: string
  k: NoteKind
  t: string
  b: string
  len: NoteLength
  media_hint: string | null
  portrait: boolean
  template: 'note' | 'memo'
  pinned: boolean
  body: unknown | null
  img: string | null
}

const toNote = (r: NoteRow): Note => ({
  id: r.id,
  d: r.d,
  k: r.k,
  t: r.t,
  b: r.b,
  len: r.len,
  mediaHint: r.media_hint,
  portrait: r.portrait,
  template: r.template ?? 'note',
  pinned: r.pinned ?? false,
  body: r.body ?? null,
  img: r.img ?? null,
})

export type UseNotesResult = {
  notes: Note[]
  loading: boolean
  error: string | null
  add(): Promise<Note | null>
  patch(id: string, patch: Partial<Omit<Note, 'id'>>): Promise<void>
  remove(id: string): Promise<void>
}

/**
 * Ghi 01's notes.
 *
 * Reading is public and goes straight to Supabase with the anon key, same as
 * the modules and posts — the page has to render for a visitor who will never
 * sign in. Writing goes through `/api/notes` behind the login, so the anon key
 * stays read-only.
 */
export function useNotes(): UseNotesResult {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      // Pinned notes lead, then newest first (merge notes §6).
      .order('pinned', { ascending: false })
      .order('d', { ascending: false })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setError(null)
    setNotes(((data ?? []) as NoteRow[]).map(toNote))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const failed = useCallback(
    (e: unknown) => {
      setError((e as Error).message)
      void load()
    },
    [load],
  )

  /**
   * A new note is created empty and dated today, then typed into where it
   * lands — the writer never fills a form somewhere else to make it appear.
   */
  const add = useCallback(async () => {
    try {
      const saved = await createNote({ ...BLANK_NOTE, d: new Date().toISOString().slice(0, 10) })
      setNotes((ns) => [saved, ...ns])
      setError(null)
      return saved
    } catch (e) {
      failed(e)
      return null
    }
  }, [failed])

  const patch = useCallback(
    async (id: string, next: Partial<Omit<Note, 'id'>>) => {
      setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...next } : n)))
      try {
        const saved = await patchNote(id, next)
        setNotes((ns) => ns.map((n) => (n.id === id ? saved : n)))
        setError(null)
      } catch (e) {
        failed(e)
      }
    },
    [failed],
  )

  const remove = useCallback(
    async (id: string) => {
      setNotes((ns) => ns.filter((n) => n.id !== id))
      try {
        await deleteNote(id)
        setError(null)
      } catch (e) {
        failed(e)
      }
    },
    [failed],
  )

  return { notes, loading, error, add, patch, remove }
}
