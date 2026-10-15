import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../lib/cors.js'
import { requireAuth } from '../../lib/auth.js'
import { getSupabase } from '../../lib/supabase.js'
import {
  bodyPreview,
  firstImageIn,
  POST_STATUSES,
  POST_SUMMARY_COLUMNS,
  POST_TEMPLATES,
  toPostSummary,
  type PostKind,
  type PostRow,
  type PostTemplate,
} from '../../lib/posts.js'
import { isDraftTableUnreadable, readDraft } from '../../lib/drafts.js'

const LIST_FILTERS = [...POST_STATUSES, 'all'] as const

/** Link-table rows grouped by post, in the order they were read. A missing table reads as none. */
function byPost(rows: unknown, column: 'keyword_id' | 'author_id'): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const r of (Array.isArray(rows) ? rows : []) as Record<string, unknown>[]) {
    const post = r.post_id
    const id = r[column]
    if (typeof post !== 'string' || typeof id !== 'string') continue
    out.set(post, [...(out.get(post) ?? []), id])
  }
  return out
}

async function handleList(req: VercelRequest, res: VercelResponse): Promise<void> {
  const rawStatus = req.query.status
  const statusParam = Array.isArray(rawStatus) ? rawStatus[0] : (rawStatus ?? 'all')

  if (!(LIST_FILTERS as readonly string[]).includes(statusParam)) {
    res.status(400).json({ error: `Invalid status '${statusParam}'. Expected one of: ${LIST_FILTERS.join(', ')}` })
    return
  }

  const supabase = getSupabase()
  // `body` is read here only to cut the preview line; it is not sent on.
  let query = supabase.from('posts').select(`${POST_SUMMARY_COLUMNS}, body`).order('updated_at', { ascending: false })

  if (statusParam !== 'all') {
    query = query.eq('status', statusParam)
  }

  const [{ data, error }, { data: drafts, error: draftError }, { data: worn }, { data: named }] = await Promise.all([
    query,
    supabase.from('post_drafts').select('post_id'),
    supabase.from('post_keywords').select('post_id, keyword_id'),
    supabase.from('post_authors').select('post_id, author_id').order('position', { ascending: true }),
  ])
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  /*
   * Which posts have edits waiting for Publish, so the list can say so. One
   * extra read of a table that holds a row only per published post being
   * edited — cheaper than a join PostgREST cannot express without a foreign
   * key embed on every summary. A missing table (0028 not run) means none.
   * It runs alongside the list itself, not after it.
   */
  if (draftError && !isDraftTableUnreadable(draftError)) {
    res.status(500).json({ error: draftError.message })
    return
  }
  const pending = new Set(((drafts ?? []) as { post_id: string }[]).map((d) => d.post_id))

  // The content workspace filters by tag and by author, so the list carries
  // each post's tag and author ids; one query per link table, not one per post.
  const tags = byPost(worn, 'keyword_id')
  const authors = byPost(named, 'author_id')
  res.status(200).json({
    posts: (data as PostRow[]).map((row) => ({
      ...toPostSummary(row),
      ...bodyPreview(row.body),
      keywords: tags.get(row.id) ?? [],
      authors: authors.get(row.id) ?? [],
      has_draft: pending.has(row.id),
    })),
  })
}

interface CreatePostBody {
  module_id?: unknown
  /** Dạng bài — retired; stored as given, empty when absent. */
  kind?: unknown
  /** Place on the topic tree (migration 0027). */
  topic_id?: unknown
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
  const kind = body.kind
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
   * `kind` (dạng bài) is retired: the template says what a post is. The column
   * is still NOT NULL until a migration drops it, so a post that names no kind
   * gets an empty one rather than a refusal.
   */
  if (kind !== undefined && typeof kind !== 'string') {
    res.status(400).json({ error: 'kind must be a string' })
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

  // The post's place on the topic tree (migration 0027). Optional here so
  // older callers still work; the CMS always sends one.
  if (body.topic_id != null && typeof body.topic_id !== 'string') {
    res.status(400).json({ error: 'topic_id must be a string' })
    return
  }
  let topic_id: string | null = typeof body.topic_id === 'string' && body.topic_id ? body.topic_id : null

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
   * Copying a post takes its content, not its place in the world. Status,
   * pinning, publication date and order stay behind: a copy is a draft nobody
   * has published or positioned yet, and inheriting any of that would put a
   * post on the site that no one decided to put there.
   */
  if (fromPostId) {
    const { data: src, error: srcError } = await supabase
      .from('posts')
      .select('template, body, lead, pull_quote, further_reading, topic_id, hero_image_url, hero_caption, plate_images')
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
    /*
     * The copy starts from what the owner last wrote, not what readers see:
     * a published post's unpublished edits live in `post_drafts`, and copying
     * it is how the owner starts a sibling from their newest text.
     */
    const pendingEdits = await readDraft(supabase, fromPostId)
    if (pendingEdits.error) {
      res.status(500).json({ error: (pendingEdits.error as { message?: string }).message ?? 'Draft read failed' })
      return
    }
    const merged: Record<string, unknown> = { ...(src as Record<string, unknown>) }
    for (const key of ['body', 'lead', 'pull_quote', 'further_reading', 'hero_image_url', 'hero_caption', 'plate_images'] as const) {
      if (pendingEdits.data && Object.prototype.hasOwnProperty.call(pendingEdits.data, key)) merged[key] = pendingEdits.data[key]
    }
    const row = merged as { template: string; body: unknown }
    template = row.template
    /*
     * Pictures come across with the text. Both posts then point at the same
     * stored files, which is safe because nothing ever deletes an upload; a
     * copy that dropped them left the owner re-uploading every photo.
     */
    startingBody = row.body ?? null
    copied = merged
    // What a post is about is part of its content, so a copy keeps its topic
    // unless the caller filed it somewhere else.
    topic_id = topic_id ?? ((copied.topic_id as string | null) ?? null)
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
      kind: (kind ?? '') as PostKind,
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
      topic_id,
      hero_image_url: copied?.hero_image_url ?? null,
      hero_caption: copied?.hero_caption ?? null,
      plate_images: copied?.plate_images ?? null,
      pull_quote: copied?.pull_quote ?? null,
      further_reading: copied?.further_reading ?? null,
    })
    .select('id')
    .single()

  const { data, error } = await insert

  if (error) {
    // 23503 = foreign key violation, i.e. module_id doesn't exist.
    if (error.code === '23503') {
      res.status(400).json({ error: `Module '${module_id}' or topic '${topic_id}' does not exist` })
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
