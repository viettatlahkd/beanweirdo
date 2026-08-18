// Row/JSON mapping + the status lifecycle transition table for `posts`.
//
// Schema source of truth: backend/supabase/migrations/0001_initial_schema.sql,
// 0002_templates_and_post_status.sql, 0005_fixed_post_templates.sql.
// Transition table source of truth:
// docs/superpowers/specs/2026-08-13-post-authoring-admin-design.md, "## Status lifecycle".

export type PostKind = 'note' | 'essay' | 'ref' | 'log'
export type PostTemplate = 'article' | 'cards' | 'report'
export type PostStatus = 'draft' | 'published' | 'archived' | 'deleted'

export const POST_KINDS: PostKind[] = ['note', 'essay', 'ref', 'log']
export const POST_TEMPLATES: PostTemplate[] = ['article', 'cards', 'report']
export const POST_STATUSES: PostStatus[] = ['draft', 'published', 'archived', 'deleted']

export interface PostRow {
  id: string
  module_id: string
  n: string
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
export const POST_SUMMARY_COLUMNS =
  'id, module_id, n, en, vi, kind, date_label, status, template, hero_image_url, sort_order, created_at, updated_at, published_at, body'

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

export interface PostSummary {
  id: string
  moduleId: string
  n: string
  en: string
  vi: string
  kind: PostKind
  dateLabel: string
  status: PostStatus
  template: PostTemplate
  heroImageUrl: string | null
  /**
   * The picture that stands for the post in a listing: its cover if it has
   * one, otherwise the first image inside it.
   */
  thumbnailUrl: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export interface PostDetail extends PostSummary {
  slug: string | null
  body: unknown | null
  heroCaption: string | null
  lead: string | null
  pullQuote: string | null
  furtherReading: string[] | null
  deletedAt: string | null
  previousStatus: string | null
}

export function toPostSummary(row: PostRow): PostSummary {
  return {
    id: row.id,
    moduleId: row.module_id,
    n: row.n,
    en: row.en,
    vi: row.vi,
    kind: row.kind,
    dateLabel: row.date_label,
    status: row.status,
    template: row.template,
    heroImageUrl: row.hero_image_url,
    thumbnailUrl: row.hero_image_url || findSrc(row.body),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  }
}

export function toPostDetail(row: PostRow): PostDetail {
  return {
    ...toPostSummary(row),
    slug: row.slug,
    body: row.body,
    heroCaption: row.hero_caption,
    lead: row.lead,
    pullQuote: row.pull_quote,
    furtherReading: row.further_reading,
    deletedAt: row.deleted_at,
    previousStatus: row.previous_status,
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
