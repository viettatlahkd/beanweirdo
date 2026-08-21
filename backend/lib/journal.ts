// Row/JSON mapping for the personal journal — Ghi 02 (hour_logs +
// activity_kinds) and Ghi 01 (notes).
//
// Schema source of truth: backend/supabase/migrations/0001_initial_schema.sql
// and 0008_single_author_journal.sql, which dropped the per-user coupling.

// ── Ghi 02 — practice log ───────────────────────────────────────────────────

export interface HourLogRow {
  id: string
  date: string
  name: string
  /** The task system — what kind of work this was. */
  kind: string
  /** The project system — what it was for. Null when it belongs to none. */
  project: string | null
  mins: number
  /** `HH:MM:SS` out of Postgres, `HH:MM` going in. */
  at: string
  done: boolean
  created_at: string
}

export interface HourLog {
  id: string
  date: string
  name: string
  kind: string
  project: string | null
  mins: number
  at: string
  done: boolean
}

/** Postgres hands back `HH:MM:SS`; the journal only ever shows `HH:MM`. */
const trimSeconds = (at: string) => at.slice(0, 5)

export function toHourLog(row: HourLogRow): HourLog {
  return {
    id: row.id,
    date: row.date,
    name: row.name,
    kind: row.kind,
    project: row.project ?? null,
    mins: row.mins,
    at: trimSeconds(row.at),
    done: row.done,
  }
}

export const HOUR_LOG_WRITABLE = ['date', 'name', 'kind', 'project', 'mins', 'at', 'done'] as const

/** The two ways an activity is filed — see migration 0009. */
export const TAG_SYSTEMS = ['task', 'project'] as const
export type TagSystem = (typeof TAG_SYSTEMS)[number]

/** Which column of `hour_logs` a tag system is written to. */
export const TAG_COLUMN: Record<TagSystem, 'kind' | 'project'> = {
  task: 'kind',
  project: 'project',
}

/**
 * Where an activity lands when its tag is deleted and nothing was chosen to
 * replace it.
 *
 * Not a tag anyone creates and not a row in `activity_kinds` — it is the name
 * the reports need for "this happened, and it was never filed". `kind` is NOT
 * NULL, so the alternative was inventing a tag per deletion or refusing to
 * delete tags that are in use; this keeps the hours in the totals either way.
 */
export const UNCLASSIFIED = 'khác'

export interface ActivityKindRow {
  id: string
  name: string
  system: TagSystem
  sort_order: number
}

// ── Ghi 01 — loose notes ────────────────────────────────────────────────────

export const NOTE_KINDS = ['quan sát', 'video', 'cảm nhận', 'liên ngành'] as const
export const NOTE_LENGTHS = ['dài', 'vừa', 'ngắn', 'media'] as const

export type NoteKind = (typeof NOTE_KINDS)[number]
export type NoteLength = (typeof NOTE_LENGTHS)[number]

export interface NoteRow {
  id: string
  d: string
  k: NoteKind
  t: string
  b: string
  len: NoteLength
  media_hint: string | null
  portrait: boolean
  created_at: string
}

export interface Note {
  id: string
  /** date, `YYYY-MM-DD` */
  d: string
  /** kind */
  k: NoteKind
  /** title */
  t: string
  /** body */
  b: string
  /** how much room it takes in the grid */
  len: NoteLength
  mediaHint: string | null
  portrait: boolean
}

export function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    d: row.d,
    k: row.k,
    t: row.t,
    b: row.b,
    len: row.len,
    mediaHint: row.media_hint,
    portrait: row.portrait,
  }
}

/** Body keys the editor may write, and the column each lands in. */
export const NOTE_WRITABLE: Array<{ jsonKey: string; column: keyof NoteRow }> = [
  { jsonKey: 'd', column: 'd' },
  { jsonKey: 'k', column: 'k' },
  { jsonKey: 't', column: 't' },
  { jsonKey: 'b', column: 'b' },
  { jsonKey: 'len', column: 'len' },
  { jsonKey: 'mediaHint', column: 'media_hint' },
  { jsonKey: 'portrait', column: 'portrait' },
]

/** Guards the two CHECK constraints before Postgres has to. */
export function validateNote(patch: Record<string, unknown>): string | null {
  if ('k' in patch && !(NOTE_KINDS as readonly string[]).includes(patch.k as string)) {
    return `k must be one of: ${NOTE_KINDS.join(', ')}`
  }
  if ('len' in patch && !(NOTE_LENGTHS as readonly string[]).includes(patch.len as string)) {
    return `len must be one of: ${NOTE_LENGTHS.join(', ')}`
  }
  return null
}
