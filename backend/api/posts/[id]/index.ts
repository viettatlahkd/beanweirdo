import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../lib/cors.js'
import { requireAuth } from '../../../lib/auth.js'
import { getSupabase } from '../../../lib/supabase.js'
import { POST_DETAIL_COLUMNS, toPostDetail, type PostRow } from '../../../lib/posts.js'

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
  heroImageUrl?: unknown
  heroCaption?: unknown
  lead?: unknown
  pullQuote?: unknown
  furtherReading?: unknown
  /** The CMS's entry rows edit the display number and date label in place. */
  n?: unknown
  dateLabel?: unknown
  sortOrder?: unknown
}

const PATCHABLE: Array<{ jsonKey: keyof PatchPostBody; column: keyof PostRow }> = [
  { jsonKey: 'en', column: 'en' },
  { jsonKey: 'vi', column: 'vi' },
  { jsonKey: 'body', column: 'body' },
  { jsonKey: 'heroImageUrl', column: 'hero_image_url' },
  { jsonKey: 'heroCaption', column: 'hero_caption' },
  { jsonKey: 'lead', column: 'lead' },
  { jsonKey: 'pullQuote', column: 'pull_quote' },
  { jsonKey: 'furtherReading', column: 'further_reading' },
  { jsonKey: 'dateLabel', column: 'date_label' },
  { jsonKey: 'sortOrder', column: 'sort_order' },
]

async function handlePatch(req: VercelRequest, res: VercelResponse, id: string): Promise<void> {
  const body = (req.body ?? {}) as PatchPostBody

  const patch: Record<string, unknown> = {}
  for (const { jsonKey, column } of PATCHABLE) {
    if (Object.prototype.hasOwnProperty.call(body, jsonKey)) {
      patch[column] = body[jsonKey]
    }
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' })
    return
  }

  patch.updated_at = new Date().toISOString()

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('posts')
    .update(patch)
    .eq('id', id)
    .select(POST_DETAIL_COLUMNS)
    .maybeSingle()

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
