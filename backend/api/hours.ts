import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../lib/cors.js'
import { requireAuth } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'
import {
  HOUR_LOG_WRITABLE,
  TAG_COLUMN,
  TAG_SYSTEMS,
  UNCLASSIFIED,
  toHourLog,
  type ActivityKindRow,
  type HourLogRow,
  type TagSystem,
} from '../lib/journal.js'

/**
 * Ghi 02 — the practice log.
 *
 * One serverless function for both the logs and the kinds they're filed under:
 * the Hobby plan allows twelve, and splitting these into four routes would
 * spend a third of the budget on one screen. Kinds are addressed with
 * `?resource=kinds`, a single log with `?id=<uuid>`.
 *
 *   GET    /api/hours?from=YYYY-MM-DD   logs in the span, plus both tag systems
 *   POST   /api/hours                   add a log
 *   PATCH  /api/hours?id=…              edit one field or several
 *   DELETE /api/hours?id=…              remove a log
 *   POST   /api/hours?resource=kinds    add a tag — `system` picks which list
 *   PATCH  /api/hours?resource=kinds&name=…&system=…   rename a tag
 *   DELETE /api/hours?resource=kinds&name=…&system=…   delete a tag
 *   PATCH  /api/hours?resource=assign   move activities between tags in bulk
 */

