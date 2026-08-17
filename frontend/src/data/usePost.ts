import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { PostRow } from './usePublishedPosts'

export type UsePostResult = {
  data: PostRow | null
  loading: boolean
  error: string | null
}

/**
 * A single post by id — `posts.id` (uuid) is the only reliable stable
 * identifier right now (`slug` is null on every seeded row). Pass `null` /
 * `undefined` when there's nothing to fetch yet; the hook just sits idle.
 */
export function usePost(postId: string | null | undefined): UsePostResult {
  const [data, setData] = useState<PostRow | null>(null)
  const [loading, setLoading] = useState(Boolean(postId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!postId) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        setLoading(false)
        if (error) {
          setError(error.message)
          setData(null)
          return
        }
        setError(null)
        setData((data ?? null) as PostRow | null)
      })

    return () => {
      cancelled = true
    }
  }, [postId])

  return { data, loading, error }
}
