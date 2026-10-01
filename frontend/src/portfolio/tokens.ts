/**
 * Design system của Portfolio — phần chủ site chỉnh được.
 *
 * Giá trị mặc định là design system v0.9 đã chốt. Bản lưu trong
 * `portfolio_design.data` (migration 0025) chỉ chứa những gì chủ site đổi;
 * `resolveDesign` gộp nó lên mặc định, nên xoá một ô là trả nó về như cũ.
 *
 * Luật bố cục (lưới rail 1 : main 3, tỉ lệ φ, ô fibonacci, trục hoành…) không
 * nằm ở đây: đó là logic của component, viết thẳng trong `layout.ts`.
 */

export type Palette = { name: string; c500: string; c700: string; c900: string; mark: string }

/** Một cỡ chữ. `min` khác `max` thì cỡ co giãn theo bề ngang trang. */
export type TypeStyle = { min: number; max: number; weight: number; lh: number; track: number }

export type FontRole = 'display' | 'body' | 'meta'

export type TypeRole = 'd1' | 'd2' | 'head' | 'title' | 'body' | 'read' | 'label' | 'meta'

export type Fluid = { min: number; max: number }

export type Design = {
  colors: { paper: string; ink: string; ink2: string; ink3: string; line: string; ph: string }
  palettes: Record<string, Palette>
  signal: { color: string; mark: string }
  /** Các họ chữ Google Fonts đã nạp, và họ nào giữ vai nào. */
  fonts: { library: string[]; display: string; body: string; meta: string }
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
  fonts: { library: ['Fraunces', 'Inter', 'Be Vietnam Pro'], display: 'Fraunces', body: 'Inter', meta: 'Be Vietnam Pro' },
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

/** Vai chữ nào dùng họ nào. */
export const TYPE_FONT: Record<TypeRole, FontRole> = {
  d1: 'display', d2: 'display', head: 'display', title: 'display',
  body: 'body', read: 'body', label: 'meta', meta: 'meta',
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Gộp bản lưu lên mặc định, sâu tới tận lá. Mảng thay nguyên. */
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
 * Cỡ co giãn: từ `min` ở trang hẹp tới `max` ở trang 1280px. Đo theo bề ngang
 * khung (`cqw`), không theo cửa sổ, để bản xem trước thu nhỏ trong admin vẽ
 * đúng như trang thật.
 */
export const fluid = ({ min, max }: Fluid) =>
  min === max ? `${min}px` : `clamp(${min}px, ${((max / 1280) * 100).toFixed(3)}cqw, ${max}px)`

const family = (name: string, fallback: string) => `"${name}", ${fallback}`

/** Toàn bộ token thành biến CSS cho gốc `.pf`. */
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
 * Mỗi họ một link Google Fonts. Gộp chung thì một họ thiếu nét 300 làm hỏng
 * cả link và kéo mọi họ khác hỏng theo; tách ra thì họ nào sai chỉ họ đó.
 */
export function fontHrefs(library: string[]): string[] {
  const fams = [...new Set(library.map((f) => f.trim()).filter(Boolean))]
  return fams.map(
    (f) => `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500&display=swap`,
  )
}
