// Row/JSON mapping + the status lifecycle transition table for `posts`.
//
// Schema source of truth: backend/supabase/migrations/0001_initial_schema.sql,
// 0002_templates_and_post_status.sql, 0005_fixed_post_templates.sql.
// Transition table source of truth:
// docs/superpowers/specs/2026-08-13-post-authoring-admin-design.md, "## Status lifecycle".

export type PostKind = 'note' | 'essay' | 'ref' | 'log'
export type PostTemplate = 'article' | 'cards' | 'report' | 'longform' | 'memo'
export type PostStatus = 'draft' | 'published' | 'archived' | 'deleted'

export const POST_KINDS: PostKind[] = ['note', 'essay', 'ref', 'log']
/**
 * Every template a post may be stored as.
 *
 * This list, the database's check constraint and the renderer's dispatcher all
 * have to name the same set. They drifted once — migration 0010 added longform
 * and memo, this list was not updated, and creating either through the admin
 * answered 400 for months. `templateContract.test.ts` compares all three.
 */
export const POST_TEMPLATES: PostTemplate[] = ['article', 'cards', 'report', 'longform', 'memo']
export const POST_STATUSES: PostStatus[] = ['draft', 'published', 'archived', 'deleted']

export interface PostRow {
  id: string
  module_id: string
  en: string
  vi: string
  kind: PostKind
  date_label: string
  slug: string | null
  body: unknown | null
  hero_caption: string | null
  lead: string | null
  pull_quote: string | null
  further_reading: string[] | null
  sort_order: number
  created_at: string
  status: PostStatus
  template: PostTemplate
  hero_image_url: string | null
  published_at: string | null
  deleted_at: string | null
  previous_status: string | null
  updated_at: string
}

// `body` is selected but never returned: it is where a post keeps its pictures,
// and the listing wants one of them. Sending the whole thing to the browser to
// find a thumbnail would mean shipping a 100KB article to draw a 44px square.
/**
 * Kept as one literal string because Supabase types the query from it; an
 * array joined at runtime widens to `string` and the row type is lost.
 *
 * That makes this list unchecked, and a column dropped from the database once
 * survived here — every request to the admin listing answered 500. Whenever a
 * column goes, grep this file before trusting the tests: they mock Supabase
 * and cannot see the real schema.
 */
export const POST_SUMMARY_COLUMNS =
  'id, module_id, en, vi, kind, date_label, status, template, hero_image_url, sort_order, created_at, updated_at, published_at, body'

export const POST_DETAIL_COLUMNS = '*'

/** The first `src` anywhere in a block tree, however the template nests them. */
function findSrc(value: unknown, depth = 0): string | null {
  if (depth > 4 || value === null || typeof value !== 'object') return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findSrc(item, depth + 1)
      if (found) return found
    }
    return null
  }

  const obj = value as Record<string, unknown>
  if (typeof obj.src === 'string' && obj.src) return obj.src
  if (typeof obj.imageUrl === 'string' && obj.imageUrl) return obj.imageUrl

  for (const key of ['fig', 'items', 'sections', 'blocks', 'cards']) {
    const found = findSrc(obj[key], depth + 1)
    if (found) return found
  }
  return null
}

/**
 * What the API hands back for a post.
 *
 * The field names are the database's own. They used to be renamed to camelCase
 * on the way out, which meant the same post arrived under two different sets of
 * names depending on which door you came through — and the two sides grew two
 * adapters that then drifted apart. One shape, one set of names, end to end.
 */
