import { featureCells, notePlacement, type FeatureCell } from '../content/notes'

/** A feature cell once the admin's photo has been folded in. */
export type DrawnCell = FeatureCell & { img?: string | null }
import type { PostRow } from '../data/usePublishedPosts'

/**
 * How Ghi 01 arranges its grid.
 *
 * The page holds two kinds of cell that share one grid but are not the same
 * kind of thing — feature cells belong to the page's layout, posts are what
 * the owner publishes — so the arrangement is worked out here, away from the
 * drawing, where it can be read and tested on its own.
 *
 * The design lays out a batch of eight posts with seven feature cells woven
 * between them, five rows of three. Past eight posts the batch simply repeats.
 */

/** Eight post placements and seven feature cells make one batch. */
export const POSTS_PER_BATCH = notePlacement.length

type Cell =
  | { kind: 'post'; post: PostRow; place: (typeof notePlacement)[number]; slot: number }
  | { kind: 'feature'; cell: DrawnCell }

/** The whole batch as the design draws it, every cell present. */
function fullBatch(cells: readonly DrawnCell[]): Array<{ kind: 'post'; slot: number } | { kind: 'feature'; cell: DrawnCell }> {
  const out: Array<{ kind: 'post'; slot: number } | { kind: 'feature'; cell: DrawnCell }> = []
  for (let slot = 0; slot < POSTS_PER_BATCH; slot++) {
    out.push({ kind: 'post', slot })
    for (const cell of cells) if (cell.afterPost === slot) out.push({ kind: 'feature', cell })
  }
  return out
}

const span = (v: string) => Number(v.replace('span ', '')) || 0

/**
 * Which row each cell of a full batch falls on.
 *
 * A feature cell only earns its place once a post shares its row — otherwise
 * the page would open with decoration and nothing to decorate. Rows are worked
 * out from the complete batch, so a half-filled one still puts its cells where
 * they will eventually sit.
 */
function rowOfEachCell(cells: readonly DrawnCell[]): number[] {
  const rows: number[] = []
  let row = 0
  let used = 0
  for (const c of fullBatch(cells)) {
    const w = c.kind === 'post' ? span(notePlacement[c.slot].col) : span(c.cell.col)
    if (used + w > 12) {
      row += 1
      used = 0
    }
    rows.push(row)
    used += w
  }
  return rows
}

/**
 * The cells to draw, in order.
 *
 * Posts arrive already sorted — pinned first, then whatever order the module
 * asked for — and simply fill the batch from the top, so a new post takes the
 * highest place left to it.
 */
export function buildNotesGrid(posts: PostRow[], cells: readonly DrawnCell[] = featureCells): Cell[] {
  const shape = fullBatch(cells)
  const rows = rowOfEachCell(cells)
  const out: Cell[] = []

  for (let start = 0; start < posts.length; start += POSTS_PER_BATCH) {
    const batch = posts.slice(start, start + POSTS_PER_BATCH)
    // Rows this batch actually reaches — a feature cell shows only on one of them.
    const filled = new Set(
      shape.flatMap((c, i) => (c.kind === 'post' && c.slot < batch.length ? [rows[i]] : [])),
    )

    shape.forEach((c, i) => {
      if (c.kind === 'post') {
        const post = batch[c.slot]
        if (post) out.push({ kind: 'post', post, place: notePlacement[c.slot], slot: c.slot })
      } else if (filled.has(rows[i])) {
        out.push({ kind: 'feature', cell: c.cell })
      }
    })
  }
  return out
}
