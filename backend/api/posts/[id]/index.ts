import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../lib/cors.js'
import { requireAuth } from '../../../lib/auth.js'
import { getSupabase } from '../../../lib/supabase.js'
import { firstImageIn, POST_DETAIL_COLUMNS, toPostDetail, type PostRow } from '../../../lib/posts.js'

function getId(req: VercelRequest): string | null {
  const raw = req.query.id
  const id = Array.isArray(raw) ? raw[0] : raw
  return typeof id === 'string' && id.length > 0 ? id : null
}

async function handleGet(req: VercelRequest, res: VercelResponse, id: string): Promise<void> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('posts').select(POST_DETAIL_COLUMNS).eq('id', id).maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Post '${id}' not found` })
    return
  }

  res.status(200).json({ post: toPostDetail(data as PostRow) })
}

interface PatchPostBody {
  en?: unknown
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
  const returned = ['id', ...Object.keys(patch).filter((column) => column !== 'body')].join(', ')

  const supabase = getSupabase()
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
