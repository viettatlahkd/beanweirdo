import { useEffect, useState } from 'react'
import type { AuthorRef } from 'api-contract'
import { supabase } from '../lib/supabaseClient'

/**
 * Who wrote a post, in byline order — read with the public key, like the post
 * itself. Migration 0030 lets anon read a post's authors only when it can read
 * the post, so a draft never leaks its names.
 *
 * A failed read is an empty byline, never a broken page: before 0030 is run
 * the table does not exist, and the article must still open.
 */
export function usePostAuthors(postId: string | null | undefined): AuthorRef[] {
  const [authors, setAuthors] = useState<AuthorRef[]>([])

  useEffect(() => {
    setAuthors([])
    if (!postId) return
    let alive = true
    supabase
      .from('post_authors')
      .select('position, authors(id, name, slug, avatar_url)')
      .eq('post_id', postId)
      .order('position', { ascending: true })
      .then(({ data }) => {
        if (!alive) return
        setAuthors(((data ?? []) as unknown as { authors: AuthorRef | null }[]).flatMap((r) => (r.authors ? [r.authors] : [])))
      })
    return () => {
      alive = false
    }
  }, [postId])

  return authors
}
