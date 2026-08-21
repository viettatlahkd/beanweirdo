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
  sort_order: number
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
    orderBy = 'sort_order',
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

    query.order(orderBy, { ascending }).then(({ data, error }) => {
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
