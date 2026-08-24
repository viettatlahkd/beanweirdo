import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../lib/cors.js'
import { requireAuth } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'

/**
 * Tags — what a post is, in the owner's own words.
 *
 *   GET   /api/tags     every tag ever used, oldest first
 *   POST  /api/tags     add one
 *
 * This replaces `kind`, which was four words a programmer picked — note,
 * essay, ref, log — with no way to add a fifth short of editing a database
 * constraint. A tag is written once and offered from then on.
 *
 * The four old words were seeded as the first four tags, so nothing lost its
 * label. `posts.kind` still holds the value; it simply is not fenced any more.
 */
function slug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return
  const supabase = getSupabase()

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('tags')
      .select('id, label')
      .order('created_at', { ascending: true })

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ tags: data })
    return
  }

  if (req.method === 'POST') {
    const label = typeof (req.body ?? {}).label === 'string' ? (req.body as { label: string }).label.trim() : ''
    if (!label) {
      res.status(400).json({ error: 'label is required' })
      return
    }

    const id = slug(label)
    if (!id) {
      res.status(400).json({ error: 'label must contain a letter or a number' })
      return
    }

    // Writing the same tag twice is not an error — it is someone typing a word
    // they have used before, and they should get the tag back either way.
    const { error } = await supabase.from('tags').upsert({ id, label }, { onConflict: 'id' })
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ id, label })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
