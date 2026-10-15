import type { PostRow } from '../data/usePublishedPosts'

/** The bits of a post these helpers need — so callers can pass admin rows too. */
type TitledPost = Pick<PostRow, 'en'> & { vi: string; lead?: string | null }

/**
 * A post has exactly one title, and every place that shows it reads the same
 * field. The module listing and the post's own page must never be able to say
 * different things (System conventions, rule 04).
 */
export const postTitle = (post: TitledPost) => post.en

/**
 * The line under a post's title in a listing.
 *
 * Two sources, in order: the post's own subtitle if it has written one, and
 * otherwise the short key phrase stored alongside it. Deriving it rather than
 * storing a second copy is what keeps the listing from drifting away from the
 * post — edit the subtitle and every listing follows, with `vi` still there to
 * be set by hand when a post's opening line makes a poor summary.
 */
export function postDescription(post: TitledPost): string {
  const subtitle = post.lead?.trim()
  return subtitle || post.vi
}

/**
 * The number a reader sees beside a post: its place in the list currently on
 * screen, counted from one.
 *
 * Deliberately not `posts.n`. That column records the running order at
 * authoring time, over every post in the module whatever its status — so with
 * five of six archived, the one still published introduced itself as "05".
 * A number the reader can count along with has to come from what is shown.
 */
export const displayNumber = (index: number): string => String(index + 1).padStart(2, '0')

/** Keys whose strings are addresses, ids or styling — never words a reader reads. */
const NOT_PROSE = new Set(['type', 'k', 'key', 'id', 'url', 'src', 'href', 'imageUrl', 'image_url', 'tint', 'color', 'w', 's', 'h_px', 'margin', 'align', 'variant', 'kind', 'len', 'media', 'mediaHint', 'hue', 'n'])

/**
 * Minutes to read a post's body, Medium-style: words over 200 a minute,
 * rounded up, at least one. `body` is one of several shapes (sections, blocks,
 * stored elements), so this walks it rather than knowing each one; null when
 * there are no words at all, so the byline leaves the part out.
 */
export function readMinutes(body: unknown): number | null {
  let words = 0
  const walk = (v: unknown, key: string) => {
    if (typeof v === 'string') {
      if (!NOT_PROSE.has(key) && !/^(https?:|data:|#)/.test(v)) words += v.split(/\s+/).filter(Boolean).length
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key))
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k)
  }
  walk(body, '')
  return words === 0 ? null : Math.max(1, Math.ceil(words / 200))
}

/**
 * A post's words in reading order, as headings and paragraphs — for a preview
 * that shows the opening of a post in the page's own type rather than the
 * template's. Walks the body for the same reason `readMinutes` does: each
 * template stores it in its own shape.
 */
export function proseOf(body: unknown): { h: boolean; text: string }[] {
  const out: { h: boolean; text: string }[] = []
  const add = (h: boolean, t: string) => {
    const text = t.trim()
    if (text && !/^(https?:|data:|#)/.test(text)) out.push({ h, text })
  }
  const walk = (v: unknown, key: string) => {
    if (typeof v === 'string') {
      if (!NOT_PROSE.has(key)) add(key === 'h', v)
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key))
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      // A line stored as runs is one paragraph, not one per run.
      if (Array.isArray(o.runs)) {
        const t = o.runs.map((r) => (typeof r === 'string' ? r : typeof (r as { t?: unknown })?.t === 'string' ? (r as { t: string }).t : '')).join('')
        add((typeof o.k === 'string' && /^h\d$/.test(o.k)) || o.type === 'heading', t)
      }
      for (const [k, x] of Object.entries(o)) if (k !== 'runs') walk(x, k)
    }
  }
  walk(body, '')
  return out
}
