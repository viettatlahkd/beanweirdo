import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AuthorDeleteResponse, AuthorListResponse, AuthorRef, AuthorResponse, PostAuthorsResponse } from 'api-contract'
import { getSupabase } from './supabase.js'
import { bodyObject, fail, failDb, pathId } from './http.js'
import {
  AUTHOR_COLUMNS,
  AUTHOR_REF_COLUMNS,
  isDuplicate,
  isUuid,
  parseAuthorIds,
  parseAuthorInput,
  toAuthor,
  toAuthorRef,
} from './authors.js'

/*
 * The author endpoints, hosted by endpoints that already exist.
 *
 * The Vercel plan allows 12 serverless functions per deployment, and three
 * files of their own took the backend to 15 once the portfolio landed — the
 * deploy refused outright. So they ride on `/api/tags` (as the topic tree and
 * theme tags already do) and on `/api/posts/:id`; the handlers and the
 * `api-contract` payloads are unchanged.
 */

/**
 *   GET    /api/tags?vocab=authors          every author, active first, then by name
 *   POST   /api/tags?vocab=authors          add one
 *   PATCH  /api/tags?vocab=authors&id=…     change any of name, slug, avatar, bio, active
 *   DELETE /api/tags?vocab=authors&id=…     only while no post names them
 */
export async function handleAuthors(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.query.id !== undefined) return handleAuthor(req, res)

  const supabase = getSupabase()

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('authors')
      .select(AUTHOR_COLUMNS)
      .order('active', { ascending: false })
      .order('name', { ascending: true })
    if (error) return failDb(res, error)
    const out: AuthorListResponse = { authors: (data ?? []).map(toAuthor) }
    res.status(200).json(out)
    return
  }

  if (req.method === 'POST') {
    const body = bodyObject(req)
    if (!body) return fail(res, 'invalid', 'body must be a JSON object', { field: 'body' })
    const parsed = parseAuthorInput(body, 'create')
    if (!parsed.ok) return fail(res, 'invalid', parsed.error, { field: parsed.field })

    const { data, error } = await supabase.from('authors').insert(parsed.value).select(AUTHOR_COLUMNS).single()
    if (error) {
      if (isDuplicate(error)) return fail(res, 'conflict', `slug '${parsed.value.slug}' is taken`, { field: 'slug' })
      return failDb(res, error)
    }
    const out: AuthorResponse = { author: toAuthor(data) }
    res.status(201).json(out)
    return
  }

  fail(res, 'method_not_allowed', 'Method not allowed')
}

async function handleAuthor(req: VercelRequest, res: VercelResponse): Promise<void> {

  const id = pathId(req)
  if (!isUuid(id)) return fail(res, 'invalid', 'author id must be a uuid', { field: 'id' })
  const supabase = getSupabase()

  if (req.method === 'PATCH') {
    const body = bodyObject(req)
    if (!body) return fail(res, 'invalid', 'body must be a JSON object', { field: 'body' })
    const parsed = parseAuthorInput(body, 'update')
    if (!parsed.ok) return fail(res, 'invalid', parsed.error, { field: parsed.field })

    const { data, error } = await supabase
      .from('authors')
      .update(parsed.value)
      .eq('id', id)
      .select(AUTHOR_COLUMNS)
      .maybeSingle()
    if (error) {
      if (isDuplicate(error)) return fail(res, 'conflict', `slug '${parsed.value.slug}' is taken`, { field: 'slug' })
      return failDb(res, error)
    }
    if (!data) return fail(res, 'not_found', `Author '${id}' not found`)
    const out: AuthorResponse = { author: toAuthor(data) }
    res.status(200).json(out)
    return
  }

  if (req.method === 'DELETE') {
    /*
     * Refuse while posts still name the author, and say how many.
     *
     * Deleting anyway would strip the name off published bylines with nobody
     * noticing. Turning the author off (`active: false`) is the way to retire
     * someone who has written here; delete is for a profile made by mistake.
     */
    const { count, error: countError } = await supabase
      .from('post_authors')
      .select('post_id', { count: 'exact', head: true })
      .eq('author_id', id)
    if (countError) return failDb(res, countError)
    if ((count ?? 0) > 0) {
      return fail(res, 'conflict', 'posts still name this author; turn them off instead', {
        details: { post_count: count },
      })
    }

    const { data, error } = await supabase.from('authors').delete().eq('id', id).select('id').maybeSingle()
    if (error) return failDb(res, error)
    if (!data) return fail(res, 'not_found', `Author '${id}' not found`)
    const out: AuthorDeleteResponse = { deleted: id }
    res.status(200).json(out)
    return
  }

  fail(res, 'method_not_allowed', 'Method not allowed')
}

/**
 *   PUT /api/posts/:id?part=authors   { author_ids } → the post's byline, in order
 *
 * Applies at once, published post or not, like module, order and pin: the
 * byline is who wrote the piece rather than words in it, and a picker that
 * waits for "Đăng thay đổi" before anything shows reads as broken.
 */
export async function handlePostAuthors(req: VercelRequest, res: VercelResponse): Promise<void> {

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
