import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { getSupabase } from './supabase.js'

/**
 * The two vocabularies of the content layer (migration 0027), served from
 * /api/tags?vocab=… — the deployment is at Vercel's twelve-function ceiling,
 * so they share the endpoint that already serves the third vocabulary
 * (`tags`, which since 0027 means dạng bài).
 *
 *   topics    the subject › topic tree a post is filed on
 *   keywords  flat theme tags, many per post
 */

type Db = ReturnType<typeof getSupabase>

/** A label as an id: lowercase ASCII words joined by hyphens. */
export function slug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export type Vocab = 'topics' | 'keywords'

export function vocabOf(req: VercelRequest): Vocab | null {
  const v = req.query.vocab
  return v === 'topics' || v === 'keywords' ? v : null
}

/** Live posts per id of one column — what each vocabulary row shows as its count. */
async function countBy(supabase: Db, table: 'posts' | 'post_keywords', column: string): Promise<Map<string, number>> {
  const query =
    table === 'posts'
      ? supabase.from('posts').select(column).neq('status', 'deleted')
      : supabase.from('post_keywords').select(column)
  const { data } = await query
  const out = new Map<string, number>()
  for (const row of (data ?? []) as unknown as Record<string, string | null>[]) {
    const key = row[column]
    if (key) out.set(key, (out.get(key) ?? 0) + 1)
  }
  return out
}

function fail(res: VercelResponse, error: { code?: string; message: string }): void {
  // P0001 is the two-level trigger; 23503 a parent that does not exist.
  const client = error.code === 'P0001' || error.code === '23503' || error.code === '23514'
  res.status(error.code === '23505' ? 409 : client ? 400 : 500).json({ error: error.message })
}

const TOPIC_FIELDS = ['title', 'intro', 'parent_id', 'visibility', 'accent', 'on_color', 'tint', 'tint2', 'image_url'] as const

