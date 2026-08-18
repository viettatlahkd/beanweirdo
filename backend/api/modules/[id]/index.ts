import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../lib/cors.js'
import { requireAuth } from '../../../lib/auth.js'
import { getSupabase } from '../../../lib/supabase.js'
import { MODULE_LAYOUTS, MODULE_PATCHABLE, toModule, type ModuleRow } from '../../../lib/modules.js'

function getId(req: VercelRequest): string | null {
  const raw = req.query.id
  const id = Array.isArray(raw) ? raw[0] : raw
  return typeof id === 'string' && id.length > 0 ? id : null
}

async function handlePatch(req: VercelRequest, res: VercelResponse, id: string): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>

  const patch: Record<string, unknown> = {}
  for (const { jsonKey, column } of MODULE_PATCHABLE) {
    if (Object.prototype.hasOwnProperty.call(body, jsonKey)) patch[column] = body[jsonKey]
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'No editable fields in body' })
    return
  }
  if (patch.layout !== undefined && !MODULE_LAYOUTS.includes(patch.layout as never)) {
    res.status(400).json({ error: `layout must be one of: ${MODULE_LAYOUTS.join(', ')}` })
    return
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.from('modules').update(patch).eq('id', id).select('*').maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Module '${id}' not found` })
    return
  }
  res.status(200).json({ module: toModule(data as ModuleRow) })
}

/**
 * DELETE removes the module outright. `posts.module_id` is ON DELETE CASCADE
 * (migration 0001), so its posts go with it — the CMS only offers this on
 * modules the reader can't see yet, and the site's undo story is the ✕ being
 * one click away from a re-add, not a trash can.
 */
async function handleDelete(res: VercelResponse, id: string): Promise<void> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('modules').delete().eq('id', id).select('id').maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Module '${id}' not found` })
    return
  }
  res.status(204).end()
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  const id = getId(req)
  if (!id) {
    res.status(400).json({ error: 'Missing module id' })
    return
  }

  if (req.method === 'PATCH') return handlePatch(req, res, id)
  if (req.method === 'DELETE') return handleDelete(res, id)

  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
