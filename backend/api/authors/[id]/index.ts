import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AuthorDeleteResponse, AuthorResponse } from 'api-contract'
import { withCors } from '../../../lib/cors.js'
import { requireAuth } from '../../../lib/auth.js'
import { getSupabase } from '../../../lib/supabase.js'
import { bodyObject, fail, failDb, pathId } from '../../../lib/http.js'
import { AUTHOR_COLUMNS, isDuplicate, isUuid, parseAuthorInput, toAuthor } from '../../../lib/authors.js'

/**
 *   PATCH   /api/authors/:id   change any of name, slug, avatar, bio, active
 *   DELETE  /api/authors/:id   only while no post names them
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return
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

export default withCors(handler)
