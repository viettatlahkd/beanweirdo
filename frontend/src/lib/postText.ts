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
