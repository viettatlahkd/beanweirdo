import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../lib/cors.js'
import { requireAuth } from '../../lib/auth.js'
import { getSupabase } from '../../lib/supabase.js'
import {
  firstImageIn,
  POST_STATUSES,
  POST_SUMMARY_COLUMNS,
  POST_TEMPLATES,
  toPostSummary,
  type PostKind,
  type PostRow,
  type PostTemplate,
} from '../../lib/posts.js'
import { slug } from '../../lib/tags.js'

const LIST_FILTERS = [...POST_STATUSES, 'all'] as const

async function handleList(req: VercelRequest, res: VercelResponse): Promise<void> {
  const rawStatus = req.query.status
  const statusParam = Array.isArray(rawStatus) ? rawStatus[0] : (rawStatus ?? 'all')

  if (!(LIST_FILTERS as readonly string[]).includes(statusParam)) {
    res.status(400).json({ error: `Invalid status '${statusParam}'. Expected one of: ${LIST_FILTERS.join(', ')}` })
    return
  }

  const supabase = getSupabase()
  let query = supabase.from('posts').select(POST_SUMMARY_COLUMNS).order('updated_at', { ascending: false })

  if (statusParam !== 'all') {
    query = query.eq('status', statusParam)
  }

  const { data, error } = await query
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(200).json({ posts: (data as PostRow[]).map(toPostSummary) })
}

interface CreatePostBody {
  module_id?: unknown
  /** An existing tag's id. Ignored when `kindLabel` is sent. */
  kind?: unknown
  /**
   * A tag as the owner typed it, which this route writes down for them.
   *
   * "Bài mới" used to be two calls: POST /api/tags to get an id, then POST
   * /api/posts carrying it. Two calls from a browser is two preflights and two
   * cold starts before the editor can even open, for a screen whose whole job
   * is "start writing". The label comes along with the post now and the id is
   * derived from it, so the wizard is one call.
   */
  kindLabel?: unknown
  en?: unknown
  vi?: unknown
  /** The stored template to start from — its body is copied into the new post. */
  templateId?: unknown
  /** Renderer, when starting from no template at all. */
  template?: unknown
  /**
   * An existing post to copy. Its body, renderer and lead come across; the new
   * post is a draft of its own from then on, and editing either leaves the
   * other alone.
   */
  fromPostId?: unknown
  /**
   * The colour this post wears. Absent means it follows its module, which is
   * what almost every post does — see migration 0021.
   */
  theme_color?: unknown
}

/** Six hex digits, or nothing. The value ends up in a CSS property. */
const HEX = /^#[0-9A-Fa-f]{6}$/

