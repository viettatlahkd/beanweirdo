import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { getSupabase } from './supabase.js'

/**
 * The feature layer (migration 0028) for the CMS's "Quản lý trang": pages,
 * listing rules and per-node overrides, served from /api/tags?vocab=… beside
 * the content layer's vocabularies — the deployment is at Vercel's twelve-
 * function ceiling.
 *
 *   GET    ?vocab=layout                        pages, overrides, rules in one go
 *   POST   ?vocab=rules                         a new rule (defaults filled by the DB)
 *   PATCH  ?vocab=rules&id=…                    change a rule
 *   POST   ?vocab=pages                         a new curated page with its own rule
 *   PATCH  ?vocab=pages&id=…                    title, presentation, copy, blocks, aliases, visibility
 *   DELETE ?vocab=pages&id=…                    a curated page and its rules
 *   PUT    ?vocab=overrides                     upsert one node's override
 *   DELETE ?vocab=overrides&type=…&node=…       drop it (and the rule it owned)
 */

type Db = ReturnType<typeof getSupabase>

const RULE_FIELDS = [
  'tier', 'nodes', 'from_page', 'include_children', 'match', 'exclude', 'kinds', 'templates',
  'group_by', 'sort', 'new_first', 'manual_order', 'pinned', 'limit_n', 'display',
] as const
const PAGE_FIELDS = ['title', 'presentation', 'copy', 'blocks', 'aliases', 'visibility'] as const
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

function pick(body: unknown, fields: readonly string[]): Record<string, unknown> {
  const b = (body ?? {}) as Record<string, unknown>
  return Object.fromEntries(fields.filter((f) => f in b).map((f) => [f, b[f]]))
}

function fail(res: VercelResponse, error: { code?: string; message: string }): void {
  // 23514 a value the table does not take, 23505 an id already used.
  res.status(error.code === '23505' ? 409 : error.code === '23514' || error.code === '22P02' ? 400 : 500).json({ error: error.message })
}

export async function handleLayout(req: VercelRequest, res: VercelResponse, supabase: Db, vocab: string): Promise<void> {
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  const now = () => new Date().toISOString()

  if (vocab === 'layout' && req.method === 'GET') {
    const [pages, overrides, rules] = await Promise.all([
      supabase.from('pages').select('*').order('created_at', { ascending: true }),
      supabase.from('page_overrides').select('*'),
      supabase.from('listing_rules').select('*'),
    ])
    const err = pages.error ?? overrides.error ?? rules.error
    if (err) return fail(res, err)
    res.status(200).json({ pages: pages.data, overrides: overrides.data, rules: rules.data })
    return
  }

  if (vocab === 'rules') {
    if (req.method === 'POST') {
      const body = pick(req.body, RULE_FIELDS)
      const { data, error } = await supabase.from('listing_rules').insert({ tier: 'topic', ...body }).select('*').single()
      if (error) return fail(res, error)
      res.status(201).json({ rule: data })
      return
    }
    if (req.method === 'PATCH' && id) {
      const patch = pick(req.body, RULE_FIELDS)
      if (Object.keys(patch).length === 0) {
        res.status(400).json({ error: 'No updatable fields provided' })
        return
      }
      const { data, error } = await supabase.from('listing_rules').update({ ...patch, updated_at: now() }).eq('id', id).select('*').maybeSingle()
      if (error) return fail(res, error)
      if (!data) {
        res.status(404).json({ error: `Rule '${id}' not found` })
        return
      }
      res.status(200).json({ rule: data })
      return
    }
  }

  if (vocab === 'pages') {
    if (req.method === 'POST') {
      const body = (req.body ?? {}) as { id?: unknown; title?: unknown }
      const pageId = typeof body.id === 'string' ? body.id : ''
      if (!SLUG.test(pageId)) {
        res.status(400).json({ error: 'id must be lowercase letters and digits joined by hyphens' })
        return
      }
      // A curated page starts with one block: everything, newest first.
      const { data: rule, error: ruleError } = await supabase.from('listing_rules').insert({ tier: 'all', sort: 'newest' }).select('id').single()
      if (ruleError) return fail(res, ruleError)
      const { data, error } = await supabase
        .from('pages')
        .insert({ id: pageId, kind: 'curated', title: typeof body.title === 'string' ? body.title : pageId, blocks: [(rule as { id: string }).id] })
        .select('*')
        .single()
      if (error) {
        await supabase.from('listing_rules').delete().eq('id', (rule as { id: string }).id)
        return fail(res, error)
      }
      res.status(201).json({ page: data, rule })
      return
    }
    if (req.method === 'PATCH' && id) {
      const patch = pick(req.body, PAGE_FIELDS)
      if (Object.keys(patch).length === 0) {
        res.status(400).json({ error: 'No updatable fields provided' })
        return
      }
      const { data, error } = await supabase.from('pages').update({ ...patch, updated_at: now() }).eq('id', id).select('*').maybeSingle()
      if (error) return fail(res, error)
      if (!data) {
        res.status(404).json({ error: `Page '${id}' not found` })
        return
      }
      res.status(200).json({ page: data })
      return
    }
    if (req.method === 'DELETE' && id) {
      const { data: page } = await supabase.from('pages').select('kind, blocks').eq('id', id).maybeSingle()
      if (!page) {
        res.status(404).json({ error: `Page '${id}' not found` })
        return
      }
      // Templates and the navigation hold up every tier page; only a page
      // someone made by hand can go.
      if ((page as { kind: string }).kind !== 'curated') {
        res.status(400).json({ error: 'only curated pages can be deleted' })
        return
      }
      const { error } = await supabase.from('pages').delete().eq('id', id)
      if (error) return fail(res, error)
      const blocks = (page as { blocks: string[] }).blocks
      if (blocks.length > 0) await supabase.from('listing_rules').delete().in('id', blocks)
      res.status(200).json({ deleted: id })
      return
    }
  }

  if (vocab === 'overrides') {
    if (req.method === 'PUT') {
      const body = (req.body ?? {}) as Record<string, unknown>
      if ((body.node_type !== 'topic' && body.node_type !== 'keyword') || typeof body.node_id !== 'string' || !body.node_id) {
        res.status(400).json({ error: 'node_type (topic | keyword) and node_id are required' })
        return
      }
      const row = { node_type: body.node_type, node_id: body.node_id, ...pick(body, ['rule_id', 'presentation', 'aliases']), updated_at: now() }
      const { data, error } = await supabase.from('page_overrides').upsert(row, { onConflict: 'node_type,node_id' }).select('*').single()
      if (error) return fail(res, error)
      res.status(200).json({ override: data })
      return
    }
    if (req.method === 'DELETE') {
      const type = req.query.type
      const node = req.query.node
      if (typeof type !== 'string' || typeof node !== 'string') {
        res.status(400).json({ error: 'type and node are required' })
        return
      }
      const { data: row } = await supabase.from('page_overrides').select('rule_id').eq('node_type', type).eq('node_id', node).maybeSingle()
      const { error } = await supabase.from('page_overrides').delete().eq('node_type', type).eq('node_id', node)
      if (error) return fail(res, error)
      // The rule was this node's alone; without the override nothing points at it.
      const ruleId = (row as { rule_id: string | null } | null)?.rule_id
      if (ruleId) await supabase.from('listing_rules').delete().eq('id', ruleId)
      res.status(200).json({ deleted: `${type}:${node}` })
      return
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
