import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../lib/cors.js'
import { requireAuth } from '../../../lib/auth.js'
import { getSupabase } from '../../../lib/supabase.js'
import {
  ALLOWED_FROM,
  computeStatusTransition,
  fixedStatusPatch,
  InvalidStatusTransitionError,
  STATUS_ACTIONS,
  type PostRow,
  type StatusAction,
} from '../../../lib/posts.js'
import { foldDraft } from '../../../lib/drafts.js'

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
  const allowedFrom = ALLOWED_FROM[action as StatusAction]
  const nowIso = new Date().toISOString()

  /*
   * Đổi trạng thái là **một** câu lệnh, không phải đọc rồi mới ghi.
   *
   * Thứ duy nhất cần lượt đọc kia là câu hỏi "bài đang ở trạng thái nào, hành
   * động này có hợp lệ từ đó không" — mà câu hỏi ấy đi được vào chính mệnh đề
   * `WHERE` của câu ghi. Không có dòng nào trả về thì hoặc bài không tồn tại,
   * hoặc nó đang ở một trạng thái mà hành động này không áp được; chỉ lúc ấy
   * mới đáng trả tiền cho một lượt đọc để nói rõ là cái nào.
   *
   * Hai hành động không đi lối này: `delete` và `restore-trash` chép cột này
   * sang cột kia (`previous_status` ↔ `status`), và PostgREST không nói được
   * `set previous_status = status` nếu không có stored function.
   */
  if (action === 'permanently-delete') {
    const { data, error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .in('status', allowedFrom)
      .select('id')
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      await explainMiss(supabase, res, id, action as StatusAction, allowedFrom)
      return
    }
    res.status(200).json({ deleted: true })
    return
  }

  /*
   * Publish và gỡ đăng đều mang theo bản nháp của bài đã đăng (migration 0028).
   *
   * Publish trên một bài **đã đăng** là "đăng các thay đổi": chép bản nháp vào
   * `posts`, giữ nguyên `published_at` — ngày đăng là ngày bài lên trang lần
   * đầu, không phải lần sửa gần nhất. Gỡ đăng cũng gộp bản nháp vào trước:
   * bài về nháp thì màn sửa lại ghi thẳng vào `posts`, và những gì đang chờ
   * không được mất ở đó.
   */
  if (action === 'publish' || action === 'unpublish') {
    const folded = await foldDraft(supabase, id, nowIso)
    if (folded.error) {
      res.status(500).json({ error: (folded.error as { message?: string }).message ?? 'draft publish failed' })
      return
    }
    if (folded.known && folded.status === null) {
      res.status(404).json({ error: `Post '${id}' not found` })
      return
    }
    // Already live: the fold was the whole of it, one round trip.
    if (action === 'publish' && folded.status === 'published') {
      res.status(200).json({ post: { id, status: 'published' }, applied: folded.applied })
      return
    }
  }

  const fixed = fixedStatusPatch(action as StatusAction, nowIso)
  if (fixed) {
    const { data, error } = await supabase
      .from('posts')
      .update(fixed as Record<string, unknown>)
      .eq('id', id)
      .in('status', allowedFrom)
      .select(['id', ...Object.keys(fixed)].join(', '))
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!data) {
      await explainMiss(supabase, res, id, action as StatusAction, allowedFrom)
      return
    }
    res.status(200).json({ post: data })
    return
  }

  /*
   * `delete` và `restore-trash`: hai cái phải đọc trước, vì giá trị chúng ghi
   * lấy từ chính hàng đó.
   */
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

  const patch = transition.patch as Record<string, unknown>
  const { data, error } = await supabase
    .from('posts')
    .update(patch)
    .eq('id', id)
    .select(['id', ...Object.keys(patch)].join(', '))
    .maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Post '${id}' not found` })
    return
  }

  res.status(200).json({ post: data })
}

/**
 * Câu ghi không khớp dòng nào. Đọc một lượt để nói đúng lý do — 404 vì không có
 * bài ấy, hay 400 vì bài đang ở trạng thái hành động này không áp được.
 *
 * Đây là lượt đọc duy nhất còn lại, và nó chỉ chạy ở nhánh hỏng.
 */
async function explainMiss(
  supabase: ReturnType<typeof getSupabase>,
  res: VercelResponse,
  id: string,
  action: StatusAction,
  allowedFrom: readonly string[],
): Promise<void> {
  const { data } = await supabase.from('posts').select('status').eq('id', id).maybeSingle()
  if (!data) {
    res.status(404).json({ error: `Post '${id}' not found` })
    return
  }
  const current = (data as { status: string }).status
  res.status(400).json({
    error: `Cannot apply action '${action}' to a post with status '${current}' (expected status in [${allowedFrom.join(', ')}])`,
  })
}

export default withCors(handler)
