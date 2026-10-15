import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../lib/cors.js'
import { requireAuth } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'

/**
 * Portfolio — the port's design system (migration 0025).
 *
 *   GET    /api/portfolio                 the design tokens
 *   PATCH  /api/portfolio?part=design     merge tokens into the design system
 *
 * Port pages themselves are nodes of site 'port' since 0032, served with the
 * blog's at /api/tags?vocab=nodes. The public page reads the tokens directly
 * with the anon key.
 */

const DESIGN_ROW = true

function one(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  const supabase = getSupabase()
  const part = one(req.query.part)

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('portfolio_design').select('data').eq('id', DESIGN_ROW).maybeSingle()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ design: data?.data ?? {} })
    return
  }

  if (req.method === 'PATCH' && part === 'design') {
    const patch = req.body
    if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
      res.status(400).json({ error: 'Body phải là một object token' })
      return
    }
    const { data: current, error: readError } = await supabase
      .from('portfolio_design')
      .select('data')
      .eq('id', DESIGN_ROW)
      .maybeSingle()
    if (readError) {
      res.status(500).json({ error: readError.message })
      return
    }
    // Merge one level deep like /api/site: editing one colour in `colors` must
    // not wipe the others. `null` resets a key to its default.
    const merged: Record<string, unknown> = { ...((current?.data as Record<string, unknown>) ?? {}) }
    for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const inner = { ...((merged[key] as Record<string, unknown>) ?? {}) }
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (v === null) delete inner[k]
          else inner[k] = v
        }
        merged[key] = inner
        continue
      }
      if (value === null) delete merged[key]
      else merged[key] = value
    }
    const { data, error } = await supabase
      .from('portfolio_design')
      .upsert({ id: DESIGN_ROW, data: merged, updated_at: new Date().toISOString() })
      .select('data')
      .single()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ design: data.data })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
