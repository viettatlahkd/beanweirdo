/**
 * Where an uploaded photo sits inside the frame it fills.
 *
 * A cell in a layout has a fixed shape and a photo rarely matches it, so the
 * photo is cropped to fill and something is lost. Which part is lost is a
 * judgement — a face near the top of a wide cell should not be the half that
 * goes — so the admin sets a focal point and every screen honours it.
 *
 * This lives in the renderer package rather than in `frontend/src/lib` because
 * the templates draw more photo cells than the app does, and they cannot import
 * from `frontend`. While it sat on the other side of that line, article's four
 * plates and its section figures wrote `background-image` by hand and never
 * read the focal point at all — so a photo placed carefully in the picker came
 * out anchored to its top-left corner on the page, and the editor and the
 * preview cropped the same photo two different ways because their frames are
 * different widths. `frontend/src/lib/imageFocus.ts` re-exports this file, so
 * the app's twenty-odd call sites did not have to move.
 *
 * It rides along on the URL as `#focus=x,y`, two percentages read exactly the
 * way `background-position` reads them: 0,0 keeps the top-left corner, 100,100
 * the bottom-right, and the default 50,50 centres. A fragment is never sent to
 * the server, so the URL still fetches the same file, and the value travels
 * through every layer that already carries an image URL — no column to add, no
 * migration to run, nothing to keep in step.
 */

import type { CSSProperties } from 'react'

export type Focus = { x: number; y: number }

export const CENTRE: Focus = { x: 50, y: 50 }

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

const FOCUS_RE = /#focus=(-?[\d.]+),(-?[\d.]+)$/
const CROP_RE = /#crop=([\d.]+),([\d.]+),([\d.]+),([\d.]+),([\d.]+)$/

/** The focal point written on a URL, or the centre when it carries none. */
export function readFocus(url: string | null | undefined): Focus {
  if (!url) return CENTRE
  const m = FOCUS_RE.exec(url)
  if (m) return { x: clamp(Number(m[1])), y: clamp(Number(m[2])) }
  /*
   * A cropped photo that lands in a fixed cell — a body image picked up as a
   * post's thumbnail — should keep roughly the part that was kept, so its crop
   * turns into the focal point that shows the same window.
   */
  const c = readCrop(url)
  if (c) return { x: c.w >= 100 ? 50 : clamp((c.x / (100 - c.w)) * 100), y: c.h >= 100 ? 50 : clamp((c.y / (100 - c.h)) * 100) }
  return CENTRE
}

/** The URL without any focal point or crop — what actually gets fetched. */
export function stripFocus(url: string): string {
  return url.replace(FOCUS_RE, '').replace(CROP_RE, '')
}

/** The same URL carrying a focal point; the centre is left implicit. */
export function withFocus(url: string, focus: Focus): string {
  const bare = stripFocus(url)
  const x = clamp(focus.x)
  const y = clamp(focus.y)
  if (x === CENTRE.x && y === CENTRE.y) return bare
  return `${bare}#focus=${x},${y}`
}

/**
 * A crop someone drew by hand: the rectangle of the photo that is kept, in
 * percentages of the photo's own width and height, plus the width ÷ height of
 * that rectangle on screen.
 *
 * A focal point only works for a cell whose shape the template decides. A body
 * image has no such shape — the owner wanted to cut it themselves instead of
 * living with a fixed landscape strip — so the shape is part of what is stored.
 * The ratio travels with the rectangle because the page cannot work it out: it
 * would need the photo's pixel size, and a background image never reports it.
 */
export type Crop = { x: number; y: number; w: number; h: number; ratio: number }

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d

export function readCrop(url: string | null | undefined): Crop | null {
  if (!url) return null
  const m = CROP_RE.exec(url)
  if (!m) return null
  const [x, y, w, h, ratio] = m.slice(1).map(Number)
  if (!(w > 0 && h > 0 && ratio > 0)) return null
  return { x, y, w: Math.min(100, w), h: Math.min(100, h), ratio }
}

/** The same URL carrying a crop instead of any focal point. */
export function withCrop(url: string, c: Crop): string {
  const nums = [c.x, c.y, c.w, c.h].map((n) => round(Math.max(0, Math.min(100, n))))
  return `${stripFocus(url)}#crop=${nums.join(',')},${round(c.ratio, 4)}`
}

/**
 * What a cell that takes its shape from the crop draws: the photo scaled so the
 * kept rectangle fills the cell exactly. Null when the URL carries no crop, so
 * the caller falls back to its own fixed shape.
 */
export function cropStyle(url: string | null | undefined): CSSProperties | null {
  const c = url ? readCrop(url) : null
  if (!url || !c) return null
  const at = (from: number, size: number) => (size >= 100 ? 0 : round((from / (100 - size)) * 100, 3))
  return {
    aspectRatio: String(c.ratio),
    backgroundImage: `url(${stripFocus(url)})`,
    /*
     * Width only, height `auto`: when the cell has the crop's shape the two are
     * the same thing, and when a layout pins the cell to another shape (the
     * article hero is as tall as its band) the photo keeps its proportions
     * instead of being squashed to fit.
     */
    backgroundSize: `${round(10000 / c.w, 3)}% auto`,
    backgroundPosition: `${at(c.x, c.w)}% ${at(c.y, c.h)}%`,
    backgroundRepeat: 'no-repeat',
  }
}

/**
 * Background shorthand for a cell that fills itself with a photo, honouring
 * the focal point. Everything that draws an uploaded image goes through here,
 * so a photo lands the same way on the homepage, in the preview and in the
 * editor's thumbnail.
 */
export function coverStyle(url: string): {
  backgroundImage: string
  backgroundPosition: string
  backgroundSize: 'cover'
  backgroundRepeat: 'no-repeat'
} {
  const f = readFocus(url)
  return {
    backgroundImage: `url(${stripFocus(url)})`,
    backgroundPosition: `${f.x}% ${f.y}%`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  }
}

/**
 * What a fixed picture cell draws: the photo when it has one, the template's
 * own tint when it does not.
 *
 * Both halves in one call because the two are a single decision and writing
 * them apart is how they drifted — a cell that set `backgroundImage` by hand
 * kept `backgroundSize: 'cover'` but never `backgroundPosition`, and CSS then
 * anchors the crop at the top-left instead of the focal point.
 *
 * Longhand properties only, never the `background` shorthand: jsdom drops
 * `background: url(...) center/cover` without a word, so a cell that lost its
 * photo would still pass its test.
 */
export function fillStyle(url: string | null | undefined, tint: string): CSSProperties {
  if (!url) return { backgroundColor: tint }
  /*
   * A photo cut by hand gives the cell its shape. The owner asked for every
   * picture cell to take "freesize, 16:9 …" like the body image, so the crop's
   * ratio wins over the height the template set — `height: 'auto'` is what lets
   * `aspectRatio` apply, since callers spread this after their own height.
   * The tint stays underneath for a cell the layout still pins.
   */
  const cropped = cropStyle(url)
  return cropped ? { ...cropped, height: 'auto', backgroundColor: tint } : coverStyle(url)
}
