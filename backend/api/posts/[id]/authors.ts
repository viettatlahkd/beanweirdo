import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AuthorRef, PostAuthorsResponse } from 'api-contract'
import { withCors } from '../../../lib/cors.js'
import { requireAuth } from '../../../lib/auth.js'
import { getSupabase } from '../../../lib/supabase.js'
import { bodyObject, fail, failDb, pathId } from '../../../lib/http.js'
import { AUTHOR_REF_COLUMNS, isUuid, parseAuthorIds, toAuthorRef } from '../../../lib/authors.js'

/**
 *   PUT /api/posts/:id/authors   { author_ids } → the post's byline, in order
 *
 * Applies at once, published post or not, like module, order and pin: the
 * byline is who wrote the piece rather than words in it, and a picker that
 * waits for "Đăng thay đổi" before anything shows reads as broken.
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return
  if (req.method !== 'PUT') return fail(res, 'method_not_allowed', 'Method not allowed')

  const postId = pathId(req)
  if (!isUuid(postId)) return fail(res, 'invalid', 'post id must be a uuid', { field: 'id' })
  const body = bodyObject(req)
  if (!body) return fail(res, 'invalid', 'body must be a JSON object', { field: 'body' })
  const parsed = parseAuthorIds(body)
  if (!parsed.ok) return fail(res, 'invalid', parsed.error, { field: parsed.field })
  const ids = parsed.value

  const supabase = getSupabase()
  const [post, current, found] = await Promise.all([
    supabase.from('posts').select('id').eq('id', postId).maybeSingle(),
    supabase.from('post_authors').select('author_id').eq('post_id', postId),
    ids.length > 0
      ? supabase.from('authors').select(`${AUTHOR_REF_COLUMNS}, active`).in('id', ids)
      : Promise.resolve({ data: [], error: null }),
  ])
  const failed = post.error ?? current.error ?? found.error
  if (failed) return failDb(res, failed)
  if (!post.data) return fail(res, 'not_found', `Post '${postId}' not found`)

  const had = new Set(((current.data ?? []) as { author_id: string }[]).map((r) => r.author_id))
  const byId = new Map(((found.data ?? []) as (AuthorRef & { active: boolean })[]).map((a) => [a.id, a]))
  for (const id of ids) {
    const author = byId.get(id)
    if (!author) return fail(res, 'invalid', `Author '${id}' not found`, { field: 'author_ids' })
    // A turned-off author keeps the posts they already have, but gets no new ones.
    if (!author.active && !had.has(id)) {
      return fail(res, 'invalid', `${author.name} is turned off`, { field: 'author_ids' })
    }
  }

  /*
   * Write the new list first, then drop who left it.
   *
   * Two statements, not one transaction. In this order a failure between them
   * leaves an extra name on the byline, which the next save fixes; the other
   * order could leave a published post with no author at all.
   */
  if (ids.length > 0) {
    const rows = ids.map((author_id, position) => ({ post_id: postId, author_id, position }))
    const { error } = await supabase.from('post_authors').upsert(rows, { onConflict: 'post_id,author_id' })
    if (error) return failDb(res, error)
  }
  const gone = [...had].filter((id) => !ids.includes(id))
  if (gone.length > 0) {
    const { error } = await supabase.from('post_authors').delete().eq('post_id', postId).in('author_id', gone)
    if (error) return failDb(res, error)
  }

  const out: PostAuthorsResponse = { authors: ids.map((id) => toAuthorRef(byId.get(id)!)) }
  res.status(200).json(out)
}

export default withCors(handler)
