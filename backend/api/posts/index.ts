import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../lib/cors.js'
import { requireAuth } from '../../lib/auth.js'
import { getSupabase } from '../../lib/supabase.js'
import {
  POST_KINDS,
  POST_STATUSES,
  POST_SUMMARY_COLUMNS,
  POST_TEMPLATES,
  toPostSummary,
  type PostKind,
  type PostRow,
  type PostTemplate,
} from '../../lib/posts.js'

const LIST_FILTERS = [...POST_STATUSES, 'all'] as const

async function handleList(req: VercelRequest, res: VercelResponse): Promise<void> {
  const rawStatus = req.query.status
  const statusParam = Array.isArray(rawStatus) ? rawStatus[0] : (rawStatus ?? 'all')

  if (!(LIST_FILTERS as readonly string[]).includes(statusParam)) {
    res.status(400).json({ error: `Invalid status '${statusParam}'. Expected one of: ${LIST_FILTERS.join(', ')}` })
    return
  }

  const supabase = getSupabase()
  let query = supabase.from('posts').select(POST_SUMMARY_COLUMNS).order('updated_at', { ascending: false })

  if (statusParam !== 'all') {
    query = query.eq('status', statusParam)
  }

  const { data, error } = await query
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(200).json({ posts: (data as PostRow[]).map(toPostSummary) })
}

interface CreatePostBody {
  module_id?: unknown
  kind?: unknown
  en?: unknown
  vi?: unknown
  /** The stored template to start from — its body is copied into the new post. */
  templateId?: unknown
  /** Renderer, when starting from no template at all. */
  template?: unknown
}

function formatDateLabel(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}.${month}`
}

async function handleCreate(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as CreatePostBody

  const module_id = body.module_id
  const kind = body.kind
  const en = body.en
  const vi = body.vi
  const templateId = typeof body.templateId === 'string' ? body.templateId : null
  let template = body.template ?? 'article'
  // Starting content. A template hands its body over and the post owns it from
  // then on — editing the post never touches the template it came from, and
  // editing the template never reaches back into posts already written.
  let startingBody: unknown = null

  if (typeof module_id !== 'string' || module_id.length === 0) {
    res.status(400).json({ error: 'module_id is required' })
    return
  }
  if (!(POST_KINDS as string[]).includes(kind as string)) {
    res.status(400).json({ error: `kind must be one of: ${POST_KINDS.join(', ')}` })
    return
  }
  if (typeof en !== 'string' || en.length === 0) {
    res.status(400).json({ error: 'en is required' })
    return
  }
  if (typeof vi !== 'string' || vi.length === 0) {
    res.status(400).json({ error: 'vi is required' })
    return
  }
  if (!(POST_TEMPLATES as string[]).includes(template as string)) {
    res.status(400).json({ error: `template must be one of: ${POST_TEMPLATES.join(', ')}` })
    return
  }

  const supabase = getSupabase()

  if (templateId) {
    const { data: tpl, error: tplError } = await supabase
      .from('templates')
      .select('renderer, body')
      .eq('id', templateId)
      .maybeSingle()

    if (tplError) {
      res.status(500).json({ error: tplError.message })
      return
    }
    if (!tpl) {
      res.status(400).json({ error: `Template '${templateId}' does not exist` })
      return
    }
    // The template decides the renderer — picking one and then contradicting it
    // would leave a post drawn by something its content was not written for.
    template = (tpl as { renderer: string }).renderer
    startingBody = (tpl as { body: unknown }).body ?? null
  }

  // `n` (display index) and `date_label` are NOT NULL with no DB default —
  // derive reasonable values: n = next sequence number within the module,
  // date_label = current 'YYYY.MM'.
  const { count, error: countError } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('module_id', module_id)

  if (countError) {
    res.status(500).json({ error: countError.message })
    return
  }

  const n = String((count ?? 0) + 1).padStart(2, '0')
  const date_label = formatDateLabel(new Date())

  const { data, error } = await supabase
    .from('posts')
    .insert({
      module_id: module_id,
      kind: kind as PostKind,
      en,
      vi,
      template: template as PostTemplate,
      n,
      date_label: date_label,
      sort_order: (count ?? 0) + 1,
      body: startingBody,
    })
    .select('id')
    .single()

  if (error) {
    // 23503 = foreign key violation, i.e. module_id doesn't exist.
    if (error.code === '23503') {
      res.status(400).json({ error: `Module '${module_id}' does not exist` })
      return
    }
    res.status(500).json({ error: error.message })
    return
  }

  res.status(201).json({ id: (data as { id: string }).id })
}

/**
 * PUT — reorder one module's posts.
 *
 * Takes the module's post ids in their new order and rewrites `sort_order` to
 * 1..N. Nothing else needs writing: every screen numbers a post by where it
 * sits in the list being shown, so the order alone decides what the reader
 * counts along with.
 */
async function handleReorder(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as { module_id?: unknown; order?: unknown }
  const module_id = body.module_id
  const order = body.order

  if (typeof module_id !== 'string' || module_id.length === 0) {
    res.status(400).json({ error: 'module_id is required' })
    return
  }
  if (!Array.isArray(order) || order.some((id) => typeof id !== 'string')) {
    res.status(400).json({ error: 'order must be an array of post ids' })
    return
  }

  const supabase = getSupabase()
  const nowIso = new Date().toISOString()

  for (const [i, id] of (order as string[]).entries()) {
    const { error } = await supabase
      .from('posts')
      .update({ sort_order: i + 1, updated_at: nowIso })
      .eq('id', id)
      .eq('module_id', module_id)
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
  }

  const { data, error } = await supabase
    .from('posts')
    .select(POST_SUMMARY_COLUMNS)
    .eq('module_id', module_id)
    .order('sort_order', { ascending: true })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(200).json({ posts: (data as PostRow[]).map(toPostSummary) })
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  if (req.method === 'GET') {
    await handleList(req, res)
    return
  }
  if (req.method === 'POST') {
    await handleCreate(req, res)
    return
  }
  if (req.method === 'PUT') {
    await handleReorder(req, res)
    return
  }
  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
