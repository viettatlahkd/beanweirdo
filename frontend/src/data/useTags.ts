import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export type Tag = { id: string; label: string }

/**
 * Một bộ từ vựng cho cả trang.
 *
 * Trước đây có hai danh sách không biết nhau: bảng `tags` mà "bài mới" ghi vào,
 * và bốn dạng ghi viết cứng trong `content/notes.ts` mà thanh lọc trang Ghi
 * chép dùng. Cùng một trang web, hai thứ tiếng — nên một ghi chép và một bài
 * nói về cùng một thứ vẫn không đứng chung được ô nào.
 *
 * Đọc thẳng bằng khoá công khai, như trang vẫn đọc ghi chép: thanh lọc nằm ở
 * trang ai cũng xem được, mà `/api/tags` thì sau đăng nhập.
 */
export function useTags(): { tags: Tag[]; loading: boolean } {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    supabase
      .from('tags')
      .select('id, label')
      .order('created_at', { ascending: true })
      .then((res: { data: Tag[] | null }) => {
        if (!alive) return
        setTags(res.data ?? [])
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return { tags, loading }
}
