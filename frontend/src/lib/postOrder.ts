/**
 * The order posts appear in, within one module.
 *
 * The rule is the owner's: `published_at` is the default, newest first;
 * `sort_order` is the override, and only means something once someone has
 * dragged a post somewhere; a pinned post leads regardless.
 *
 * The public screens get this from Postgres — `pinned` desc, `sort_order` asc
 * with nulls last, `published_at` desc. The CMS holds every post in memory,
 * drafts included, so it has to sort them itself. It used to sort by
 * `sort_order` alone, which with every value null left the list in whatever
 * order the API replied — `updated_at`, most recently edited first. So the CMS
 * numbered posts 01…06 in an order the site never used, and the drag handle
 * rearranged a list that did not match the page it was arranging.
 *
 * One comparator, so the two cannot drift again.
 */
export type Orderable = {
  pinned?: boolean
  sort_order: number | null
  published_at?: string | null
  /** Stands in for `published_at` on a post that has never been published. */
  created_at?: string
  /**
   * The date the writer put on the post, 'YYYY.MM' — the one a reader sees.
   *
   * It breaks a tie in `published_at`, which happens more than it sounds: a
   * batch published in one go shares a timestamp to the second, and then the
   * only thing separating the posts is the date on their faces. Leaving them in
   * whatever order the API replied put 2025.12 between 2026.01 and 2026.04 on
   * a list that numbered them 01, 02, 03.
   */
  date_label?: string
}

/** Newest first, and a post with no date at all sorts last rather than first. */
function newestFirst(a: Orderable, b: Orderable): number {
  const at = a.published_at ?? a.created_at ?? ''
  const bt = b.published_at ?? b.created_at ?? ''
  if (at !== bt) {
    if (!at) return 1
    if (!bt) return -1
    return at < bt ? 1 : -1
  }
  const ad = a.date_label ?? ''
  const bd = b.date_label ?? ''
  if (ad === bd) return 0
  if (!ad) return 1
  if (!bd) return -1
  return ad < bd ? 1 : -1
}

export function comparePosts(a: Orderable, b: Orderable): number {
  if ((a.pinned ?? false) !== (b.pinned ?? false)) return a.pinned ? -1 : 1
  // A post nobody has placed goes after every post somebody has.
  const ao = a.sort_order ?? Number.POSITIVE_INFINITY
  const bo = b.sort_order ?? Number.POSITIVE_INFINITY
  if (ao !== bo) return ao - bo
  return newestFirst(a, b)
}

/**
 * Just the posts a reader can see.
 *
 * An order is a fact about a page. A post that is archived, deleted or still a
 * draft is not on that page, so it has no place in the numbering and nothing to
 * be dragged above or below.
 */
export function onlyLive<T extends { status?: string }>(posts: readonly T[]): T[] {
  return posts.filter((p) => p.status === 'published')
}

/** The same list, in the order the site shows it. */
export function orderPosts<T extends Orderable>(posts: readonly T[]): T[] {
  return [...posts].sort(comparePosts)
}
