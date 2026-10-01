/**
 * Portfolio's design system — the part the site owner can edit.
 *
 * Defaults are the signed-off design system v0.9. What is saved in
 * `portfolio_design.data` (migration 0025) holds only what the owner changed;
 * `resolveDesign` merges it over the defaults, so clearing a field restores it.
 *
 * Layout rules (rail 1 : main 3 grid, the φ ratio, fibonacci cells, the
 * horizontal axis…) do not live here: they are component logic, hard-coded in
 * `layout.ts`.
 */

export type Palette = { name: string; c500: string; c700: string; c900: string; mark: string }

/** One type size. When `min` differs from `max` the size scales with page width. */
export type TypeStyle = { min: number; max: number; weight: number; lh: number; track: number }

export type FontRole = 'display' | 'body' | 'meta'

export type TypeRole = 'd1' | 'd2' | 'head' | 'title' | 'body' | 'read' | 'label' | 'meta'

export type Fluid = { min: number; max: number }

export type Design = {
  colors: { paper: string; ink: string; ink2: string; ink3: string; line: string; ph: string }
  palettes: Record<string, Palette>
  signal: { color: string; mark: string }
  /** Google Fonts families loaded, and which family plays which role. */
  fonts: { library: string[]; display: string; body: string; meta: string; files: Record<string, string> }
  type: Record<TypeRole, TypeStyle>
  space: { s1: number; s2: number; s3: number; s4: number; s5: number; s6: Fluid; s7: Fluid; gut: Fluid; colGap: Fluid; cardGap: Fluid }
  radius: { r1: number; r2: number }
}

export const DEFAULT_DESIGN: Design = {
  colors: { paper: '#fefdfb', ink: '#1d1d1b', ink2: '#5f5c55', ink3: '#a39e92', line: '#e7e1d4', ph: '#dcd8cf' },
  palettes: {
    biz: { name: 'biz', c500: '#6fa8c3', c700: '#2f6f8c', c900: '#0d2c38', mark: '#cfe4ee' },
    baen: { name: 'bæn', c500: '#f19ea3', c700: '#b8505a', c900: '#3b2023', mark: '#fbd6d8' },
  },
  signal: { color: '#5c7560', mark: '#dfe8dc' },
  fonts: { library: ['Fraunces', 'Inter', 'Be Vietnam Pro'], display: 'Fraunces', body: 'Inter', meta: 'Be Vietnam Pro', files: {} },
  type: {
    d1: { min: 55, max: 89, weight: 400, lh: 1, track: -0.02 },
    d2: { min: 34, max: 55, weight: 400, lh: 1.05, track: -0.015 },
    head: { min: 26, max: 34, weight: 400, lh: 1.15, track: -0.01 },
    title: { min: 21, max: 21, weight: 400, lh: 1.2, track: -0.005 },
    body: { min: 14, max: 14, weight: 400, lh: 1.6, track: 0 },
    read: { min: 15, max: 15, weight: 400, lh: 1.75, track: 0 },
    label: { min: 13, max: 13, weight: 400, lh: 1.25, track: 0 },
    meta: { min: 11, max: 11, weight: 400, lh: 1.2, track: 0.04 },
  },
  space: {
    s1: 5, s2: 8, s3: 13, s4: 21, s5: 34,
    s6: { min: 55, max: 89 }, s7: { min: 89, max: 144 },
    gut: { min: 13, max: 34 }, colGap: { min: 13, max: 34 }, cardGap: { min: 8, max: 21 },
  },
  radius: { r1: 2, r2: 3 },
}

/** Which font family each type role uses. */
export const TYPE_FONT: Record<TypeRole, FontRole> = {
  d1: 'display', d2: 'display', head: 'display', title: 'display',
  body: 'body', read: 'body', label: 'meta', meta: 'meta',
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Merge the saved copy over the defaults down to the leaves. Arrays are replaced whole. */
function deepMerge<T>(base: T, over: unknown): T {
  if (!isObj(base) || !isObj(over)) return (over === undefined ? base : (over as T))
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined || v === null) continue
    out[k] = k in out ? deepMerge(out[k], v) : v
  }
  return out as T
}

export function resolveDesign(stored: unknown): Design {
  return deepMerge(DEFAULT_DESIGN, isObj(stored) ? stored : {})
}

/**
 * Fluid size: from `min` on a narrow page up to `max` at 1280px. Measured
 * against the container width (`cqw`), not the viewport, so the scaled-down
 * preview in admin renders exactly like the real page.
 */
export const fluid = ({ min, max }: Fluid) =>
  min === max ? `${min}px` : `clamp(${min}px, ${((max / 1280) * 100).toFixed(3)}cqw, ${max}px)`

const family = (name: string, fallback: string) => `"${name}", ${fallback}`

