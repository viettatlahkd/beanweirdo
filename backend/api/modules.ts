import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../lib/cors.js'
import { requireAuth } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'

interface ModuleRow {
  id: string
  title: string
  accent: string
  on_color: string
  tint: string
  tint2: string
  layout: 'band' | 'specimen' | 'sequence'
  concept: string
  blurb: string
  long_desc: string
  treatment: string
  layout_note: string
  shot1: string
  shot2: string
  shot3: string
  sort_order: number
}

function toModule(row: ModuleRow) {
  return {
    id: row.id,
    title: row.title,
    accent: row.accent,
    onColor: row.on_color,
    tint: row.tint,
    tint2: row.tint2,
    layout: row.layout,
    concept: row.concept,
    blurb: row.blurb,
    longDesc: row.long_desc,
    treatment: row.treatment,
    layoutNote: row.layout_note,
    shot1: row.shot1,
    shot2: row.shot2,
    shot3: row.shot3,
    sortOrder: row.sort_order,
  }
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.from('modules').select('*').order('sort_order', { ascending: true })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(200).json({ modules: (data as ModuleRow[]).map(toModule) })
}

export default withCors(handler)