export interface PostSummary {
  id: string
  module_id: string
  en: string
  vi: string
  kind: PostKind
  date_label: string
  status: PostStatus
  template: PostTemplate
  hero_image_url: string | null
  /**
   * The picture that stands for the post in a listing: its cover if it has
   * one, otherwise the first image inside it.
   */
  thumbnail_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface PostDetail extends PostSummary {
  slug: string | null
  body: unknown | null
  hero_caption: string | null
  lead: string | null
  pull_quote: string | null
  further_reading: string[] | null
  deleted_at: string | null
  previous_status: string | null
}

export function toPostSummary(row: PostRow): PostSummary {
  return {
    id: row.id,
    module_id: row.module_id,
    en: row.en,
    vi: row.vi,
    kind: row.kind,
    date_label: row.date_label,
    status: row.status,
    template: row.template,
    hero_image_url: row.hero_image_url,
    // The one field with no column behind it: a listing wants a picture, and
    // takes the post's cover or the first image inside it.
    thumbnail_url: row.hero_image_url || findSrc(row.body),
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
  }
}

export function toPostDetail(row: PostRow): PostDetail {
  return {
    ...toPostSummary(row),
    slug: row.slug,
    body: row.body,
    hero_caption: row.hero_caption,
    lead: row.lead,
    pull_quote: row.pull_quote,
    further_reading: row.further_reading,
    deleted_at: row.deleted_at,
    previous_status: row.previous_status,
  }
}

// ── Status lifecycle ────────────────────────────────────────────────────────

export type StatusAction =
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'restore'
  | 'delete'
  | 'restore-trash'
  | 'permanently-delete'

export const STATUS_ACTIONS: StatusAction[] = [
  'publish',
  'unpublish',
  'archive',
  'restore',
  'delete',
  'restore-trash',
  'permanently-delete',
]

/** The single statuses each action is valid from, per the spec's transition table. */
const ALLOWED_FROM: Record<StatusAction, PostStatus[]> = {
  publish: ['draft'],
  unpublish: ['published'],
  archive: ['published'],
  restore: ['archived'],
  delete: ['draft', 'published', 'archived'],
  'restore-trash': ['deleted'],
  'permanently-delete': ['deleted'],
}

export interface StatusTransitionResult {
  /** Column patch to apply with `.update()`. Absent for permanently-delete (hard delete instead). */
  patch: Partial<PostRow> | null
  hardDelete: boolean
}

export class InvalidStatusTransitionError extends Error {}

/**
 * Validates `action` is applicable to `row`'s current status and returns the
 * column patch to apply. Throws InvalidStatusTransitionError (caller maps to
 * 400) for any transition not in the table, e.g. archiving a draft.
 */
export function computeStatusTransition(
  row: Pick<PostRow, 'status' | 'previous_status'>,
  action: StatusAction,
): StatusTransitionResult {
  const current = row.status
  const allowedFrom = ALLOWED_FROM[action]
  if (!allowedFrom) {
    throw new InvalidStatusTransitionError(`Unknown action '${action}'`)
  }
  if (!allowedFrom.includes(current)) {
    throw new InvalidStatusTransitionError(
      `Cannot apply action '${action}' to a post with status '${current}' (expected status in [${allowedFrom.join(', ')}])`,
    )
  }

  const nowIso = new Date().toISOString()

  switch (action) {
    case 'publish':
      return { patch: { status: 'published', published_at: nowIso, updated_at: nowIso }, hardDelete: false }
    case 'unpublish':
      return { patch: { status: 'draft', updated_at: nowIso }, hardDelete: false }
    case 'archive':
      return { patch: { status: 'archived', updated_at: nowIso }, hardDelete: false }
    case 'restore':
      return { patch: { status: 'published', updated_at: nowIso }, hardDelete: false }
    case 'delete':
      return {
        patch: { status: 'deleted', deleted_at: nowIso, previous_status: current, updated_at: nowIso },
        hardDelete: false,
      }
    case 'restore-trash': {
      // previous_status is guaranteed non-null here: the DB constraint
      // posts_deleted_has_previous_status enforces status='deleted' => previous_status is set.
      const restoredStatus = (row.previous_status ?? 'draft') as PostStatus
      return {
        patch: { status: restoredStatus, deleted_at: null, previous_status: null, updated_at: nowIso },
        hardDelete: false,
      }
    }
    case 'permanently-delete':
      return { patch: null, hardDelete: true }
  }
}
