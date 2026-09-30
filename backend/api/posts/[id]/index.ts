import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AuthorRef } from 'api-contract'
import { withCors } from '../../../lib/cors.js'
import { requireAuth } from '../../../lib/auth.js'
import { getSupabase } from '../../../lib/supabase.js'
import { firstImageIn, POST_DETAIL_COLUMNS, toPostDetail, type PostRow } from '../../../lib/posts.js'
import { readDraft, splitDraftPatch, stageDraft } from '../../../lib/drafts.js'
import { AUTHOR_REF_COLUMNS, isMissingAuthorTables, toAuthorRef } from '../../../lib/authors.js'

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

  const post = toPostDetail({ ...(data as PostRow), ...(pending.data ?? {}) } as PostRow)
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
] as const satisfies readonly (keyof PatchPostBody & keyof PostRow)[]

async function handlePatch(req: VercelRequest, res: VercelResponse, id: string): Promise<void> {
  const body = (req.body ?? {}) as PatchPostBody

  const patch: Record<string, unknown> = {}
    for (const field of PATCHABLE) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        patch[field] = body[field]
      }
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' })
    return
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
  const supabase = getSupabase()

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
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Post '${id}' not found` })
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
