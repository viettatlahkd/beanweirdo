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

/**
 * DELETE removes the module outright. `posts.module_id` is ON DELETE CASCADE
 * (migration 0001), so its posts go with it — the CMS only offers this on
 * modules the reader can't see yet, and the site's undo story is the ✕ being
 * one click away from a re-add, not a trash can.
 *
 * Modules filed inside it are the exception: `parent_id` is ON DELETE RESTRICT
 * (migration 0025), because a branch holds whole sub-sections of published
 * writing and one ✕ must not take them all.
 *
 * **Phép chặn ấy là của database, không phải của route này.** Trước đây route
 * đọc một lượt để đếm module con rồi mới xoá — nhưng dù không đọc thì khoá
 * ngoại vẫn từ chối y như vậy. Lượt đọc ấy không quyết định gì; nó chỉ để dịch
 * lời từ chối thành một câu nói rõ phải làm gì. Nên nay nó chạy ở **nhánh
 * hỏng**: xoá một module không có con — tức gần như mọi lần — là một câu lệnh.
 */
async function handleDelete(res: VercelResponse, id: string): Promise<void> {
  const supabase = getSupabase()

  const { data, error } = await supabase.from('modules').delete().eq('id', id).select('id').maybeSingle()

  if (error) {
    // `23503` là Postgres nói "còn thứ khác đang trỏ vào hàng này". Với bảng
    // `modules` thì chỉ có một khoá ngoại tự trỏ vào chính nó, nên nguyên nhân
    // là module con. Giờ mới đáng trả tiền cho một lượt đọc, để nói ra là mấy.
    if (error.code === '23503') {
      await explainStillHeld(res, id)
      return
    }
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Module '${id}' not found` })
    return
  }
  res.status(204).end()
}

/**
 * Câu xoá bị khoá ngoại chặn. Đếm module con để câu trả lời nói được là mấy
 * cái, đúng như trước. Chỉ chạy ở nhánh hỏng.
 *
 * Guard `42703` ("no such column") của bản cũ không còn cần: nếu database chưa
 * chạy 0025 thì không có cột `parent_id`, không có khoá ngoại nào để vi phạm,
 * nên câu xoá thành công và không bao giờ vào tới đây. Vẫn đỡ lấy phòng khi
 * đếm hỏng vì lý do khác — không đếm được thì vẫn nói ra lý do chính.
 */
async function explainStillHeld(res: VercelResponse, id: string): Promise<void> {
  const supabase = getSupabase()
  const { data: children } = await supabase.from('modules').select('id').eq('parent_id', id)

  const count = children?.length ?? 0
  res.status(409).json({
    error: count > 0
      ? `Module '${id}' still holds ${count} module(s). Move or delete them first.`
      : `Module '${id}' still holds other modules. Move or delete them first.`,
  })
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
