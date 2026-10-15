import type { PostSite } from 'api-contract'

// Row/JSON mapping + the status lifecycle transition table for `posts`.
//
// Schema source of truth: backend/supabase/migrations/0001_initial_schema.sql,
// 0002_templates_and_post_status.sql, 0005_fixed_post_templates.sql.
// The transition table below is its own source of truth; the spec it came from is gone.

export type PostKind = 'note' | 'essay' | 'ref' | 'log'
export type PostTemplate = 'article' | 'cards' | 'report' | 'longform' | 'memo' | 'bitesize'
export type PostStatus = 'draft' | 'published' | 'archived' | 'deleted'

/**
 * Every template a post may be stored as.
 *
 * This list, the database's check constraint and the renderer's dispatcher all
 * have to name the same set. They drifted once — migration 0010 added longform
 * and memo, this list was not updated, and creating either through the admin
 * answered 400 for months. `templateContract.test.ts` compares all three.
 */
export const POST_TEMPLATES: PostTemplate[] = ['article', 'cards', 'report', 'longform', 'memo', 'bitesize']

/**
 * Every column `posts` actually has.
 *
 * Migration 0016 dropped `n` and warned, in its own comment, to ship the code
 * that stops writing it first. The reorder endpoint was changed; the create
 * endpoint was not, so creating any post failed with "Could not find the 'n'
 * column" — and the test suite missed it because it mocked the insert away and
 * only checked the status code.
 *
 * So the column list lives here and the endpoints' writes are checked against
 * it. The next column to go takes a test with it instead of a working feature.
 */
export const POST_COLUMNS = [
  'id',
  'module_id',
  'kind',
  'template',
  'en',
  'vi',
  'slug',
  'lead',
  'body',
  'date_label',
  'sort_order',
  'pinned',
  'status',
  'previous_status',
  'hero_image_url',
  'hero_caption',
  'plate_images',
  'thumbnail_url',
  'theme_color',
  'topic_id',
  'visibility',
  'shown_on',
  'pull_quote',
  'further_reading',
  'published_at',
  'deleted_at',
  'created_at',
  'updated_at',
] as const
export const POST_STATUSES: PostStatus[] = ['draft', 'published', 'archived', 'deleted']

/** Who may read a post (migration 0027). The narrower of post and topic wins. */
export type PostVisibility = 'public' | 'private'
export const POST_VISIBILITIES: PostVisibility[] = ['public', 'private']

/** The homes a post can appear on (0038); one store, shown where it is ticked. */
export const POST_SITES: PostSite[] = ['biz', 'bean', 'blog']

/**
 * A stored address: lowercase words joined by hyphens. Stored slugs belong to
 * published or archived posts, so they never carry the `.draft` mark.
 */
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

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
  /** Vị trí người dùng tự chọn. Rỗng nghĩa là chưa ai chọn. */
  sort_order: number | null
  /** Bài ghim luôn dẫn đầu module, bất kể phần còn lại xếp thế nào. */
  pinned: boolean
  created_at: string
  status: PostStatus
  template: PostTemplate
  hero_image_url: string | null
  /**
   * Ảnh của những ô ảnh cố định mà template đặt tên — migration 0027.
   *
   * Không phải mọi ô ảnh của bài: chỉ những ô mà dàn trang dựng sẵn và trước
   * đây không có chỗ nào để lưu. Ô nằm trong thân bài vẫn ở trong `body`.
   *
   * Tuỳ chọn vì một database chưa chạy 0027 trả lời mà không có cột này —
   * `POST_DETAIL_COLUMNS` là `*`, nên đọc vẫn chạy, chỉ ghi là không.
   */
  plate_images?: Record<string, string | null> | null
  /**
   * The first image found inside `body`, kept as a column so a listing never
   * has to read `body` to draw a 44px square. Derived, never sent by a client:
   * the two places that write `body` recompute it.
   */
  thumbnail_url: string | null
  /** Màu riêng của bài; rỗng nghĩa là theo màu module. */
  theme_color: string | null
  topic_id: string | null
  visibility: PostVisibility
  /** Which homes show it (0038). Optional: a database before 0038 has no such column. */
  shown_on?: PostSite[] | null
  published_at: string | null
  deleted_at: string | null
  previous_status: string | null
  updated_at: string
}

