import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../lib/cors.js'
import { requireAuth } from '../../../lib/auth.js'
import { getSupabase } from '../../../lib/supabase.js'
import {
  computeStatusTransition,
  InvalidStatusTransitionError,
  POST_DETAIL_COLUMNS,
  STATUS_ACTIONS,
  toPostDetail,
  type PostRow,
  type StatusAction,
} from '../../../lib/posts.js'

function getId(req: VercelRequest): string | null {
  const raw = req.query.id
  const id = Array.isArray(raw) ? raw[0] : raw
  return typeof id === 'string' && id.length > 0 ? id : null
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const id = getId(req)
  if (!id) {
    res.status(400).json({ error: 'Missing post id' })
    return
  }

  const body = (req.body ?? {}) as { action?: unknown }
  const action = body.action

  if (typeof action !== 'string' || !(STATUS_ACTIONS as string[]).includes(action)) {
    res.status(400).json({ error: `action must be one of: ${STATUS_ACTIONS.join(', ')}` })
    return
  }

  const supabase = getSupabase()

  const { data: current, error: fetchError } = await supabase
    .from('posts')
    .select('id, status, previous_status')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    res.status(500).json({ error: fetchError.message })
    return
  }
  if (!current) {
    res.status(404).json({ error: `Post '${id}' not found` })
    return
  }

  let transition
  try {
    transition = computeStatusTransition(
      current as Pick<PostRow, 'status' | 'previous_status'>,
      action as StatusAction,
    )
  } catch (err) {
    if (err instanceof InvalidStatusTransitionError) {
      res.status(400).json({ error: err.message })
      return
    }
    throw err
  }

  if (transition.hardDelete) {
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', id)
    if (deleteError) {
      res.status(500).json({ error: deleteError.message })
      return
    }
    res.status(200).json({ deleted: true })
    return
  }

  const { data, error } = await supabase
    .from('posts')
    .update(transition.patch as Record<string, unknown>)
    .eq('id', id)
    .select(POST_DETAIL_COLUMNS)
    .maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Post '${id}' not found` })
    return
  }

  res.status(200).json({ post: toPostDetail(data as PostRow) })
}

export default withCors(handler)
