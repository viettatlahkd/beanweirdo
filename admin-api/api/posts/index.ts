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
  moduleId?: unknown
  kind?: unknown
  en?: unknown
  vi?: unknown
  template?: unknown
}

function formatDateLabel(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}.${month}`
}

async function handleCreate(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as CreatePostBody

  const moduleId = body.moduleId
  const kind = body.kind
  const en = body.en
  const vi = body.vi
  const template = body.template ?? 'article'

  if (typeof moduleId !== 'string' || moduleId.length === 0) {
    res.status(400).json({ error: 'moduleId is required' })
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

  // `n` (display index) and `date_label` are NOT NULL with no DB default —
  // derive reasonable values: n = next sequence number within the module,
  // date_label = current 'YYYY.MM'.
  const { count, error: countError } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('module_id', moduleId)

  if (countError) {
    res.status(500).json({ error: countError.message })
    return
  }

  const n = String((count ?? 0) + 1).padStart(2, '0')
  const dateLabel = formatDateLabel(new Date())

  const { data, error } = await supabase
    .from('posts')
    .insert({
      module_id: moduleId,
      kind: kind as PostKind,
      en,
      vi,
      template: template as PostTemplate,
      n,
      date_label: dateLabel,
    })
    .select('id')
    .single()

  if (error) {
    // 23503 = foreign key violation, i.e. moduleId doesn't exist.
    if (error.code === '23503') {
      res.status(400).json({ error: `Module '${moduleId}' does not exist` })
      return
    }
    res.status(500).json({ error: error.message })
    return
  }

  res.status(201).json({ id: (data as { id: string }).id })
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
  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
