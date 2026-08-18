import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../lib/cors.js'
import { requireAuth } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'

/** The single row — see backend/supabase/migrations/0007. */
const ROW_ID = true

/**
 * Site copy: the strings the Content-management screen edits.
 *
 * GET returns the stored overrides (an empty object on a fresh install — the
 * frontend supplies the defaults). PATCH shallow-merges the body into them, so
 * a screen can save one field without sending the rest. Setting a key to '' or
 * null drops it, which is how the CMS restores a default.
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  const supabase = getSupabase()

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('site_settings').select('data').eq('id', ROW_ID).maybeSingle()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ site: data?.data ?? {} })
    return
  }

  if (req.method === 'PATCH') {
    const patch = req.body
    if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
      res.status(400).json({ error: 'Body must be a JSON object of site-copy fields' })
      return
    }

    const { data: current, error: readError } = await supabase
      .from('site_settings')
      .select('data')
      .eq('id', ROW_ID)
      .maybeSingle()
    if (readError) {
      res.status(500).json({ error: readError.message })
      return
    }

    const merged: Record<string, unknown> = { ...((current?.data as Record<string, unknown>) ?? {}) }
    for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
      // Nested objects (today: `sections`) merge one level deep so renaming one
      // section doesn't clear the other two.
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = { ...((merged[key] as Record<string, unknown>) ?? {}), ...(value as object) }
        continue
      }
      if (value === '' || value === null) delete merged[key]
      else merged[key] = value
    }

    const { data, error } = await supabase
      .from('site_settings')
      .upsert({ id: ROW_ID, data: merged, updated_at: new Date().toISOString() })
      .select('data')
      .single()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ site: data.data })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
