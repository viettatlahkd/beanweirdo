import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../lib/cors.js'
import { requireAuth } from '../../../lib/auth.js'
import { getSupabase } from '../../../lib/supabase.js'
import {
  canReparent,
  MODULE_LAYOUTS,
  MODULE_PATCHABLE,
  type ParentedRow,
} from '../../../lib/modules.js'

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

  /*
   * Filing a module inside another one is the one edit that can break the
   * table of contents rather than just change it: a loop leaves a branch no
   * walk can climb out of, and the foreign key cannot see one coming.
   *
   * The whole tree has to be read to answer it — there are a handful of rows,
   * and the alternative is finding out from a page that will not render.
   */
  if (Object.prototype.hasOwnProperty.call(patch, 'parent_id')) {
    const raw = patch.parent_id
    if (raw !== null && typeof raw !== 'string') {
      res.status(400).json({ error: 'parent_id must be a module id or null' })
      return
    }
    // An empty string is what a cleared <select> sends; it means "no parent",
    // not a module whose id is the empty string.
    const parentId = raw === null || raw === '' ? null : raw
    patch.parent_id = parentId

    const { data: tree, error: treeError } = await supabase.from('modules').select('id, parent_id')
    if (treeError) {
      res.status(500).json({ error: treeError.message })
      return
    }

    const verdict = canReparent((tree ?? []) as ParentedRow[], id, parentId)
    if (!verdict.ok) {
      res.status(400).json({ error: verdict.reason })
      return
    }
  }

  /*
   * Trả về đúng những cột lần sửa này ghi, cộng `id` — không phải cả bản ghi.
   *
   * Một module có hơn 30 cột: bảy đường dẫn ảnh, `feature_cells`, và mấy đoạn
   * mô tả dài. `select('*')` gửi tất cả về chỉ để báo lại một giá trị người
   * gọi vừa đưa lên. Không chỗ nào đọc giá trị ấy: `Cms.patchModule` đặt state
   * lạc quan trước rồi mới gọi, và bỏ qua thứ trả về.
   *
   * Không đi qua `toModule` nữa vì không còn cả hàng để chuyển. Phép chuyển ấy
   * vốn là ánh xạ một-một, trừ `parent_id ?? null` và `kind ?? 'normal'` —
   * hai giá trị mà lần sửa này chỉ ghi khi người gọi đã tự nói ra.
   */
  const returned = ['id', ...Object.keys(patch)].join(', ')

  const { data, error } = await supabase.from('modules').update(patch).eq('id', id).select(returned).maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Module '${id}' not found` })
    return
  }
  res.status(200).json({ module: data })
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  const id = getId(req)
  if (!id) {
    res.status(400).json({ error: 'Missing module id' })
    return
  }

  if (req.method === 'PATCH') return handlePatch(req, res, id)

  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
