/**
 * Portfolio's layout rules — hard-coded, not editable by the site owner.
 *
 * Every image of a series block sits inside a 13 × 8 fibonacci rectangle split
 * into squares 8 · 5 · 3 · 2 · 1 · 1. The large image always takes cell 8 or 5
 * and the small one a smaller cell, so the ratio of the two images' sides is
 * always a fibonacci ratio.
 */

/** Squares in the 13 × 8 frame, base orientation: [column, row, side]. */
export const CELLS = {
  '8': [1, 1, 8],
  '5': [9, 1, 5],
  '3': [11, 6, 3],
  '2': [9, 7, 2],
  '1': [9, 6, 1],
  '1b': [10, 6, 1],
} as const satisfies Record<string, readonly [number, number, number]>

export type CellKey = keyof typeof CELLS

/** 0 base · 1 flip horizontally · 2 flip vertically · 3 flip both. */
const ORIENT = [0, 3, 1, 2] as const
const PAIRS: [CellKey, CellKey][] = [['8', '3'], ['5', '2'], ['8', '2'], ['5', '3'], ['8', '5']]

export type Placed = { col: number; row: number; size: number }

/**
 * The `i`-th series block on the page — 06.6.
 *
 * Orientation cycles through 4 values and the cell pair through 5 pairs, so
 * two adjacent blocks never share a layout, and there are 20 variants in all.
 */
export function seriesLayout(i: number): [Placed, Placed] {
  const flip = ORIENT[i % 4]
  const pair = PAIRS[i % 5]
  return pair.map((k) => {
    let [col, row, size] = CELLS[k]
    if (flip & 1) col = 15 - col - size
    if (flip & 2) row = 10 - row - size
    return { col, row, size }
  }) as [Placed, Placed]
}

const STORY_SMALL: CellKey[] = ['3', '5', '2']

/**
 * The `i`-th story block — 06.7.
 *
 * A portrait 8 × 13 frame (the 13 × 8 frame rotated 90°) with a horizontal
 * axis at the golden cut, between rows 8 and 9. The large image is always
 * cell 8 above the axis; the small one is always below it, cycling cells
 * 3 → 5 → 2. Only horizontal flips. The small image leans toward the text
 * (mirrored), so blocks alternating left and right stay symmetric about the
 * page's centre.
 */
export function storyLayout(i: number, imageLeft: boolean): [Placed, Placed] {
  const small = STORY_SMALL[i % 3]
  const at = (k: CellKey, mirror: boolean): Placed => {
    const [c, r, size] = CELLS[k]
    let col = r
    const row = c
    if (mirror) col = 10 - col - size
    return { col, row, size }
  }
  const raw = at(small, false)
  const smallRight = raw.col + raw.size / 2 > 5
  const mirror = smallRight !== imageLeft
  return [at('8', mirror), at(small, mirror)]
}

/** CSS grid placement of a cell. */
export const gridArea = (p: Placed) => `${p.row} / ${p.col} / span ${p.size} / span ${p.size}`

/**
 * The focal point is stored on the URL (`…jpg#focus=50,25`), the same way post
 * cover images already store it. Returns the clean URL and an
 * `object-position`.
 */
export function imageOf(url: string | null | undefined): { src: string; position?: string } | null {
  if (!url) return null
  const [src, frag] = url.split('#')
  const m = /focus=([\d.]+),([\d.]+)/.exec(frag ?? '')
  return { src, position: m ? `${m[1]}% ${m[2]}%` : undefined }
}
