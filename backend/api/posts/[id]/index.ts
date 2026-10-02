import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../lib/cors.js'
import { requireAuth } from '../../../lib/auth.js'
import { getSupabase } from '../../../lib/supabase.js'
import {
  POST_DETAIL_COLUMNS,
  POST_TEMPLATES,
  POST_VISIBILITIES,
  SLUG_RE,
  toPostDetail,
  type PostRow,
} from '../../../lib/posts.js'

type Db = ReturnType<typeof getSupabase>

/** The tag-theme ids a post wears (post_keywords, migration 0027). */
async function keywordsOf(supabase: Db, id: string): Promise<string[]> {
  const { data } = await supabase.from('post_keywords').select('keyword_id').eq('post_id', id)
  return Array.isArray(data) ? (data as { keyword_id: string }[]).map((r) => r.keyword_id) : []
}

/** Addresses this post used to have and still forwards from (post_slugs). */
async function oldSlugsOf(supabase: Db, id: string): Promise<string[]> {
  const { data } = await supabase.from('post_slugs').select('slug').eq('post_id', id)
  return Array.isArray(data) ? (data as { slug: string }[]).map((r) => r.slug) : []
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

  res.status(200).json({ post: { ...toPostDetail(data as PostRow, await keywordsOf(supabase, id)), old_slugs: await oldSlugsOf(supabase, id) } })
}

interface PatchPostBody {
  en?: unknown
  vi?: unknown
  body?: unknown
  /** Màu riêng của bài; null trả nó về theo màu module. */
  theme_color?: unknown
  hero_image_url?: unknown
  hero_caption?: unknown
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
  /** Only sensible while the body is empty — the editor enforces that. */
  template?: unknown
  /** The feature a post is still listed under until the feature layer lands. */
  module_id?: unknown
  /** Dạng bài (the `tags` vocabulary). */
  kind?: unknown
  /** A new stored address; the old one is kept in post_slugs so links keep working. */
  slug?: unknown
  /** Tag-theme ids; replaces the whole set. */
  keywords?: unknown
  /** Old addresses to stop forwarding. */
  forget_slugs?: unknown
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
  'lead',
  'pull_quote',
  'further_reading',
  'date_label',
  'sort_order',
  'pinned',
  'topic_id',
  'visibility',
  'template',
  'module_id',
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
  if (wantsSlug && (typeof body.slug !== 'string' || !SLUG_RE.test(body.slug))) {
    res.status(400).json({ error: 'slug must be lowercase letters and digits joined by hyphens' })
    return
  }
  const wantsKeywords = Object.prototype.hasOwnProperty.call(body, 'keywords')
  if (wantsKeywords && (!Array.isArray(body.keywords) || body.keywords.some((k) => typeof k !== 'string'))) {
    res.status(400).json({ error: 'keywords must be an array of keyword ids' })
    return
  }

  const forget = Array.isArray(body.forget_slugs) ? body.forget_slugs.filter((x): x is string => typeof x === 'string') : []

  if (Object.keys(patch).length === 0 && !wantsSlug && !wantsKeywords && forget.length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' })
    return
  }

  const supabase = getSupabase()

  if (wantsSlug) {
    const next = body.slug as string
    const { data: current, error: findError } = await supabase.from('posts').select('slug').eq('id', id).maybeSingle()
    if (findError) {
      res.status(500).json({ error: findError.message })
      return
    }
    if (!current) {
      res.status(404).json({ error: `Post '${id}' not found` })
      return
    }
    // An old address of another post still forwards to that post, so it is
    // not free to take — taking it would silently steal that post's links.
    const { data: held } = await supabase.from('post_slugs').select('post_id').eq('slug', next).maybeSingle()
    if (held && (held as { post_id: string }).post_id !== id) {
      res.status(409).json({ error: `slug '${next}' still forwards to another post` })
      return
    }
    const previous = (current as { slug: string | null }).slug
    if (previous !== next) {
      patch.slug = next
      if (previous) {
        const { error } = await supabase.from('post_slugs').upsert({ slug: previous, post_id: id }, { onConflict: 'slug' })
        if (error) {
          res.status(500).json({ error: error.message })
          return
        }
      }
      // Going back to an address this post used to have: it is current again,
      // not a forward.
      await supabase.from('post_slugs').delete().eq('slug', next).eq('post_id', id)
    }
  }

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

  if (forget.length > 0) {
    const { error } = await supabase.from('post_slugs').delete().eq('post_id', id).in('slug', forget)
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
  }

  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('posts')
    .update(patch)
    .eq('id', id)
    .select(POST_DETAIL_COLUMNS)
    .maybeSingle()

  if (error) {
    res.status(clientError(error.code) ?? 500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Post '${id}' not found` })
    return
  }

  res.status(200).json({ post: { ...toPostDetail(data as PostRow, await keywordsOf(supabase, id)), old_slugs: await oldSlugsOf(supabase, id) } })
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
