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
  /** A line the owner attached to this activity — often a URL. */
  note: string | null
  /**
   * The activity this row is one sitting of, or null. Nesting is one level:
   * a row with a parent may not be one. Enforced here rather than by a
   * trigger — one rule is cheaper to read in the API than in the schema.
   */
  parent_id: string | null
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
  note: string | null
  parentId: string | null
  /**
   * When the row was written. Not shown anywhere — it breaks ties in the day
   * list, so two rows sharing a clock time keep the order they were made in
   * rather than whichever order the database happened to return.
   */
  createdAt: string
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
    note: row.note ?? null,
    parentId: row.parent_id ?? null,
    createdAt: row.created_at,
  }
}

/**
 * The API speaks the database's own names, with one exception: the journal
 * calls this `parentId` on the way in and out, because everything else it
 * hands the browser is camelCase. Translated here, in one place, rather than
 * leaving one snake_case field loose in the client.
 */
export const HOUR_LOG_ALIASES: Record<string, string> = { parentId: 'parent_id' }

export const HOUR_LOG_WRITABLE = [
  'date',
  'name',
  'kind',
  'project',
  'mins',
  'at',
  'done',
  'note',
  'parent_id',
] as const

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
