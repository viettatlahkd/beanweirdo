/**
 * One colour in, a working set out.
 *
 * A post belongs to a module and wears that module's colour. Until now only
 * the band at the head of the page knew that — the table headings, the chart
 * bars and the image ground were the report template's own blue, written into
 * the file. So a post filed under a pink module opened with a pink band over a
 * blue table, and no amount of choosing the module's colour changed it.
 *
 * Everything a template tints is derived here instead, from that one colour:
 *
 *   accent   the colour itself — bars, rails, small caps headings
 *   onAccent what reads on top of it
 *   ink      the same hue pushed dark enough to be body-adjacent text on cream
 *   tint     a pale wash for grounds — image placeholders, callouts
 *   edge     a hairline, between tint and accent
 *
 * The derivations move lightness and hold hue, so a module's colour stays
 * recognisably itself at every weight rather than drifting toward some other
 * colour as it lightens.
 */

export type Palette = {
  accent: string
  onAccent: string
  ink: string
  /** Between `ink` and `accent` — a second text weight, for a second role. */
  mid: string
  tint: string
  edge: string
}

type Hsl = { h: number; s: number; l: number }

/** #rgb and #rrggbb; anything unreadable falls back to mid grey rather than throwing. */
function toHsl(hex: string): Hsl {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return { h: 0, s: 0, l: 50 }
  const raw = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]
  const r = parseInt(raw.slice(0, 2), 16) / 255
  const g = parseInt(raw.slice(2, 4), 16) / 255
  const b = parseInt(raw.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l: l * 100 }

  const s = d / (1 - Math.abs(2 * l - 1))
  const h =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 }
}

function toHex({ h, s, l }: Hsl): string {
  const S = Math.min(100, Math.max(0, s)) / 100
  const L = Math.min(100, Math.max(0, l)) / 100
  const c = (1 - Math.abs(2 * L - 1)) * S
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = L - c / 2
  const seg = Math.floor(((h % 360) + 360) % 360 / 60)
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][seg]
  const pair = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${pair(r)}${pair(g)}${pair(b)}`
}

/** Perceived brightness, for deciding what reads on top of a colour. */
function luminance(hex: string): number {
  const { l } = toHsl(hex)
  return l
}

/**
 * The same hue at a chosen lightness.
 *
 * Templates that told two things apart by using two different colours — a navy
 * heading beside an amber emphasis — need two colours still. Taking both from
 * one hue keeps the distinction while letting the module decide the hue, which
 * a fixed second colour never could.
 */
export function shade(accent: string, lightness: number): string {
  const { h, s } = toHsl(accent)
  return toHex({ h, s: Math.min(s, 62), l: lightness })
}

export function paletteFrom(accent: string, onAccent?: string): Palette {
  const { h, s } = toHsl(accent)
  return {
    accent,
    // A module may state what reads on its colour; otherwise pick the side
    // that can be read rather than the side that looks tasteful in one case.
    onAccent: onAccent ?? (luminance(accent) > 62 ? toHex({ h, s: Math.min(s, 70), l: 14 }) : '#FFFFFF'),
    ink: toHex({ h, s: Math.min(s, 62), l: 30 }),
    mid: toHex({ h, s: Math.min(s, 62), l: 44 }),
    tint: toHex({ h, s: Math.min(s, 46), l: 94 }),
    edge: toHex({ h, s: Math.min(s, 40), l: 84 }),
  }
}
