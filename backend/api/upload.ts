import { randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../lib/cors.js'
import { requireAuth } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'

const BUCKET = 'post-images'

/**
 * Cấp một vé tải lên, không nhận lấy tệp.
 *
 * Trước đây route này nhận cả tệp: formidable ghi ra đĩa tạm, `readFile` nạp
 * cả vào bộ nhớ, rồi đẩy tiếp sang Supabase Storage. Người dùng phải chờ hết
 * lượt tải lên Vercel **rồi mới** bắt đầu lượt tải sang Supabase — hai lần thời
 * gian cho một việc, và lượt thứ hai bắt đầu từ con số không. Với ảnh chụp từ
 * điện thoại thì đó là phần lớn thời gian chờ khi đính ảnh vào bài.
 *
 * Nay máy chủ chỉ ký một vé: `createSignedUploadUrl` không chạm byte nào của
 * tệp. Trình duyệt cầm vé ấy đẩy thẳng lên Storage. Vé tự nó là giấy phép nên
 * không cần lộ thêm khoá nào ra client, và `requireAuth` vẫn là thứ quyết định
 * ai xin được vé.
 */
function extensionFor(filename: unknown, contentType: unknown): string {
  if (typeof filename === 'string') {
    const fromName = filename.match(/\.[a-zA-Z0-9]+$/)?.[0]
    if (fromName) return fromName.toLowerCase()
  }
  if (typeof contentType === 'string') {
    const fromMime = contentType.split('/')[1]
    if (fromMime) return `.${fromMime.toLowerCase()}`
  }
  return ''
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const body = (req.body ?? {}) as { filename?: unknown; contentType?: unknown }
  const path = `${randomUUID()}${extensionFor(body.filename, body.contentType)}`

  const supabase = getSupabase()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)

  if (error || !data) {
    res.status(500).json({ error: error?.message ?? 'Could not sign an upload' })
    return
  }

  // Bucket là public (migration 0004), nên địa chỉ đọc tính ra được ngay — chỗ
  // gọi cất nó vào bài mà không phải hỏi lại lần nữa sau khi tải xong.
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

  res.status(200).json({ path, token: data.token, url: pub.publicUrl })
}

export default withCors(handler)