// `body` used to be in this list. Not because a listing shows an article, but
// because the thumbnail was computed from it on the way out — so opening
// /ad-post shipped every post's entire text to the browser to draw a row of
// 44px squares. `thumbnail_url` holds that answer now (migration note:
// docs/inbox/qa/2026-09-18-qa-39-thumbnail-url.sql) and `body` is gone from here.
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
  'id, module_id, en, vi, lead, kind, date_label, status, template, hero_image_url, thumbnail_url, theme_color, topic_id, visibility, shown_on, slug, sort_order, pinned, created_at, updated_at, published_at'

export const POST_DETAIL_COLUMNS = '*'

/**
 * The first `src` anywhere in a block tree, however the template nests them.
 *
 * Exported because it is now run when a post is *written* rather than when a
 * listing is read: `POST /api/posts` and `PATCH /api/posts/:id` put the result
 * in `posts.thumbnail_url`. One input, `body`, so there is exactly one moment
 * to recompute it — whenever `body` is written, and never otherwise.
 */
export function firstImageIn(value: unknown, depth = 0): string | null {
  if (depth > 4 || value === null || typeof value !== 'object') return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstImageIn(item, depth + 1)
      if (found) return found
    }
    return null
  }

  const obj = value as Record<string, unknown>
  if (typeof obj.src === 'string' && obj.src) return obj.src
  if (typeof obj.imageUrl === 'string' && obj.imageUrl) return obj.imageUrl

  for (const key of ['fig', 'items', 'sections', 'blocks', 'cards']) {
    const found = firstImageIn(obj[key], depth + 1)
    if (found) return found
  }
  return null
}

/**
 * Keys whose strings are addresses, ids or styling, never words a reader reads.
 * Same list as `readMinutes` in frontend/src/lib/postText.ts, so the admin list
 * and the public byline count the same minutes for one post.
 */
const NOT_PROSE = new Set(['type', 'k', 'key', 'id', 'url', 'src', 'href', 'imageUrl', 'image_url', 'tint', 'color', 'w', 's', 'h_px', 'margin', 'align', 'variant', 'kind', 'len', 'media', 'mediaHint', 'hue', 'n'])
/** Headings, captions and quote credits: counted as reading time, left out of the preview. */
const ASIDE_KEYS = new Set(['h', 'heading', 'title', 'caption', 'attribution'])
const HEADING_KINDS = new Set(['h1', 'h2', 'h3', 'h4', 'heading'])
const EXCERPT_CHARS = 180

/**
 * The opening words of a post and how long it takes to read, for the admin list.
 *
 * Computed on the server so the list still never ships `body` to the browser
 * (see `POST_SUMMARY_COLUMNS`). Bodies come in several shapes per template, so
 * this walks every string rather than knowing each shape. Headings are skipped
 * for the preview: long-form opens with an h1 that repeats the title.
 */
export function bodyPreview(body: unknown): { excerpt: string; read_minutes: number | null } {
  const prose: string[] = []
  let words = 0
  const walk = (v: unknown, key: string, heading: boolean, depth: number) => {
    if (depth > 12) return
    if (typeof v === 'string') {
      if (NOT_PROSE.has(key) || /^(https?:|data:|#)/.test(v)) return
      words += v.split(/\s+/).filter(Boolean).length
      if (!heading) prose.push(v)
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key, heading, depth + 1))
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      const isHeading = heading || HEADING_KINDS.has(String(o.k ?? o.type ?? ''))
      for (const [k, x] of Object.entries(o)) walk(x, k, isHeading || ASIDE_KEYS.has(k), depth + 1)
    }
  }
  walk(body, '', false, 0)
  const text = prose.join(' ').replace(/\*/g, '').replace(/\s+/g, ' ').trim()
  const cut = text.length <= EXCERPT_CHARS ? text : `${text.slice(0, EXCERPT_CHARS).replace(/\s+\S*$/, '')}…`
  return { excerpt: cut, read_minutes: words === 0 ? null : Math.max(1, Math.ceil(words / 200)) }
}

/**
 * What the API hands back for a post.
 *
 * The field names are the database's own. They used to be renamed to camelCase
 * on the way out, which meant the same post arrived under two different sets of
 * names depending on which door you came through — and the two sides grew two
 * adapters that then drifted apart. One shape, one set of names, end to end.
 */
