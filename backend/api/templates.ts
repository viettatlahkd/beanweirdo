import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../lib/cors.js'
import { requireAuth } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'
import {
  TEMPLATE_PATCHABLE,
  TEMPLATE_SUMMARY_COLUMNS,
  toTemplate,
  type TemplateRow,
} from '../lib/templates.js'

/**
 * Templates — the stored blueprints a post can start from.
 *
 *   GET    /api/templates            the list, without bodies
 *   GET    /api/templates?id=…       one template, with its body
 *   PATCH  /api/templates?id=…       edit a stored template
 *
 * No status and no lifecycle: a template is a writing tool, not content, so
 * there is nothing here to publish or archive.
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  const raw = req.query.id
  const id = Array.isArray(raw) ? raw[0] : raw
  const supabase = getSupabase()

  if (req.method === 'GET') {
    // One template comes back whole — you are about to render or edit it.
    // The list does not, because a long-form body is 10KB nobody is reading yet.
    const query = id
      ? supabase.from('templates').select('*').eq('id', id).maybeSingle()
      : supabase.from('templates').select(TEMPLATE_SUMMARY_COLUMNS).order('sort_order', { ascending: true })

    const { data, error } = await query
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (id && !data) {
      res.status(404).json({ error: `Template '${id}' not found` })
      return
    }

    res.status(200).json(
      id
        ? { template: toTemplate(data as TemplateRow) }
        : { templates: (data as TemplateRow[]).map(toTemplate) },
    )
    return
  }

  if (req.method === 'PATCH') {
    if (!id) {
      res.status(400).json({ error: 'Missing template id' })
      return
    }
    const body = (req.body ?? {}) as Record<string, unknown>
    const patch: Record<string, unknown> = {}
    for (const { jsonKey, column } of TEMPLATE_PATCHABLE) {
      if (Object.prototype.hasOwnProperty.call(body, jsonKey)) patch[column] = body[jsonKey]
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'No editable fields in body' })
      return
    }
    patch.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('templates')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: `Template '${id}' not found` })
      return
    }
    res.status(200).json({ template: toTemplate(data as TemplateRow) })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
