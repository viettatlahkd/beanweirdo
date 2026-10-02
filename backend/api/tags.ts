import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../lib/cors.js'
import { requireAuth } from '../lib/auth.js'
import { getSupabase } from '../lib/supabase.js'
import { handleKeywords, handleTopics, slug, vocabOf } from '../lib/vocab.js'
import { handleLayout } from '../lib/layout.js'

/**
 * Tags — what a post is, in the owner's own words.
 *
 *   GET    /api/tags            every tag ever used, oldest first
 *   POST   /api/tags            add one
 *   PATCH  /api/tags?id=…       rename one, and everything wearing it
 *   DELETE /api/tags?id=…       remove one, after saying where its things go
 *
 *   ?vocab=topics | keywords    the topic tree and theme tags (lib/vocab.ts)
 *   ?vocab=layout | rules | pages | overrides   the feature layer (lib/layout.ts)
 *
 * Since migration 0027 this vocabulary means dạng bài — what form a post
 * takes — and theme tags live in `keywords` instead.
 *
 * This replaces `kind`, which was four words a programmer picked — note,
 * essay, ref, log — with no way to add a fifth short of editing a database
 * constraint. A tag is written once and offered from then on.
 *
 * The four old words were seeded as the first four tags, so nothing lost its
 * label. `posts.kind` still holds the value; it simply is not fenced any more.
 *
 * One vocabulary, two kinds of thing wearing it. A post carries its tag in
 * `posts.kind`; a loose note carries it in `notes.k`. They were two separate
 * lists — four words here, four different words hard-coded in the front end —
 * so the filter bar on the notes page and the tag picker on "new post" spoke
 * past each other. Renaming and deleting therefore have to walk both tables:
 * a tag that vanishes from one and survives in the other is the same split
 * coming back.
 */

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAuth(req, res)) return
  const supabase = getSupabase()

  // The content layer's two vocabularies live on this endpoint too.
  const vocab = vocabOf(req)
  if (vocab === 'topics') return handleTopics(req, res, supabase)
  if (vocab === 'keywords') return handleKeywords(req, res, supabase)
  const layout = typeof req.query.vocab === 'string' ? req.query.vocab : ''
  if (['layout', 'rules', 'pages', 'overrides'].includes(layout)) return handleLayout(req, res, supabase, layout)

  if (req.method === 'GET') {
    const [{ data, error }, { data: kinds }] = await Promise.all([
      supabase.from('tags').select('id, label').order('created_at', { ascending: true }),
      supabase.from('posts').select('kind').neq('status', 'deleted'),
    ])

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    // How many posts wear each one, so Phân loại can show what is used and what is not.
    const counts = new Map<string, number>()
    for (const { kind } of (Array.isArray(kinds) ? kinds : []) as { kind: string }[]) counts.set(kind, (counts.get(kind) ?? 0) + 1)
    res.status(200).json({ tags: (data ?? []).map((t) => ({ ...t, posts: counts.get((t as { id: string }).id) ?? 0 })) })
    return
  }

  if (req.method === 'POST') {
    const label = typeof (req.body ?? {}).label === 'string' ? (req.body as { label: string }).label.trim() : ''
    if (!label) {
      res.status(400).json({ error: 'label is required' })
      return
    }

    const id = slug(label)
    if (!id) {
      res.status(400).json({ error: 'label must contain a letter or a number' })
      return
    }

    // Writing the same tag twice is not an error — it is someone typing a word
    // they have used before, and they should get the tag back either way.
    const { error } = await supabase.from('tags').upsert({ id, label }, { onConflict: 'id' })
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ id, label })
    return
  }

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    const id = typeof req.query.id === 'string' ? req.query.id : ''
    if (!id) {
      res.status(400).json({ error: 'id is required' })
      return
    }

    const { data: existing, error: findError } = await supabase
      .from('tags')
      .select('id, label')
      .eq('id', id)
      .maybeSingle()
    if (findError) {
      res.status(500).json({ error: findError.message })
      return
    }
    if (!existing) {
      res.status(404).json({ error: `Tag '${id}' not found` })
      return
    }

    if (req.method === 'PATCH') {
      const label = typeof (req.body ?? {}).label === 'string' ? (req.body as { label: string }).label.trim() : ''
      if (!label) {
        res.status(400).json({ error: 'label is required' })
        return
      }
      /*
       * Đổi tên giữ nguyên `id`.
       *
       * `id` là thứ `posts.kind` và `notes.k` đang trỏ tới. Đổi nó theo tên mới
       * thì mọi bài và ghi chép đang đeo tag ấy mất chỗ dựa — nên tên hiển thị
       * đổi, còn danh tính thì không.
       */
      const { error } = await supabase.from('tags').update({ label }).eq('id', id)
      if (error) {
        res.status(500).json({ error: error.message })
        return
      }
      res.status(200).json({ id, label })
      return
    }

    /*
     * DELETE — nói trước những gì đang đeo tag sẽ về đâu.
     *
     * Phân biệt "chưa nói gì" với "cố ý để trống": `{}` là chưa nói, `{to: null}`
     * là đã nói và chọn bỏ trống. Gộp hai cái làm một thì lời cảnh báo không bao
     * giờ bật lên, vì lúc nào cũng có một giá trị.
     */
    const body = (req.body ?? {}) as { to?: string | null }
    const said = 'to' in body
    const to = typeof body.to === 'string' ? body.to : null
    const [{ data: posts }, { data: notes }] = await Promise.all([
      supabase.from('posts').select('id').eq('kind', id),
      supabase.from('notes').select('id').eq('k', existing.label),
    ])
    const wearing = { posts: (posts ?? []).map((p) => p.id), notes: (notes ?? []).map((n) => n.id) }

    if (wearing.posts.length + wearing.notes.length > 0) {
      /*
       * Không xoá lặng lẽ khi còn thứ đang đeo.
       *
       * Xoá tag mà bỏ mặc là để lại bài trỏ vào một tag không còn tồn tại —
       * nó biến mất khỏi mọi thanh lọc mà vẫn nằm đó, đúng cái lỗi "viết xong
       * rồi không tìm thấy được". Người gọi phải nói `to` (tag thay thế) hoặc
       * `to: null` (bỏ trống có chủ ý).
       */
      if (!said) {
        res.status(400).json({ error: 'to is required while posts or notes still wear this tag', wearing })
        return
      }
      /*
       * `to: null` cannot be honoured: `posts.kind` and `notes.k` are both
       * NOT NULL (migration 0001; later migrations only dropped their CHECKs),
       * so the update below would fail halfway with a 500. Refuse before any
       * write, and hand back `wearing` so the caller can ask for a replacement.
       */
      if (to === null) {
        res.status(400).json({ error: 'posts and notes cannot be left without a tag; pass a replacement in to', wearing })
        return
      }
      const moves = []
      if (wearing.posts.length > 0) moves.push(supabase.from('posts').update({ kind: to }).eq('kind', id))
      if (wearing.notes.length > 0) moves.push(supabase.from('notes').update({ k: to }).eq('k', existing.label))
      const results = await Promise.all(moves)
      const failed = results.find((r) => r.error)
      if (failed?.error) {
        res.status(500).json({ error: failed.error.message })
        return
      }
    }

    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    res.status(200).json({ deleted: id, moved: wearing })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export default withCors(handler)