function getParam(req: VercelRequest, key: string): string | null {
  const raw = req.query[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value.length > 0 ? value : null
}

async function handleList(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getSupabase()
  // The journal renders a rolling span; `from` keeps the payload to that span
  // instead of the whole history once there are years of it.
  const from = getParam(req, 'from')

  let query = supabase.from('hour_logs').select('*').order('date', { ascending: true })
  if (from) query = query.gte('date', from)

  const [{ data: logs, error: logsError }, { data: kinds, error: kindsError }] = await Promise.all([
    query,
    supabase.from('activity_kinds').select('*').order('sort_order', { ascending: true }),
  ])

  if (logsError || kindsError) {
    res.status(500).json({ error: (logsError ?? kindsError)!.message })
    return
  }

  const named = (system: TagSystem) =>
    (kinds as ActivityKindRow[]).filter((k) => k.system === system).map((k) => k.name)

  res.status(200).json({
    logs: (logs as HourLogRow[]).map(toHourLog),
    kinds: named('task'),
    projects: named('project'),
  })
}

async function handleCreateKind(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as { name?: unknown; system?: unknown }
  const name = body.name
  const system = (body.system ?? 'task') as TagSystem

  if (typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  if (!(TAG_SYSTEMS as readonly string[]).includes(system)) {
    res.status(400).json({ error: `system must be one of: ${TAG_SYSTEMS.join(', ')}` })
    return
  }

  const supabase = getSupabase()
  const { data: last } = await supabase
    .from('activity_kinds')
    .select('sort_order')
    .eq('system', system)
    .order('sort_order', { ascending: false })
    .limit(1)

  const { error } = await supabase
    .from('activity_kinds')
    .insert({ name: name.trim(), system, sort_order: ((last?.[0]?.sort_order as number | undefined) ?? 0) + 1 })

  // 23505 = unique violation: the kind already exists, which is not an error
  // worth surfacing — the caller wanted it to be there, and it is.
  if (error && error.code !== '23505') {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(200).json(await bothSystems())
}

/** Both tag systems as they now stand — the answer every kinds route gives. */
async function bothSystems(): Promise<{ kinds: string[]; projects: string[] }> {
  const supabase = getSupabase()
  const { data } = await supabase.from('activity_kinds').select('*').order('sort_order', { ascending: true })
  const rows = (data ?? []) as ActivityKindRow[]
  return {
    kinds: rows.filter((k) => k.system === 'task').map((k) => k.name),
    projects: rows.filter((k) => k.system === 'project').map((k) => k.name),
  }
}

/** `{ system, name }` off the query string, or null with the 400 already sent. */
function tagTarget(req: VercelRequest, res: VercelResponse): { name: string; system: TagSystem } | null {
  const name = getParam(req, 'name')
  const system = (getParam(req, 'system') ?? 'task') as TagSystem
  if (!name) {
    res.status(400).json({ error: 'name query parameter is required' })
    return null
  }
  if (!(TAG_SYSTEMS as readonly string[]).includes(system)) {
    res.status(400).json({ error: `system must be one of: ${TAG_SYSTEMS.join(', ')}` })
    return null
  }
  return { name, system }
}

/**
 * Renaming a tag is two writes with no transaction between them, so the
 * activities go first: a tag whose rename half-failed still names something,
 * where activities pointing at a tag that no longer exists name nothing. If the
 * second write fails the first is put back.
 */
async function handleRenameKind(req: VercelRequest, res: VercelResponse): Promise<void> {
  const target = tagTarget(req, res)
  if (!target) return

  const body = (req.body ?? {}) as { name?: unknown }
  const next = typeof body.name === 'string' ? body.name.trim() : ''
  if (!next) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  if (next === target.name) {
    res.status(200).json(await bothSystems())
    return
  }

  const supabase = getSupabase()
  const column = TAG_COLUMN[target.system]

  const { error: logsError } = await supabase
    .from('hour_logs')
    .update({ [column]: next })
    .eq(column, target.name)
  if (logsError) {
    res.status(500).json({ error: logsError.message })
    return
  }

  const { data: renamed, error: tagError } = await supabase
    .from('activity_kinds')
    .update({ name: next })
    .eq('name', target.name)
    .eq('system', target.system)
    .select('id')
    .maybeSingle()

  if (tagError) {
    await supabase.from('hour_logs').update({ [column]: target.name }).eq(column, next)
    res.status(500).json({ error: tagError.message })
    return
  }
  if (!renamed) {
    await supabase.from('hour_logs').update({ [column]: target.name }).eq(column, next)
    res.status(404).json({ error: `Tag '${target.name}' not found` })
    return
  }

  res.status(200).json(await bothSystems())
}

/** `[{ to, ids }]` off a body, validated. Returns null with the 400 sent. */
function readMoves(
  body: Record<string, unknown>,
  res: VercelResponse,
): Array<{ to: string | null; ids: string[] }> | null {
  const raw = body.moves
  if (raw === undefined) return []
  if (!Array.isArray(raw)) {
    res.status(400).json({ error: 'moves must be an array' })
    return null
  }
  const moves: Array<{ to: string | null; ids: string[] }> = []
  for (const entry of raw) {
    const move = (entry ?? {}) as { to?: unknown; ids?: unknown }
    if (move.to !== null && typeof move.to !== 'string') {
      res.status(400).json({ error: 'moves[].to must be a string or null' })
      return null
    }
    if (!Array.isArray(move.ids) || move.ids.some((id) => typeof id !== 'string')) {
      res.status(400).json({ error: 'moves[].ids must be an array of ids' })
      return null
    }
    if (move.ids.length > 0) moves.push({ to: move.to as string | null, ids: move.ids as string[] })
  }
  return moves
}

/** Apply `[{ to, ids }]` to one column. Returns the first error message, if any. */
async function applyMoves(
  column: 'kind' | 'project',
  moves: Array<{ to: string | null; ids: string[] }>,
): Promise<string | null> {
  const supabase = getSupabase()
  for (const move of moves) {
    // `kind` is NOT NULL — "no tag" for a task is the unclassified bucket.
    const value = move.to === null && column === 'kind' ? UNCLASSIFIED : move.to
    const { error } = await supabase
      .from('hour_logs')
      .update({ [column]: value })
      .in('id', move.ids)
    if (error) return error.message
  }
  return null
}

/**
 * Delete a tag, having decided what happens to the activities wearing it.
 *
 * The caller sends the reassignments it collected — `moves` names activities
 * by id — and `rest` catches everything still on the tag when those are done.
 * Anything left with no answer falls to the unclassified bucket rather than
 * blocking the delete or quietly losing its hours from the totals.
 */
async function handleDeleteKind(req: VercelRequest, res: VercelResponse): Promise<void> {
  const target = tagTarget(req, res)
  if (!target) return

  const body = (req.body ?? {}) as Record<string, unknown>
  const moves = readMoves(body, res)
  if (!moves) return
  if (body.rest !== undefined && body.rest !== null && typeof body.rest !== 'string') {
    res.status(400).json({ error: 'rest must be a string or null' })
    return
  }

  const supabase = getSupabase()
  const column = TAG_COLUMN[target.system]

  // Everything wearing the tag right now, including activities older than the
  // span the screen draws. This is what undo needs: without it, taking the
  // delete back would only restore the part that happened to be on screen.
  const { data: wearing, error: readError } = await supabase
    .from('hour_logs')
    .select('id')
    .eq(column, target.name)
  if (readError) {
    res.status(500).json({ error: readError.message })
    return
  }
  const affected = ((wearing ?? []) as Array<{ id: string }>).map((r) => r.id)

  const moveError = await applyMoves(column, moves)
  if (moveError) {
    res.status(500).json({ error: moveError })
    return
  }

  // Whatever still wears the tag: the caller's fallback, or the bucket.
  const rest = body.rest === undefined ? UNCLASSIFIED : (body.rest as string | null)
  const restValue = rest === null && column === 'kind' ? UNCLASSIFIED : rest
  const { error: restError } = await supabase
    .from('hour_logs')
    .update({ [column]: restValue })
    .eq(column, target.name)
  if (restError) {
    res.status(500).json({ error: restError.message })
    return
  }

  const { error } = await supabase
    .from('activity_kinds')
    .delete()
    .eq('name', target.name)
    .eq('system', target.system)
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(200).json({ ...(await bothSystems()), affected })
}

/**
 * Move activities between tags in bulk, touching no tag itself. The delete
 * flow's reassignments run inside the delete; this is how undo puts them back.
 */
async function handleAssign(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>
  const system = (body.system ?? 'task') as TagSystem
  if (!(TAG_SYSTEMS as readonly string[]).includes(system)) {
    res.status(400).json({ error: `system must be one of: ${TAG_SYSTEMS.join(', ')}` })
    return
  }
  const moves = readMoves(body, res)
  if (!moves) return

  const error = await applyMoves(TAG_COLUMN[system], moves)
  if (error) {
    res.status(500).json({ error })
    return
  }
  res.status(200).json({ moved: moves.reduce((n, m) => n + m.ids.length, 0) })
}

async function handleCreate(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>

  for (const key of ['date', 'kind', 'mins', 'at']) {
    if (body[key] === undefined || body[key] === null || body[key] === '') {
      res.status(400).json({ error: `${key} is required` })
      return
    }
  }
  if (typeof body.mins !== 'number' || body.mins <= 0) {
    res.status(400).json({ error: 'mins must be a positive number' })
    return
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('hour_logs')
    .insert({
      date: body.date,
      name: typeof body.name === 'string' ? body.name : '',
      kind: body.kind,
      project: typeof body.project === 'string' && body.project ? body.project : null,
      mins: body.mins,
      at: body.at,
      done: body.done === undefined ? true : Boolean(body.done),
    })
    .select('*')
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(201).json({ log: toHourLog(data as HourLogRow) })
}

async function handlePatch(req: VercelRequest, res: VercelResponse, id: string): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>

  const patch: Record<string, unknown> = {}
  for (const column of HOUR_LOG_WRITABLE) {
    if (Object.prototype.hasOwnProperty.call(body, column)) patch[column] = body[column]
  }
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'No editable fields in body' })
    return
  }
  if (patch.mins !== undefined && (typeof patch.mins !== 'number' || patch.mins <= 0)) {
    res.status(400).json({ error: 'mins must be a positive number' })
    return
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.from('hour_logs').update(patch).eq('id', id).select('*').maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Log '${id}' not found` })
    return
  }
  res.status(200).json({ log: toHourLog(data as HourLogRow) })
}

async function handleDelete(res: VercelResponse, id: string): Promise<void> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('hour_logs').delete().eq('id', id).select('id').maybeSingle()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: `Log '${id}' not found` })
    return
  }
  res.status(204).end()
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  const id = getParam(req, 'id')
  const resource = getParam(req, 'resource')

  if (resource === 'kinds') {
    if (req.method === 'POST') return handleCreateKind(req, res)
    if (req.method === 'PATCH') return handleRenameKind(req, res)
    if (req.method === 'DELETE') return handleDeleteKind(req, res)
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (resource === 'assign') {
    if (req.method === 'PATCH') return handleAssign(req, res)
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (req.method === 'GET') return handleList(req, res)
  if (req.method === 'POST') return handleCreate(req, res)

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    if (!id) {
      res.status(400).json({ error: 'id query parameter is required' })
      return
    }
    return req.method === 'PATCH' ? handlePatch(req, res, id) : handleDelete(res, id)
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