interface PostSummary {
  id: string
  module_id: string
  en: string
  vi: string
  /** Câu mở đầu bài, cũng là dòng preview dưới tiêu đề ở mọi danh sách. */
  lead: string | null
  kind: PostKind
  date_label: string
  status: PostStatus
  template: PostTemplate
  hero_image_url: string | null
  /**
   * The colour this post wears. Null means it follows its module — which is
   * what almost every post does, and why the column is not filled in by
   * default: a module recoloured later should carry its posts with it.
   */
  theme_color: string | null
  /** The post's place on the topic tree (migration 0027); null until filed. */
  topic_id: string | null
  visibility: PostVisibility
  shown_on: PostSite[]
  /** The stored address; null for drafts, which are addressed by derivation. */
  slug: string | null
  /**
   * The picture that stands for the post in a listing: its cover if it has
   * one, otherwise the first image inside it.
   */
  thumbnail_url: string | null
  /** Vị trí người dùng tự chọn. Rỗng nghĩa là chưa ai chọn — xếp theo ngày đăng. */
  sort_order: number | null
  /** Bài ghim dẫn đầu module, bất kể phần còn lại xếp thế nào. */
  pinned: boolean
  created_at: string
  updated_at: string
  published_at: string | null
}

interface PostDetail extends PostSummary {
  /** Tag theme ids (post_keywords). */
  keywords: string[]
  body: unknown | null
  hero_caption: string | null
  plate_images: Record<string, string | null> | null
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
    // The listing's own preview line. Read here, not only in the detail, so a
    // list can show what a reader would see without fetching every post's body.
    lead: row.lead,
    kind: row.kind,
    date_label: row.date_label,
    status: row.status,
    template: row.template,
    hero_image_url: row.hero_image_url,
    theme_color: row.theme_color,
    topic_id: row.topic_id ?? null,
    visibility: row.visibility ?? 'public',
    shown_on: row.shown_on ?? ['blog'],
    slug: row.slug ?? null,
    /*
     * Cover first, then whatever the post has inside it.
     *
     * Only the second half is stored. `hero_image_url` is already a column of
     * its own, so folding it into `thumbnail_url` would give that column two
     * inputs and two moments where it could go stale. Composed here instead,
     * the stored value depends on `body` alone.
     */
    thumbnail_url: row.hero_image_url || row.thumbnail_url,
    sort_order: row.sort_order,
    pinned: row.pinned,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
  }
}

export function toPostDetail(row: PostRow, keywords: string[] = []): PostDetail {
  return {
    ...toPostSummary(row),
    keywords,
    body: row.body,
    hero_caption: row.hero_caption,
    // `?? null` chứ không phải `row.plate_images`: database chưa chạy 0027 thì
    // cột vắng mặt hẳn, và `undefined` đi ra JSON là mất luôn cả khoá.
    plate_images: row.plate_images ?? null,
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

/** The single statuses each action is valid from. */
export const ALLOWED_FROM: Record<StatusAction, PostStatus[]> = {
  publish: ['draft'],
  unpublish: ['published'],
  archive: ['published'],
  restore: ['archived'],
  delete: ['draft', 'published', 'archived'],
  'restore-trash': ['deleted'],
  'permanently-delete': ['deleted'],
}

/**
 * The columns an action writes, when they don't depend on the post's current
 * status — or null when they do.
 *
 * Four of the seven transitions write fixed values. The only thing that needed
 * the current row was the guard "is this action legal from where it is now",
 * and that rides in the UPDATE's own WHERE clause: no row came back means the
 * guard rejected it. `permanently-delete` writes nothing at all (it is a hard
 * delete) and is likewise one statement.
 *
 * `delete` and `restore-trash` are the two that genuinely have to read first.
 * Each copies one column into another — `previous_status` from `status` on the
 * way out, and back again on the way in — and PostgREST has no way to say
 * `set previous_status = status` without a stored function.
 */
export function fixedStatusPatch(action: StatusAction, nowIso: string): Partial<PostRow> | null {
  switch (action) {
    case 'publish':
      return { status: 'published', published_at: nowIso, updated_at: nowIso }
    case 'unpublish':
      return { status: 'draft', updated_at: nowIso }
    case 'archive':
      return { status: 'archived', updated_at: nowIso }
    case 'restore':
      return { status: 'published', updated_at: nowIso }
    default:
      return null
  }
}

interface StatusTransitionResult {
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