/** Every token as a CSS variable on the `.pf` root. */
export function cssVars(d: Design, paletteKey: string): Record<string, string> {
  const p = d.palettes[paletteKey] ?? Object.values(d.palettes)[0] ?? DEFAULT_DESIGN.palettes.biz
  const fam: Record<FontRole, string> = {
    display: family(d.fonts.display, 'Georgia, serif'),
    body: family(d.fonts.body, 'system-ui, sans-serif'),
    meta: family(d.fonts.meta, 'system-ui, sans-serif'),
  }
  const v: Record<string, string> = {
    '--paper': d.colors.paper, '--ink': d.colors.ink, '--ink-2': d.colors.ink2, '--ink-3': d.colors.ink3,
    '--line': d.colors.line, '--ph': d.colors.ph,
    '--acc-500': p.c500, '--acc-700': p.c700, '--acc-900': p.c900, '--mark': p.mark,
    '--signal': d.signal.color, '--signal-mark': d.signal.mark,
    '--f-display': fam.display, '--f-body': fam.body, '--f-meta': fam.meta,
    '--s-1': `${d.space.s1}px`, '--s-2': `${d.space.s2}px`, '--s-3': `${d.space.s3}px`,
    '--s-4': `${d.space.s4}px`, '--s-5': `${d.space.s5}px`,
    '--s-6': fluid(d.space.s6), '--s-7': fluid(d.space.s7),
    '--gut': fluid(d.space.gut), '--col-gap': fluid(d.space.colGap), '--card-gap': fluid(d.space.cardGap),
    '--r-1': `${d.radius.r1}px`, '--r-2': `${d.radius.r2}px`,
  }
  for (const [role, t] of Object.entries(d.type) as [TypeRole, TypeStyle][]) {
    v[`--t-${role}`] = `${t.weight} ${fluid(t)}/${t.lh} ${fam[TYPE_FONT[role]]}`
    v[`--tr-${role}`] = `${t.track}em`
  }
  return v
}

/**
 * One Google Fonts link per family. In a combined link, one family missing the
 * 300 weight breaks the whole link and takes every other family down with it;
 * kept separate, a bad family only breaks itself.
 */
export function fontHrefs(library: string[]): string[] {
  const fams = [...new Set(library.map((f) => f.trim()).filter(Boolean))]
  return fams.map(
    (f) => `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500&display=swap`,
  )
}

const FORMATS: Record<string, string> = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }

/**
 * `@font-face` rules for fonts the owner uploaded. One file is one family; the
 * weight range is left open so a variable font serves every weight it has.
 */
export function fontFaceCss(files: Record<string, string>): string {
  return Object.entries(files)
    .map(([family, url]) => {
      const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
      const format = FORMATS[ext] ? ` format('${FORMATS[ext]}')` : ''
      return `@font-face{font-family:"${family.replace(/"/g, '')}";src:url("${url}")${format};font-weight:100 900;font-display:swap}`
    })
    .join('\n')
}

/** A family name from an uploaded file: "Lora-Variable.woff2" → "Lora Variable". */
export const familyFromFile = (name: string) =>
  name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * The same tokens, spelled with the variable names of the design system
 * document (design-doc.html), so the admin can drive that page live. The
 * document keeps two palettes, biz and bæn; any further palette has no slot
 * there and is only seen on the port pages themselves.
 */
export function docVars(d: Design): Record<string, string> {
  const fam = { display: `"${d.fonts.display}", Georgia, serif`, body: `"${d.fonts.body}", system-ui, sans-serif`, meta: `"${d.fonts.meta}", system-ui, sans-serif` }
  const v: Record<string, string> = {
    '--paper': d.colors.paper, '--ink': d.colors.ink, '--ink-2': d.colors.ink2, '--ink-3': d.colors.ink3,
    '--line': d.colors.line, '--ph': d.colors.ph,
    '--signal': d.signal.color, '--signal-mark': d.signal.mark,
    '--f-display': fam.display, '--f-body': fam.body, '--f-meta': fam.meta,
    '--s-1': `${d.space.s1}px`, '--s-2': `${d.space.s2}px`, '--s-3': `${d.space.s3}px`,
    '--s-4': `${d.space.s4}px`, '--s-5': `${d.space.s5}px`,
    '--s-6': fluid(d.space.s6), '--s-7': fluid(d.space.s7),
    '--gut': fluid(d.space.gut), '--col-gap': fluid(d.space.colGap), '--card-gap': fluid(d.space.cardGap),
    '--r-1': `${d.radius.r1}px`, '--r-2': `${d.radius.r2}px`,
  }
  for (const [key, prefix] of [['biz', 'biz'], ['baen', 'baen']] as const) {
    const p = d.palettes[key]
    if (!p) continue
    v[`--${prefix}-500`] = p.c500
    v[`--${prefix}-700`] = p.c700
    v[`--${prefix}-900`] = p.c900
    v[`--${prefix}-mark`] = p.mark
  }
  const docName: Record<TypeRole, string> = {
    d1: 'display-1', d2: 'display-2', head: 'head', title: 'title', body: 'body', read: 'read', label: 'label', meta: 'meta',
  }
  const sizeName: Partial<Record<TypeRole, string>> = { d1: 'd1', d2: 'd2', head: 'head', title: 'title', body: 'body', read: 'read', label: 'label', meta: 'meta' }
  for (const [role, t] of Object.entries(d.type) as [TypeRole, TypeStyle][]) {
    const size = fluid(t)
    v[`--t-${docName[role]}`] = `${t.weight} ${size}/${t.lh} ${fam[TYPE_FONT[role]]}`
    if (sizeName[role]) v[`--sz-${sizeName[role]}`] = size
  }
  return v
}
