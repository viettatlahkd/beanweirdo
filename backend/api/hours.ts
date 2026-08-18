import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../lib/cors.js'
import { requireAuth } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'
import {
  HOUR_LOG_WRITABLE,
  TAG_SYSTEMS,
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

  const { data: kinds } = await supabase
    .from('activity_kinds')
    .select('*')
    .order('sort_order', { ascending: true })
  const rows = (kinds ?? []) as ActivityKindRow[]
  res.status(200).json({
    kinds: rows.filter((k) => k.system === 'task').map((k) => k.name),
    projects: rows.filter((k) => k.system === 'project').map((k) => k.name),
  })
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
