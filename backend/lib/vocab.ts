import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { getSupabase } from './supabase.js'

/**
 * The two vocabularies of the content layer (migrations 0027, 0032), served from
 * /api/tags?vocab=… — the deployment is at Vercel's twelve-function ceiling,
 * so they share the endpoint that already serves the third vocabulary
 * (`tags`, which since 0027 means dạng bài).
 *
 *   nodes     every page of every site (blog topic tree, port pages)
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

type Vocab = 'nodes' | 'keywords'

export function vocabOf(req: VercelRequest): Vocab | null {
  const v = req.query.vocab
  return v === 'nodes' || v === 'keywords' ? v : null
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
  // P0001 is the no-cycle trigger (0031); 23503 a parent that does not exist.
  const client = error.code === 'P0001' || error.code === '23503' || error.code === '23514'
  res.status(error.code === '23505' ? 409 : client ? 400 : 500).json({ error: error.message })
}

const SITES = ['blog', 'port'] as const
const STATUSES = ['draft', 'published', 'archived'] as const
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * Words a port page's slug may not take. Pages live at /biz/<slug> and
 * /bean/<slug>, but their old root addresses (/<slug>) still forward there, so
 * a slug must not shadow a root word; and the blog's old addresses under
 * /bean/ (/bean/details…) win over a bean page of the same name.
 */
const RESERVED_SLUGS = ['about', 'portfolio', 'practice', 'ad', 'admin', 'post', 'module', 'tag', 'muc-luc', 'ghi', 'details', 'biz', 'bean', 'journal', 'p']

const NULLABLE = ['parent_id', 'look', 'accent', 'on_color', 'tint', 'tint2', 'image_url'] as const

/**
 * The body's editable fields as columns, or why one is wrong. Only fields that
 * are present get checked, so a PATCH of one field stays valid.
 */
export function nodeColumns(body: Record<string, unknown>, site: string): Record<string, unknown> | string {
  const out: Record<string, unknown> = {}
  if ('title' in body) {
    if (typeof body.title !== 'string' || !body.title.trim()) return 'title is required'
    out.title = body.title.trim()
  }
  if ('intro' in body) {
    if (typeof body.intro !== 'string') return 'intro must be a string'
    out.intro = body.intro
  }
  if ('slug' in body) {
    if (typeof body.slug !== 'string' || !SLUG.test(body.slug)) return 'slug chỉ gồm chữ thường, số và gạch nối'
    if (site === 'port' && (RESERVED_SLUGS.includes(body.slug) || body.slug.startsWith('ad-')))
      return `slug ${body.slug} đã dành cho một trang khác của site`
    out.slug = body.slug
  }
  if ('blocks' in body) {
    if (!Array.isArray(body.blocks)) return 'blocks must be an array'
    out.blocks = body.blocks
  }
  if ('status' in body) {
    if (!STATUSES.includes(body.status as (typeof STATUSES)[number])) return 'status is draft, published or archived'
    out.status = body.status
  }
  for (const f of NULLABLE) if (f in body) out[f] = body[f] === '' ? null : body[f]
  return out
}