export async function handleTopics(req: VercelRequest, res: VercelResponse, supabase: Db): Promise<void> {
  const id = typeof req.query.id === 'string' ? req.query.id : ''

  if (req.method === 'GET') {
    const [{ data, error }, counts] = await Promise.all([
      supabase.from('topics').select('*').order('sort_order', { ascending: true }),
      countBy(supabase, 'posts', 'topic_id'),
    ])
    if (error) return fail(res, error)
    res.status(200).json({ topics: (data ?? []).map((t) => ({ ...t, posts: counts.get((t as { id: string }).id) ?? 0 })) })
    return
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as { title?: unknown; parent_id?: unknown }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const parent_id = typeof body.parent_id === 'string' && body.parent_id ? body.parent_id : null
    const newId = slug(title)
    if (!newId) {
      res.status(400).json({ error: 'title must contain a letter or a number' })
      return
    }
    // A new node goes last among its siblings.
    const siblings = parent_id
      ? supabase.from('topics').select('sort_order').eq('parent_id', parent_id)
      : supabase.from('topics').select('sort_order').is('parent_id', null)
    const { data: sib } = await siblings
    const sort_order = Math.max(0, ...((sib ?? []) as { sort_order: number }[]).map((r) => r.sort_order)) + 1
    const { data, error } = await supabase
      .from('topics')
      .insert({ id: newId, title, parent_id, sort_order })
      .select('*')
      .single()
    if (error) return fail(res, error)
    res.status(201).json({ topic: { ...data, posts: 0 } })
    return
  }

  // PUT — one level's new order: the ids in order, sort_order rewritten 1..N.
  if (req.method === 'PUT') {
    const order = (req.body ?? {}).order
    if (!Array.isArray(order) || order.some((x) => typeof x !== 'string')) {
      res.status(400).json({ error: 'order must be an array of topic ids' })
      return
    }
    for (const [i, tid] of (order as string[]).entries()) {
      const { error } = await supabase.from('topics').update({ sort_order: i + 1 }).eq('id', tid)
      if (error) return fail(res, error)
    }
    res.status(200).json({ order })
    return
  }

  if (!id) {
    res.status(400).json({ error: 'id is required' })
    return
  }

  if (req.method === 'PATCH') {
    const body = (req.body ?? {}) as Record<string, unknown>
    const patch: Record<string, unknown> = {}
    for (const f of TOPIC_FIELDS) if (f in body) patch[f] = body[f] === '' && f !== 'title' && f !== 'intro' ? null : body[f]
    if ('title' in patch && (typeof patch.title !== 'string' || !patch.title.trim())) {
      res.status(400).json({ error: 'title is required' })
      return
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'No updatable fields provided' })
      return
    }
    // The id stays: posts point at it, and later an address will too.
    patch.updated_at = new Date().toISOString()
    const { data, error } = await supabase.from('topics').update(patch).eq('id', id).select('*').maybeSingle()
    if (error) return fail(res, error)
    if (!data) {
      res.status(404).json({ error: `Topic '${id}' not found` })
      return
    }
    res.status(200).json({ topic: data })
    return
  }

  if (req.method === 'DELETE') {
    // Refused while anything hangs on it: deleting a node must never leave a
    // post without a place, and the database refuses it too (on delete restrict).
    const [{ count: posts }, { count: children }] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('topic_id', id),
      supabase.from('topics').select('id', { count: 'exact', head: true }).eq('parent_id', id),
    ])
    if ((posts ?? 0) > 0 || (children ?? 0) > 0) {
      res.status(409).json({ error: 'topic still has posts or topics under it', posts: posts ?? 0, children: children ?? 0 })
      return
    }
    const { error } = await supabase.from('topics').delete().eq('id', id)
    if (error) return fail(res, error)
    res.status(200).json({ deleted: id })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export async function handleKeywords(req: VercelRequest, res: VercelResponse, supabase: Db): Promise<void> {
  const id = typeof req.query.id === 'string' ? req.query.id : ''

  if (req.method === 'GET') {
    const [{ data, error }, counts] = await Promise.all([
      supabase.from('keywords').select('id, label').order('created_at', { ascending: true }),
      countBy(supabase, 'post_keywords', 'keyword_id'),
    ])
    if (error) return fail(res, error)
    res.status(200).json({ keywords: (data ?? []).map((k) => ({ ...k, posts: counts.get((k as { id: string }).id) ?? 0 })) })
    return
  }

  if (req.method === 'POST') {
    const label = typeof (req.body ?? {}).label === 'string' ? (req.body as { label: string }).label.trim() : ''
    const newId = slug(label)
    if (!newId) {
      res.status(400).json({ error: 'label must contain a letter or a number' })
      return
    }
    // Typing a tag that already exists gives that tag back, like `tags` does.
    const { error } = await supabase.from('keywords').upsert({ id: newId, label }, { onConflict: 'id', ignoreDuplicates: true })
    if (error) return fail(res, error)
    const { data } = await supabase.from('keywords').select('id, label').eq('id', newId).single()
    res.status(200).json(data)
    return
  }

  if (!id) {
    res.status(400).json({ error: 'id is required' })
    return
  }

  if (req.method === 'PATCH') {
    const label = typeof (req.body ?? {}).label === 'string' ? (req.body as { label: string }).label.trim() : ''
    if (!label) {
      res.status(400).json({ error: 'label is required' })
      return
    }
    const { data, error } = await supabase.from('keywords').update({ label }).eq('id', id).select('id, label').maybeSingle()
    if (error) return fail(res, error)
    if (!data) {
      res.status(404).json({ error: `Keyword '${id}' not found` })
      return
    }
    res.status(200).json(data)
    return
  }

  // DELETE needs no "move to": a post may wear no theme tag at all, so the
  // tag simply comes off every post (post_keywords cascades). With `to`, the
  // posts wearing it take that tag instead first — merging two tags into one.
  if (req.method === 'DELETE') {
    const to = typeof (req.body ?? {}).to === 'string' ? (req.body as { to: string }).to : null
    if (to && to !== id) {
      const { data: wearing } = await supabase.from('post_keywords').select('post_id').eq('keyword_id', id)
      const rows = ((Array.isArray(wearing) ? wearing : []) as { post_id: string }[]).map((r) => ({ post_id: r.post_id, keyword_id: to }))
      if (rows.length > 0) {
        const { error: moveError } = await supabase.from('post_keywords').upsert(rows, { onConflict: 'post_id,keyword_id', ignoreDuplicates: true })
        if (moveError) return fail(res, moveError)
      }
    }
    const { error } = await supabase.from('keywords').delete().eq('id', id)
    if (error) return fail(res, error)
    res.status(200).json({ deleted: id })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
