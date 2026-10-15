import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AuthorRef } from 'api-contract'
import { withCors } from '../../../lib/cors.js'
import { requireAuth } from '../../../lib/auth.js'
import { getSupabase } from '../../../lib/supabase.js'
import {
  firstImageIn,
  POST_DETAIL_COLUMNS,
  POST_TEMPLATES,
  POST_SITES,
  POST_VISIBILITIES,
  SLUG_RE,
  toPostDetail,
  type PostRow,
} from '../../../lib/posts.js'
import { readDraft, splitDraftPatch, stageDraft } from '../../../lib/drafts.js'
import { AUTHOR_REF_COLUMNS, isMissingAuthorTables, toAuthorRef } from '../../../lib/authors.js'
import { handlePostAuthors } from '../../../lib/authorsApi.js'

type Db = ReturnType<typeof getSupabase>

/** The tag-theme ids a post wears (post_keywords, migration 0027). */
async function keywordsOf(supabase: Db, id: string): Promise<string[]> {
  const { data } = await supabase.from('post_keywords').select('keyword_id').eq('post_id', id)
  return Array.isArray(data) ? (data as { keyword_id: string }[]).map((r) => r.keyword_id) : []
}

/** Postgres errors a client caused, mapped to the status that says so. */
function clientError(code: string | undefined): number | null {
  if (code === '23505') return 409 // unique: an address another post holds
  if (code === '23503' || code === '23514' || code === 'P0001') return 400 // missing topic/module, bad value, trigger
  return null
}

function getId(req: VercelRequest): string | null {
  const raw = req.query.id
  const id = Array.isArray(raw) ? raw[0] : raw
  return typeof id === 'string' && id.length > 0 ? id : null
}

/**
 * The post as the editor should see it: the published row with its pending
 * edits laid over it, and `has_draft` saying whether there are any.
 *
 * This route is behind auth and only the admin reads it — the editor and the
 * admin preview — so showing the unpublished version here is the point. The
 * public site reads `posts` directly and never sees `post_drafts`.
 */
