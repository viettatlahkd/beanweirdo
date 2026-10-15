/**
 * Where each post of Ghi 01 sits: fixed blocks of eight slots.
 *
 * The owner, 2026-09-24: the oldest post goes into slot 7 of the bottom block,
 * the next into slot 6, and so on up to slot 0; the ninth post opens a new
 * block above and starts again from its slot 7. So a post, once placed, keeps
 * its slot for good — a new post fills an empty slot higher up instead of
 * pushing every card one place along, which is what a plain newest-first list
 * did.
 */
export const BLOCK_SIZE = 8

type Dated = { published_at?: string | null; created_at?: string | null; id: string }

/**
 * Newest first by publication time alone. The owner's rule is about time —
 * "như thế thì sẽ đúng thời gian" — so pinning and manual order, which the
 * rest of the site honours through `usePublishedPosts`, are ignored here:
 * letting them in would move a post to another slot, the one thing the fixed
 * blocks exist to prevent. A post without a publication date falls back to
 * its creation date; ties break on id so the order never flickers.
 */
export function byTimeNewestFirst<T extends Dated>(posts: readonly T[]): T[] {
  const at = (p: T) => p.published_at ?? p.created_at ?? ''
  return [...posts].sort((a, b) => at(b).localeCompare(at(a)) || b.id.localeCompare(a.id))
}

type Placement = {
  /** Index into the newest-first list the page already has. */
  i: number
  /** Block counted from the top of the page — 0 is the newest. */
  block: number
  /** Slot inside the block, 0 at the top-left down to 7 at the bottom. */
  slot: number
}

/** Places `count` posts given newest first (see `byTimeNewestFirst`). */
export function placePosts(count: number): Placement[] {
  const blocks = Math.ceil(count / BLOCK_SIZE)
  return Array.from({ length: count }, (_, i) => {
    // k-th post in time, 0 = the oldest.
    const k = count - 1 - i
    const fromBottom = Math.floor(k / BLOCK_SIZE)
    return { i, block: blocks - 1 - fromBottom, slot: BLOCK_SIZE - 1 - (k % BLOCK_SIZE) }
  })
}
