import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../lib/cors.js'
import { requireAuth } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'
import { NOTE_WRITABLE, toNote, validateNote, type NoteRow } from '../lib/journal.js'

/**
 * Ghi 01 — loose notes, written straight into the page they appear on.
 *
 * Reading is public and goes to Supabase directly with the anon key (see
 * frontend/src/data/useNotes.ts); everything here is the authoring side, so
 * every method is behind the login. One function for all of it, addressed with
 * `?id=<uuid>` — see the note about the function budget in api/hours.ts.
 *
 *   POST   /api/notes         add a note
 *   PATCH  /api/notes?id=…    edit a field
 *   DELETE /api/notes?id=…    remove it
 *   GET    /api/notes         the same list the public page reads
 */

function getId(req: VercelRequest): string | null {
  const raw = req.query.id
  const id = Array.isArray(raw) ? raw[0] : raw
  return typeof id === 'string' && id.length > 0 ? id : null
}

function collectPatch(body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const { jsonKey, column } of NOTE_WRITABLE) {
    if (Object.prototype.hasOwnProperty.call(body, jsonKey)) patch[column] = body[jsonKey]
  }
  return patch
}

async function handleList(res: VercelResponse): Promise<void> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('notes').select('*').order('d', { ascending: false })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(200).json({ notes: (data as NoteRow[]).map(toNote) })
}

/**
 * A new note starts blank and dated today — the writer types into it in place
 * rather than filling a form first (System conventions, rule 08: create the
 * empty row, then let the cursor land in it).
 */
async function handleCreate(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>
  const invalid = validateNote(body)
  if (invalid) {
    res.status(400).json({ error: invalid })
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('notes')
    .insert({
      d: typeof body.d === 'string' && body.d ? body.d : today,
      k: typeof body.k === 'string' ? body.k : 'quan sát',
      t: typeof body.t === 'string' ? body.t : '',
      b: typeof body.b === 'string' ? body.b : '',
      len: typeof body.len === 'string' ? body.len : 'ngắn',
      media_hint: typeof body.mediaHint === 'string' ? body.mediaHint : null,
      portrait: Boolean(body.portrait),
    })
    .select('*')
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(201).json({ note: toNote(data as NoteRow) })
}

async function handlePatch(req: VercelRequest, res: VercelResponse, id: string): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>
  const invalid = validateNote(body)
  if (invalid) {
    res.status(400).json({ error: invalid })
    return
  }

  const patch = collectPatch(body)
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'No editable fields in body' })
    return
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.from('notes').update(patch).eq('id', id).select('*').maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Note '${id}' not found` })
    return
  }
  res.status(200).json({ note: toNote(data as NoteRow) })
}

async function handleDelete(res: VercelResponse, id: string): Promise<void> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('notes').delete().eq('id', id).select('id').maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Note '${id}' not found` })
    return
  }
  res.status(204).end()
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  if (req.method === 'GET') return handleList(res)
  if (req.method === 'POST') return handleCreate(req, res)

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    const id = getId(req)
    if (!id) {
      res.status(400).json({ error: 'id query parameter is required' })
      return
    }
    return req.method === 'PATCH' ? handlePatch(req, res, id) : handleDelete(res, id)
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