export async function handleNodes(req: VercelRequest, res: VercelResponse, supabase: Db): Promise<void> {
  const id = typeof req.query.id === 'string' ? req.query.id : ''

  if (req.method === 'GET') {
    const site = typeof req.query.site === 'string' ? req.query.site : ''
    const all = supabase.from('nodes').select('*').order('sort_order', { ascending: true })
    const [{ data, error }, counts] = await Promise.all([site ? all.eq('site', site) : all, countBy(supabase, 'posts', 'topic_id')])
    if (error) return fail(res, error)
    res.status(200).json({ nodes: (data ?? []).map((t) => ({ ...t, posts: counts.get((t as { id: string }).id) ?? 0 })) })
    return
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as Record<string, unknown>
    const site = body.site
    if (!SITES.includes(site as (typeof SITES)[number])) {
      res.status(400).json({ error: 'site is blog or port' })
      return
    }
    const cols = nodeColumns({ slug: slug(typeof body.title === 'string' ? body.title : ''), ...body }, site as string)
    if (typeof cols === 'string' || !cols.title) {
      res.status(400).json({ error: typeof cols === 'string' ? cols : 'title is required' })
      return
    }
    const parent_id = (cols.parent_id as string | null | undefined) ?? null
    // A new node goes last among its siblings.
    const siblings = supabase.from('nodes').select('sort_order').eq('site', site as string)
    const { data: sib } = await (parent_id ? siblings.eq('parent_id', parent_id) : siblings.is('parent_id', null))
    const sort_order = Math.max(0, ...((sib ?? []) as { sort_order: number }[]).map((r) => r.sort_order)) + 1
    // The id is the address word when it is free across every site; posts and
    // links point at it and it never changes, while the slug may.
    const { count } = await supabase.from('nodes').select('id', { count: 'exact', head: true }).eq('id', cols.slug as string)
    const newId = count ? `${site}-${cols.slug}` : (cols.slug as string)
    const { data, error } = await supabase
      .from('nodes')
      .insert({ ...cols, id: newId, site, parent_id, sort_order })
      .select('*')
      .single()
    if (error) return fail(res, error)
    res.status(201).json({ node: { ...data, posts: 0 } })
    return
  }

  // PUT — one level's new order: the ids in order, sort_order rewritten 1..N.
  if (req.method === 'PUT') {
    const order = (req.body ?? {}).order
    if (!Array.isArray(order) || order.some((x) => typeof x !== 'string')) {
      res.status(400).json({ error: 'order must be an array of node ids' })
      return
    }
    for (const [i, nid] of (order as string[]).entries()) {
      const { error } = await supabase.from('nodes').update({ sort_order: i + 1 }).eq('id', nid)
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
    const { data: current } = await supabase.from('nodes').select('site').eq('id', id).maybeSingle()
    if (!current) {
      res.status(404).json({ error: `Node '${id}' not found` })
      return
    }
    const patch = nodeColumns((req.body ?? {}) as Record<string, unknown>, (current as { site: string }).site)
    if (typeof patch === 'string') {
      res.status(400).json({ error: patch })
      return
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'No updatable fields provided' })
      return
    }
    patch.updated_at = new Date().toISOString()
    const { data, error } = await supabase.from('nodes').update(patch).eq('id', id).select('*').maybeSingle()
    if (error) return fail(res, error)
    if (!data) {
      res.status(404).json({ error: `Node '${id}' not found` })
      return
    }
    res.status(200).json({ node: data })
    return
  }

  if (req.method === 'DELETE') {
    // Refused while anything hangs on it: deleting a node must never leave a
    // post without a place, and the database refuses it too (on delete restrict).
    const [{ count: posts }, { count: children }] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('topic_id', id),
      supabase.from('nodes').select('id', { count: 'exact', head: true }).eq('parent_id', id),
    ])
    if ((posts ?? 0) > 0 || (children ?? 0) > 0) {
      res.status(409).json({ error: 'node still has posts or nodes under it', posts: posts ?? 0, children: children ?? 0 })
      return
    }
    const { error } = await supabase.from('nodes').delete().eq('id', id)
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
      // `*` rather than naming `color`, so the list still loads before migration 0033 adds it.
      supabase.from('keywords').select('*').order('created_at', { ascending: true }),
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
    const { data } = await supabase.from('keywords').select('id, label, color').eq('id', newId).single()
    res.status(200).json(data)
    return
  }

  if (!id) {
    res.status(400).json({ error: 'id is required' })
    return
  }

  if (req.method === 'PATCH') {
    // A rename, a colour, or both; a null colour hands the tag back its automatic one.
    const body = (req.body ?? {}) as { label?: unknown; color?: unknown }
    const patch: { label?: string; color?: string | null } = {}
    if (typeof body.label === 'string' && body.label.trim()) patch.label = body.label.trim()
    if (body.color === null || (typeof body.color === 'string' && /^#[0-9a-f]{6}$/i.test(body.color))) patch.color = body.color as string | null
    if (!Object.keys(patch).length) {
      res.status(400).json({ error: 'label or color (#rrggbb | null) is required' })
      return
    }
    const { data, error } = await supabase.from('keywords').update(patch).eq('id', id).select('id, label, color').maybeSingle()
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
