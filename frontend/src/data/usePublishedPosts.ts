import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export type PostKind = 'note' | 'essay' | 'ref' | 'log'
export type PostTemplate = 'article' | 'cards' | 'report' | 'longform' | 'memo'
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
  published_at: string | null
  deleted_at: string | null
  previous_status: PostStatus | null
  updated_at: string
}

export type UsePostsOptions = {
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
}

export type UsePostsResult = {
  data: PostRow[]
  loading: boolean
  error: string | null
}

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

    let query = includeArchived
      ? supabase.from('posts').select('*').in('status', ['published', 'archived'])
      : supabase.from('posts').select('*').eq('status', 'published')
    if (moduleId) query = query.eq('module_id', moduleId)

    // Thứ tự chuẩn của một module, đúng ba tầng:
    //   1. bài ghim lên trước
    //   2. vị trí người dùng tự kéo — rỗng thì xuống dưới
    //   3. bài đăng mới nhất trước
    // Người gọi truyền `orderBy` thì mới đi đường khác.
    const ordered = orderBy
      ? query.order(orderBy, { ascending })
      : query
          .order('pinned', { ascending: false })
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('published_at', { ascending: false })

    ordered.then(({ data, error }) => {
      if (cancelled) return
      setLoading(false)
      if (error) {
        setError(error.message)
        setData([])
        return
      }
      setError(null)
      setData((data ?? []) as PostRow[])
    })

    return () => {
      cancelled = true
    }
  }, [moduleId, orderBy, ascending, enabled, includeArchived])

  return { data, loading, error }
}
