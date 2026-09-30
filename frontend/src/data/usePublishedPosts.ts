import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { PostTemplate } from '../content/templates'

export type PostKind = 'note' | 'essay' | 'ref' | 'log'
export type { PostTemplate }
export type PostStatus = 'draft' | 'published' | 'archived' | 'deleted'

/**
 * A row from the public `posts` table — see backend/supabase/migrations/0001,
 * 0002 and 0005. `body`'s real shape depends on `template` (SectionData[] for
 * 'article' — see packages/post-renderer/src/types.ts) and is null for every
 * post that's still a title/blurb stub (that's most of them right now).
 */
export type PostRow = {
  id: string
  module_id: string
  en: string
  vi: string
  kind: PostKind
  date_label: string
  slug: string | null
  body: unknown | null
  hero_caption: string | null
  lead: string | null
  pull_quote: string | null
  further_reading: string[] | null
  /** Vị trí người dùng tự chọn. Rỗng nghĩa là chưa ai chọn. */
  sort_order: number | null
  /** Bài ghim dẫn đầu module. */
  pinned: boolean
  created_at: string
  status: PostStatus
  template: PostTemplate
  hero_image_url: string | null
  /** Màu riêng của bài; rỗng nghĩa là theo màu module. */
  theme_color: string | null
  /**
   * Tấm ảnh đầu tiên nằm trong thân bài, giữ sẵn thành cột để một danh sách
   * không phải kéo `body` về mới vẽ được ô ảnh. Xem
   * docs/inbox/qa/2026-09-19-qa-42-trang-cong-khai.md.
   */
  thumbnail_url: string | null
  published_at: string | null
  deleted_at: string | null
  previous_status: PostStatus | null
  updated_at: string
}

type UsePostsOptions = {
  /** Restrict to one module's posts. Omit to fetch across every module. */
  moduleId?: string
  /**
   * Include archived rows alongside published ones.
   *
   * Only the Archive screen wants this: archived posts stay listed there as a
   * record of what exists, but they are not part of the site's reading list and
   * every other listing must leave them out.
   */
  includeArchived?: boolean
  /**
   * Chỉ dùng khi cần một thứ tự khác thứ tự chuẩn của module. Bỏ trống thì
   * dùng thứ tự chuẩn: bài ghim trước, rồi vị trí người dùng chọn, rồi ngày
   * đăng mới nhất.
   */
  orderBy?: 'sort_order' | 'date_label' | 'created_at'
  ascending?: boolean
  /** Set false to skip the fetch entirely (e.g. while a dependency isn't ready yet). Defaults to true. */
  enabled?: boolean
  /**
   * Kéo cả `body` về. Mặc định **không**.
   *
   * `body` là toàn bộ nội dung một bài. Một danh sách cần tiêu đề, ngày và một
   * tấm ảnh — nên mặc định là không lấy nó, và `thumbnail_url` trả lời hộ câu
   * hỏi về ảnh. Đúng một màn cần bật: trang Ghi, nơi bài mở ra ngay tại chỗ
   * thay vì sang trang riêng (`screens/Notes.tsx` → `OpenedPost`).
   *
   * Một bài đọc riêng lẻ thì đã có `usePost`, và nó vẫn lấy cả hàng.
   */
  withBody?: boolean
}

type UsePostsResult = {
  data: PostRow[]
  loading: boolean
  error: string | null
}

/**
 * Mọi cột của `posts` **trừ `body`**.
 *
 * Trước đây chỗ này là `select('*')`, nghĩa là mở bất cứ trang nào của site
 * cũng tải toàn bộ nội dung của mọi bài đã đăng — thanh bên gọi hook này không
 * kèm `moduleId`, nên nó kéo cả site về trên mỗi lần vẽ. Cái duy nhất nặng
 * trong một hàng là `body`; phần còn lại là vài chuỗi ngắn, nên liệt kê hết
 * rồi bỏ đúng một cột là bản sửa ít rủi ro nhất.
 *
 * Danh sách này phải khớp với các cột thật của bảng — đối chiếu
 * `backend/lib/posts.ts` → `POST_COLUMNS`. Viết nguyên một chuỗi vì PostgREST
 * nhận chuỗi, và không có cú pháp "tất cả trừ một cột".
 */
const LIST_COLUMNS =
  'id, module_id, kind, template, en, vi, slug, lead, date_label, sort_order, pinned, status, previous_status, hero_image_url, hero_caption, theme_color, thumbnail_url, pull_quote, further_reading, published_at, deleted_at, created_at, updated_at'

/**
 * Published posts only — `archived` rows are anon-readable at the RLS layer
 * for direct-link access (see migration 0003) but are deliberately excluded
 * here at the query level, matching the design spec: listings only ever show
 * 'published'.
 */
export function usePublishedPosts(options: UsePostsOptions = {}): UsePostsResult {
  const {
    moduleId,
    orderBy,
    ascending = true,
    enabled = true,
    includeArchived = false,
    withBody = false,
  } = options
  const [data, setData] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setData([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)

    const columns = withBody ? '*' : LIST_COLUMNS
    let query = includeArchived
      ? supabase.from('posts').select(columns).in('status', ['published', 'archived'])
      : supabase.from('posts').select(columns).eq('status', 'published')
    if (moduleId) query = query.eq('module_id', moduleId)

    // Thứ tự chuẩn của một module, đúng ba tầng:
    //   1. bài ghim lên trước
    //   2. vị trí người dùng tự kéo — rỗng thì xuống dưới
    //   3. bài đăng mới nhất trước
    //   4. hoà thì xét ngày hiện trên mặt bài — một loạt bài đăng cùng một
    //      lượt có chung dấu thời gian tới từng giây, và khi đó thứ duy nhất
    //      còn phân biệt chúng là cái ngày người đọc nhìn thấy.
    // Người gọi truyền `orderBy` thì mới đi đường khác.
    // Giữ khớp với `lib/postOrder.ts`, nơi CMS sắp cùng một danh sách.
    //
    // Every date column says `nullsFirst: false` because Postgres puts NULL
    // FIRST in a descending sort. A post published without a `published_at`
    // (seeded rows, e.g. "taste modality: sơn la") therefore led Ghi 01 as if
    // pinned, whatever the pin said. `comparePosts` in the CMS already sorts
    // a missing date last; this makes the site agree.
    const ordered = orderBy
      ? query.order(orderBy, { ascending, nullsFirst: false })
      : query
          .order('pinned', { ascending: false })
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('date_label', { ascending: false })

    ordered.then(({ data, error }) => {
      if (cancelled) return
      setLoading(false)
      if (error) {
        setError(error.message)
        setData([])
        return
      }
      setError(null)
      /*
       * Qua `unknown` vì kiểu sinh sẵn của supabase-js đọc danh sách cột ngay
       * trong chuỗi truyền cho `.select()`, và nó không theo nổi một chuỗi
       * chọn lúc chạy. `PostRow` ở file này vốn viết tay chứ không sinh ra từ
       * schema, nên phép ép này không làm mất thứ gì đang được kiểm — thứ giữ
       * cho `LIST_COLUMNS` khớp với bảng là comment trên nó và
       * `backend/scripts/verify-schema.mjs`, không phải chỗ này.
       */
      setData((data ?? []) as unknown as PostRow[])
    })

    return () => {
      cancelled = true
    }
  }, [moduleId, orderBy, ascending, enabled, includeArchived, withBody])

  return { data, loading, error }
}
