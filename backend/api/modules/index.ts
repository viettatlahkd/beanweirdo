import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../lib/cors.js'
import { requireAuth } from '../../lib/auth.js'
import { getSupabase } from '../../lib/supabase.js'
import { newModuleRow, toModule, type ModuleRow } from '../../lib/modules.js'

async function handleList(res: VercelResponse): Promise<void> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('modules').select('*').order('sort_order', { ascending: true })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(200).json({ modules: (data as ModuleRow[]).map(toModule) })
}

/** POST — the CMS's "+ module mới". Everything is editable straight after. */
async function handleCreate(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as { id?: unknown }
  const id = typeof body.id === 'string' && body.id.length > 0 ? body.id : `mod${Date.now()}`

  const supabase = getSupabase()
  const { data: last, error: readError } = await supabase
    .from('modules')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  if (readError) {
    res.status(500).json({ error: readError.message })
    return
  }

  const sortOrder = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 1
  const { data, error } = await supabase
    .from('modules')
    .insert(newModuleRow(id, sortOrder))
    .select('*')
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(201).json({ module: toModule(data as ModuleRow) })
}

/**
 * PUT — reorder. Takes the full id list in its new order and rewrites
 * `sort_order` to 1..N, which is what drag-and-drop in the CMS produces.
 */
async function handleReorder(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as { order?: unknown }
  const order = body.order
  if (!Array.isArray(order) || order.some((id) => typeof id !== 'string')) {
    res.status(400).json({ error: 'order must be an array of module ids' })
    return
  }

  const supabase = getSupabase()
  for (const [i, id] of (order as string[]).entries()) {
    const { error } = await supabase.from('modules').update({ sort_order: i + 1 }).eq('id', id)
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
  }

  const { data, error } = await supabase.from('modules').select('*').order('sort_order', { ascending: true })
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(200).json({ modules: (data as ModuleRow[]).map(toModule) })
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  if (req.method === 'GET') return handleList(res)
  if (req.method === 'POST') return handleCreate(req, res)
  if (req.method === 'PUT') return handleReorder(req, res)

  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