function formatDateLabel(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}.${month}`
}

async function handleCreate(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as CreatePostBody

  const module_id = body.module_id
  const kindLabel = typeof body.kindLabel === 'string' ? body.kindLabel.trim() : ''
  // A label sent by the caller wins: it is what the owner actually typed.
  const kind = kindLabel ? slug(kindLabel) : body.kind
  const en = body.en
  const vi = body.vi
  const templateId = typeof body.templateId === 'string' ? body.templateId : null
  const fromPostId = typeof body.fromPostId === 'string' ? body.fromPostId : null
  let template = body.template ?? 'article'
  // Starting content. A template hands its body over and the post owns it from
  // then on — editing the post never touches the template it came from, and
  // editing the template never reaches back into posts already written.
  let startingBody: unknown = null
  /** The rest of a copied post's content, when this is a copy. */
  let copied: Record<string, unknown> | null = null

  if (typeof module_id !== 'string' || module_id.length === 0) {
    res.status(400).json({ error: 'module_id is required' })
    return
  }
  /*
   * `kind` holds a tag now. It was four words fenced by a database constraint —
   * note, essay, ref, log — with no way to add a fifth, and migration 0020 took
   * the fence down. What is left to check is that there is something there.
   */
  if (typeof kind !== 'string' || kind.length === 0) {
    res.status(400).json({
      error: kindLabel ? 'kindLabel must contain a letter or a number' : 'kind is required',
    })
    return
  }

  if (typeof en !== 'string' || en.length === 0) {
    res.status(400).json({ error: 'en is required' })
    return
  }
  /*
   * A description is optional. `en` and `vi` were named for two languages and
   * both were required, which meant a post could not exist until it had been
   * written about twice — in particular languages. `en` is the title and it has
   * to say something; `vi` is a line under it and often does not.
   */
  if (typeof vi !== 'string') {
    res.status(400).json({ error: 'vi must be a string' })
    return
  }

  const theme_color = body.theme_color == null || body.theme_color === '' ? null : body.theme_color
  if (theme_color !== null && (typeof theme_color !== 'string' || !HEX.test(theme_color))) {
    res.status(400).json({ error: 'theme_color must be a colour like #C25C7C' })
    return
  }

  if (!(POST_TEMPLATES as string[]).includes(template as string)) {
    res.status(400).json({ error: `template must be one of: ${POST_TEMPLATES.join(', ')}` })
    return
  }

  if (templateId && fromPostId) {
    res.status(400).json({ error: 'Pass either templateId or fromPostId, not both' })
    return
  }

  const supabase = getSupabase()

  /*
   * Ghi tag xuống song song với ghi bài.
   *
   * `posts.kind` không có khoá ngoại trỏ sang `tags` (migration 0020 chỉ bỏ
   * ràng buộc bốn chữ đi, cột vẫn là text thường), và `id` của tag tính được
   * ngay tại chỗ từ nhãn — nên bài không phải đợi tag ghi xong. Hai câu đi
   * cùng lúc, và `upsert` khiến việc gõ lại một chữ đã dùng không phải là lỗi.
   */
  const tagWrite = kindLabel
    ? supabase.from('tags').upsert({ id: kind, label: kindLabel }, { onConflict: 'id' })
    : null

  /*
   * Copying a post takes its content, not its place in the world. Status,
   * pinning, publication date and order stay behind: a copy is a draft nobody
   * has published or positioned yet, and inheriting any of that would put a
   * post on the site that no one decided to put there.
   */
  if (fromPostId) {
    const { data: src, error: srcError } = await supabase
      .from('posts')
      .select('template, body, lead, hero_image_url, hero_caption, pull_quote, further_reading')
      .eq('id', fromPostId)
      .maybeSingle()

    if (srcError) {
      res.status(500).json({ error: srcError.message })
      return
    }
    if (!src) {
      res.status(400).json({ error: `Post '${fromPostId}' does not exist` })
      return
    }
    const row = src as { template: string; body: unknown }
    template = row.template
    startingBody = row.body ?? null
    copied = src as Record<string, unknown>
  }

  if (templateId) {
    const { data: tpl, error: tplError } = await supabase
      .from('templates')
      .select('renderer, body')
      .eq('id', templateId)
      .maybeSingle()

    if (tplError) {
      res.status(500).json({ error: tplError.message })
      return
    }
    if (!tpl) {
      res.status(400).json({ error: `Template '${templateId}' does not exist` })
      return
    }
    // The template decides the renderer — picking one and then contradicting it
    // would leave a post drawn by something its content was not written for.
    template = (tpl as { renderer: string }).renderer
    startingBody = (tpl as { body: unknown }).body ?? null
  }

  // `date_label` is NOT NULL with no DB default, so derive one: 'YYYY.MM' now.
  //
  // `sort_order` is deliberately left null. It means "the owner put this here",
  // and nobody has: order falls to `published_at`, which is what a new post
  // should follow until someone drags it somewhere. Writing a number here would
  // make every post look hand-placed and so make the real ones indistinguishable.
  const insert = supabase
    .from('posts')
    .insert({
      module_id: module_id,
      kind: kind as PostKind,
      en,
      vi,
      template: template as PostTemplate,
      date_label: formatDateLabel(new Date()),
      sort_order: null,
      body: startingBody,
      // Derived from the body being written, in the same statement that writes
      // it. A template or a copied post can arrive with pictures already in it.
      thumbnail_url: firstImageIn(startingBody),
      lead: copied?.lead ?? null,
      theme_color,
      hero_image_url: copied?.hero_image_url ?? null,
      hero_caption: copied?.hero_caption ?? null,
      pull_quote: copied?.pull_quote ?? null,
      further_reading: copied?.further_reading ?? null,
    })
    .select('id')
    .single()

  /*
   * Hai câu đi cùng lúc, thật sự.
   *
   * Builder của supabase-js chỉ gửi request lúc nó được `then` — nên dựng câu
   * lệnh ra biến rồi `await` lần lượt vẫn là nối tiếp. `Promise.all` gọi `then`
   * của cả hai trong cùng một nhịp, đó mới là thứ khiến chúng chồng lên nhau.
   */
  const [{ data, error }, tagResult] = await Promise.all([
    insert,
    tagWrite ?? Promise.resolve({ error: null }),
  ])

  if (tagResult?.error) {
    res.status(500).json({ error: tagResult.error.message })
    return
  }

  if (error) {
    // 23503 = foreign key violation, i.e. module_id doesn't exist.
    if (error.code === '23503') {
      res.status(400).json({ error: `Module '${module_id}' does not exist` })
      return
    }
    res.status(500).json({ error: error.message })
    return
  }

  res.status(201).json({ id: (data as { id: string }).id })
}

/**
 * PUT — reorder one module's posts.
 *
 * Takes the module's post ids in their new order and rewrites `sort_order` to
 * 1..N. Nothing else needs writing: every screen numbers a post by where it
 * sits in the list being shown, so the order alone decides what the reader
 * counts along with.
 */
async function handleReorder(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as { module_id?: unknown; order?: unknown }
  const module_id = body.module_id
  const order = body.order

  if (typeof module_id !== 'string' || module_id.length === 0) {
    res.status(400).json({ error: 'module_id is required' })
    return
  }
  if (!Array.isArray(order) || order.some((id) => typeof id !== 'string')) {
    res.status(400).json({ error: 'order must be an array of post ids' })
    return
  }

  const supabase = getSupabase()
  const nowIso = new Date().toISOString()

  /*
   * The `await` used to sit inside the loop, so reordering ten posts was ten
   * round trips waiting on each other before the select below could even start.
   * They do not depend on one another — each writes its own row — so they go
   * together. Still N statements, but N in flight instead of N in a queue.
   */
  const writes = await Promise.all(
    (order as string[]).map((id, i) =>
      supabase
        .from('posts')
        .update({ sort_order: i + 1, updated_at: nowIso })
        .eq('id', id)
        .eq('module_id', module_id),
    ),
  )
  const failed = writes.find((w) => w.error)
  if (failed?.error) {
    res.status(500).json({ error: failed.error.message })
    return
  }

  const { data, error } = await supabase
    .from('posts')
    .select(POST_SUMMARY_COLUMNS)
    .eq('module_id', module_id)
    .order('sort_order', { ascending: true })

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(200).json({ posts: (data as PostRow[]).map(toPostSummary) })
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return

  if (req.method === 'GET') {
    await handleList(req, res)
    return
  }
  if (req.method === 'POST') {
    await handleCreate(req, res)
    return
  }
  if (req.method === 'PUT') {
    await handleReorder(req, res)
    return
  }
  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