async function handleGet(req: VercelRequest, res: VercelResponse, id: string): Promise<void> {
  const supabase = getSupabase()
  const [{ data, error }, pending, byline] = await Promise.all([
    supabase.from('posts').select(POST_DETAIL_COLUMNS).eq('id', id).maybeSingle(),
    readDraft(supabase, id),
    supabase
      .from('post_authors')
      .select(`position, authors(${AUTHOR_REF_COLUMNS})`)
      .eq('post_id', id)
      .order('position', { ascending: true }),
  ])

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Post '${id}' not found` })
    return
  }
  if (pending.error) {
    res.status(500).json({ error: (pending.error as { message?: string }).message ?? 'draft read failed' })
    return
  }

  // Before migration 0030 there is no byline to read, and the editor must
  // still open; any other failure is a real one.
  if (byline.error && !isMissingAuthorTables(byline.error)) {
    res.status(500).json({ error: byline.error.message })
    return
  }
  const authors = ((byline.data ?? []) as unknown as { authors: AuthorRef }[]).map((r) => toAuthorRef(r.authors))

  const keywords = await keywordsOf(supabase, id)
  const post = toPostDetail({ ...(data as PostRow), ...(pending.data ?? {}) } as PostRow, keywords)
  res.status(200).json({ post: { ...post, has_draft: pending.data !== null, authors } })
}

interface PatchPostBody {
  en?: unknown
  /** Chuyển bài sang module khác — xem `handlePatch`. */
  module_id?: unknown
  vi?: unknown
  body?: unknown
  /** Màu riêng của bài; null trả nó về theo màu module. */
  theme_color?: unknown
  hero_image_url?: unknown
  hero_caption?: unknown
  /** Ảnh của các ô ảnh cố định do template đặt tên — migration 0027. */
  plate_images?: unknown
  lead?: unknown
  pull_quote?: unknown
  further_reading?: unknown
  date_label?: unknown
  /** A hand-picked position; null hands the post back to date order. */
  sort_order?: unknown
  pinned?: unknown
  /** Place on the topic tree; must name an existing topic. */
  topic_id?: unknown
  visibility?: unknown
  /** The homes that show the post (0038); any of biz, bean, blog, or none. */
  shown_on?: unknown
  /** Only sensible while the body is empty — the editor enforces that. */
  template?: unknown
  /** Dạng bài (the `tags` vocabulary). */
  kind?: unknown
  /**
   * An address typed by hand, or null to go back to the one the title makes.
   * The old address is not kept: the owner (2026-10-15) wants a link no post
   * answers to gone, not forwarding.
   */
  slug?: unknown
  /** Tag-theme ids; replaces the whole set. */
  keywords?: unknown
}

/**
 * The fields a client may change. Once the API stopped renaming columns these
 * became the column names themselves, so there is nothing left to map — the
 * list is just a gate saying which columns are writable.
 */
const PATCHABLE = [
  'en',
  'module_id',
  'vi',
  'body',
  'theme_color',
  'hero_image_url',
  'hero_caption',
  'plate_images',
  'lead',
  'pull_quote',
  'further_reading',
  'date_label',
  'sort_order',
  'pinned',
  'topic_id',
  'visibility',
  'shown_on',
  'template',
  'kind',
] as const satisfies readonly (keyof PatchPostBody & keyof PostRow)[]

async function handlePatch(req: VercelRequest, res: VercelResponse, id: string): Promise<void> {
  const body = (req.body ?? {}) as PatchPostBody

  const patch: Record<string, unknown> = {}
  for (const field of PATCHABLE) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      patch[field] = body[field]
    }
  }

  if ('visibility' in patch && !(POST_VISIBILITIES as unknown[]).includes(patch.visibility)) {
    res.status(400).json({ error: `visibility must be one of: ${POST_VISIBILITIES.join(', ')}` })
    return
  }
  if ('shown_on' in patch) {
    const on = patch.shown_on
    if (!Array.isArray(on) || on.some((s) => !(POST_SITES as unknown[]).includes(s))) {
      res.status(400).json({ error: `shown_on must be a list of: ${POST_SITES.join(', ')}` })
      return
    }
    // One order, no repeats, so the stored list compares equal however the ticks were clicked.
    patch.shown_on = POST_SITES.filter((s) => on.includes(s))
  }
  if ('template' in patch && !(POST_TEMPLATES as unknown[]).includes(patch.template)) {
    res.status(400).json({ error: `template must be one of: ${POST_TEMPLATES.join(', ')}` })
    return
  }
  for (const field of ['module_id', 'kind'] as const) {
    if (field in patch && (typeof patch[field] !== 'string' || !patch[field])) {
      res.status(400).json({ error: `${field} must be a non-empty string` })
      return
    }
  }
  if ('topic_id' in patch && patch.topic_id !== null && typeof patch.topic_id !== 'string') {
    res.status(400).json({ error: 'topic_id must be a string or null' })
    return
  }

  const wantsSlug = Object.prototype.hasOwnProperty.call(body, 'slug')
  if (wantsSlug && body.slug !== null && (typeof body.slug !== 'string' || !SLUG_RE.test(body.slug))) {
    res.status(400).json({ error: 'slug must be lowercase letters and digits joined by hyphens' })
    return
  }
  const wantsKeywords = Object.prototype.hasOwnProperty.call(body, 'keywords')
  if (wantsKeywords && (!Array.isArray(body.keywords) || body.keywords.some((k) => typeof k !== 'string'))) {
    res.status(400).json({ error: 'keywords must be an array of keyword ids' })
    return
  }

  if (Object.keys(patch).length === 0 && !wantsSlug && !wantsKeywords) {
    res.status(400).json({ error: 'No updatable fields provided' })
    return
  }

  const supabase = getSupabase()

  // A clash with another post's address is the unique index's to refuse (409).
  if (wantsSlug) patch.slug = body.slug as string | null

  if (wantsKeywords) {
    const ids = [...new Set(body.keywords as string[])]
    const { error: clearError } = await supabase.from('post_keywords').delete().eq('post_id', id)
    if (clearError) {
      res.status(500).json({ error: clearError.message })
      return
    }
    if (ids.length > 0) {
      const { error } = await supabase.from('post_keywords').insert(ids.map((keyword_id) => ({ post_id: id, keyword_id })))
      if (error) {
        res.status(clientError(error.code) ?? 500).json({ error: error.message })
        return
      }
    }
  }

  patch.updated_at = new Date().toISOString()

  /*
   * Chuyển module thì bỏ vị trí tự chọn, trừ khi lượt vá này tự đặt lại nó.
   *
   * `sort_order` là 1..N **trong một module** (xem `handleReorder`), nên mang
   * số 3 của module cũ sang module mới là chen vào giữa một dãy chẳng liên
   * quan, và đụng đúng bài đang giữ số 3 ở đó. Trả về null là trả bài về xếp
   * theo ngày ở nhà mới, rồi chủ site kéo nếu muốn.
   */
  if (
    Object.prototype.hasOwnProperty.call(patch, 'module_id') &&
    !Object.prototype.hasOwnProperty.call(patch, 'sort_order')
  ) {
    patch.sort_order = null
  }

  /*
   * `thumbnail_url` is derived, so it is written here and nowhere else.
   *
   * It is not in PATCHABLE on purpose: a client cannot set it, and it cannot
   * drift, because the only thing it depends on is `body` and this is the only
   * route that changes `body` after a post exists. Recomputed from the incoming
   * value rather than read back, so this stays one statement.
   */
  if (Object.prototype.hasOwnProperty.call(patch, 'body')) {
    patch.thumbnail_url = firstImageIn(patch.body)
  }

  /*
   * Answer with the columns this PATCH wrote, and never with `body`.
   *
   * This used to select POST_DETAIL_COLUMNS, which is `*`. The editor autosaves
   * on every blur, so renaming one heading in a longform piece sent the whole
   * body up and then pulled the whole body back down — to tell the caller a
   * value it had just supplied.
   *
   * Nothing reads the response. Every caller of `updatePost` sets its own state
   * first and ignores what comes back: Editor's `applyPatch`, `writeBody` and
   * `step`, `Cms.patchPost`, and the pin button in `PostsPanel`. `id` is here so
   * the shape still names which post answered.
   */
  /*
   * Bài đã đăng: sửa nội dung chỉ là lưu nháp.
   *
   * Chủ site: "nếu không bấm publish thì coi như chỉ là auto lưu nháp".
   * Nội dung đi vào `post_drafts` và chờ Publish (`status.ts`); phần xếp đặt
   * — module, thứ tự, ghim — vẫn áp ngay, xem `DRAFT_FIELDS`. Bài chưa đăng
   * thì ghi thẳng như trước: nó chưa lên trang nên không có gì để giữ lại.
   */
  const { content } = splitDraftPatch(patch)
  if (Object.keys(content).length > 0) {
    // `thumbnail_url` rides with `body` into the draft so Publish copies both.
    if (Object.prototype.hasOwnProperty.call(patch, 'thumbnail_url')) content.thumbnail_url = patch.thumbnail_url
    const staged = await stageDraft(supabase, id, content, patch.updated_at as string)
    if (staged.error) {
      res.status(500).json({ error: (staged.error as { message?: string }).message ?? 'draft write failed' })
      return
    }
    if (staged.status === null) {
      res.status(404).json({ error: `Post '${id}' not found` })
      return
    }
    if (staged.status === 'published') {
      for (const key of Object.keys(content)) delete patch[key]
      if (Object.keys(patch).some((key) => key !== 'updated_at')) {
        const { error: liveError } = await supabase.from('posts').update(patch).eq('id', id)
        if (liveError) {
          res.status(500).json({ error: liveError.message })
          return
        }
      }
      res.status(200).json({ post: { id, has_draft: true } })
      return
    }
  }

  const returned = ['id', ...Object.keys(patch).filter((column) => column !== 'body')].join(', ')

  const { data, error } = await supabase
    .from('posts')
    .update(patch)
    .eq('id', id)
    .select(returned)
    .maybeSingle()

  if (error) {
    res.status(clientError(error.code) ?? 500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Post '${id}' not found` })
    return
  }

  // Changing the address or the tags answers with the whole post, because the
  // editor reads back `slug` and `keywords`; every other patch answers with
  // only the columns it wrote (see above).
  if (wantsSlug || wantsKeywords) {
    const { data: full } = await supabase.from('posts').select(POST_DETAIL_COLUMNS).eq('id', id).maybeSingle()
    res.status(200).json({ post: toPostDetail(full as PostRow, await keywordsOf(supabase, id)) })
    return
  }
  res.status(200).json({ post: data })
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  const id = getId(req)
  if (!id) {
    res.status(400).json({ error: 'Missing post id' })
    return
  }

  // The byline lives here rather than in a function of its own: the plan caps
  // the backend at 12 functions (see lib/authorsApi.ts).
  if (req.query.part === 'authors') return handlePostAuthors(req, res)
  if (req.method === 'GET') {
    await handleGet(req, res, id)
    return
  }
  if (req.method === 'PATCH') {
    await handlePatch(req, res, id)
    return
  }
  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
