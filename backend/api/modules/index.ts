import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../lib/cors.js'
import { requireAuth } from '../../lib/auth.js'
import { getSupabase } from '../../lib/supabase.js'
import { toModule, type ModuleRow } from '../../lib/modules.js'

async function handleList(res: VercelResponse): Promise<void> {
  const supabase = getSupabase()
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

  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
