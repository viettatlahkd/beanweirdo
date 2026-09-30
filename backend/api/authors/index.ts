import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AuthorListResponse, AuthorResponse } from 'api-contract'
import { withCors } from '../../lib/cors.js'
import { requireAuth } from '../../lib/auth.js'
import { getSupabase } from '../../lib/supabase.js'
import { bodyObject, fail, failDb } from '../../lib/http.js'
import { AUTHOR_COLUMNS, isDuplicate, parseAuthorInput, toAuthor } from '../../lib/authors.js'

/**
 * The people who write on the site — see `api-contract/authors` for the
 * payloads.
 *
 *   GET   /api/authors     every author, active first, then by name
 *   POST  /api/authors     add one
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return
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

export default withCors(handler)
