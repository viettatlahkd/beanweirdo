import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../lib/cors.js'
import { requireAuth } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'

/**
 * Portfolio — port pages and their design system (migration 0025).
 *
 *   GET    /api/portfolio                 every page (drafts included) + design tokens
 *   POST   /api/portfolio                 create a page
 *   PATCH  /api/portfolio?id=…            edit a page
 *   DELETE /api/portfolio?id=…            delete a page
 *   PATCH  /api/portfolio?part=design     merge tokens into the design system
 *
 * One file for both tables: the project sits exactly at the Vercel plan's cap
 * of 12 serverless functions, so one more file would fail to deploy.
 *
 * The public page does not go through here — it reads both tables directly
 * with the anon key, and RLS only exposes published pages.
 */

const DESIGN_ROW = true
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const STATUSES = ['draft', 'published', 'archived'] as const

type PageInput = {
  slug?: unknown
  title?: unknown
  intro?: unknown
  palette?: unknown
  blocks?: unknown
  status?: unknown
  sortOrder?: unknown
}

export type PortfolioPageRow = {
  id: string
  slug: string
  title: string
  intro: string
  palette: string
  blocks: unknown[]
  status: 'draft' | 'published' | 'archived'
  sort_order: number
  created_at: string
  updated_at: string
}

export function toPage(row: PortfolioPageRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    intro: row.intro,
    palette: row.palette,
    blocks: row.blocks,
    status: row.status,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  }
}

/**
 * Map the body to columns, or return an error string if a field has the wrong
 * type. Only fields that are present get checked, so a PATCH carrying a single
 * field is still valid.
 */
export function pageColumns(body: PageInput): Record<string, unknown> | string {
  const out: Record<string, unknown> = {}
  if ('slug' in body) {
    if (typeof body.slug !== 'string' || !SLUG.test(body.slug)) return 'slug chỉ gồm chữ thường, số và gạch nối'
    // /portfolio/about is the about page, so no port page may take that address.
    if (body.slug === 'about') return 'slug about đã dành cho trang About'
    out.slug = body.slug
  }
  if ('title' in body) {
    if (typeof body.title !== 'string' || !body.title.trim()) return 'title không được trống'
    out.title = body.title
  }
  if ('intro' in body) {
    if (typeof body.intro !== 'string') return 'intro phải là chuỗi'
    out.intro = body.intro
  }
  if ('palette' in body) {
    if (typeof body.palette !== 'string' || !body.palette) return 'palette phải là chuỗi'
    out.palette = body.palette
  }
  if ('blocks' in body) {
    if (!Array.isArray(body.blocks)) return 'blocks phải là mảng'
    out.blocks = body.blocks
  }
  if ('status' in body) {
    if (!STATUSES.includes(body.status as (typeof STATUSES)[number])) return 'status là draft, published hoặc archived'
    out.status = body.status
  }
  if ('sortOrder' in body) {
    if (typeof body.sortOrder !== 'number' || !Number.isInteger(body.sortOrder)) return 'sortOrder phải là số nguyên'
    out.sort_order = body.sortOrder
  }
  return out
}

function one(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  const supabase = getSupabase()
  const id = one(req.query.id)
  const part = one(req.query.part)

  if (req.method === 'GET') {
    const [pages, design] = await Promise.all([
      supabase.from('portfolio_pages').select('*').order('sort_order', { ascending: true }),
      supabase.from('portfolio_design').select('data').eq('id', DESIGN_ROW).maybeSingle(),
    ])
    const error = pages.error ?? design.error
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({
      pages: ((pages.data ?? []) as PortfolioPageRow[]).map(toPage),
      design: design.data?.data ?? {},
    })
    return
  }

  if (req.method === 'PATCH' && part === 'design') {
    const patch = req.body
    if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
      res.status(400).json({ error: 'Body phải là một object token' })
      return
    }
    const { data: current, error: readError } = await supabase
      .from('portfolio_design')
      .select('data')
      .eq('id', DESIGN_ROW)
      .maybeSingle()
    if (readError) {
      res.status(500).json({ error: readError.message })
      return
    }
    // Merge one level deep like /api/site: editing one colour in `colors` must
    // not wipe the others. `null` resets a key to its default.
    const merged: Record<string, unknown> = { ...((current?.data as Record<string, unknown>) ?? {}) }
    for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const inner = { ...((merged[key] as Record<string, unknown>) ?? {}) }
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (v === null) delete inner[k]
          else inner[k] = v
        }
        merged[key] = inner
        continue
      }
      if (value === null) delete merged[key]
      else merged[key] = value
    }
    const { data, error } = await supabase
      .from('portfolio_design')
      .upsert({ id: DESIGN_ROW, data: merged, updated_at: new Date().toISOString() })
      .select('data')
      .single()
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ design: data.data })
    return
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as PageInput
    if (!('slug' in body) || !('title' in body)) {
      res.status(400).json({ error: 'Cần slug và title' })
      return
    }
    const cols = pageColumns(body)
    if (typeof cols === 'string') {
      res.status(400).json({ error: cols })
      return
    }
    const { data, error } = await supabase.from('portfolio_pages').insert(cols).select('*').single()
    if (error) {
      res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'slug đã có trang dùng' : error.message })
      return
    }
    res.status(201).json({ page: toPage(data as PortfolioPageRow) })
    return
  }

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    if (!id) {
      res.status(400).json({ error: 'Thiếu id trang' })
      return
    }
    if (req.method === 'DELETE') {
      const { data, error } = await supabase.from('portfolio_pages').delete().eq('id', id).select('id').maybeSingle()
      if (error) {
        res.status(500).json({ error: error.message })
        return
      }
      if (!data) {
        res.status(404).json({ error: `Không có trang '${id}'` })
        return
      }
      res.status(200).json({ id })
      return
    }
    const cols = pageColumns((req.body ?? {}) as PageInput)
    if (typeof cols === 'string') {
      res.status(400).json({ error: cols })
      return
    }
    if (Object.keys(cols).length === 0) {
      res.status(400).json({ error: 'Không có trường nào để sửa' })
      return
    }
    cols.updated_at = new Date().toISOString()
    const { data, error } = await supabase.from('portfolio_pages').update(cols).eq('id', id).select('*').maybeSingle()
    if (error) {
      res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'slug đã có trang dùng' : error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: `Không có trang '${id}'` })
      return
    }
    res.status(200).json({ page: toPage(data as PortfolioPageRow) })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
