/**
 * Where an uploaded photo sits inside the frame it fills.
 *
 * A cell in a layout has a fixed shape and a photo rarely matches it, so the
 * photo is cropped to fill and something is lost. Which part is lost is a
 * judgement — a face near the top of a wide cell should not be the half that
 * goes — so the admin sets a focal point and every screen honours it.
 *
 * It rides along on the URL as `#focus=x,y`, two percentages read exactly the
 * way `background-position` reads them: 0,0 keeps the top-left corner, 100,100
 * the bottom-right, and the default 50,50 centres. A fragment is never sent to
 * the server, so the URL still fetches the same file, and the value travels
 * through every layer that already carries an image URL — no column to add, no
 * migration to run, nothing to keep in step.
 */

export type Focus = { x: number; y: number }

export const CENTRE: Focus = { x: 50, y: 50 }

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/** The focal point written on a URL, or the centre when it carries none. */
export function readFocus(url: string | null | undefined): Focus {
  if (!url) return CENTRE
  const m = /#focus=(-?[\d.]+),(-?[\d.]+)$/.exec(url)
  if (!m) return CENTRE
  return { x: clamp(Number(m[1])), y: clamp(Number(m[2])) }
}

/** The URL without any focal point — what actually gets fetched. */
export function stripFocus(url: string): string {
  return url.replace(/#focus=-?[\d.]+,-?[\d.]+$/, '')
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
