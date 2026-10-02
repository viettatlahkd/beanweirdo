import { useEffect } from 'react'
import { useSiteCopy } from '../data/useSiteCopy'
import { RAW_FONTS, RAW_GARDEN, RAW_INK, RAW_PAPER, tokenVar } from './tokens'

/**
 * The blog's design system — the same mechanism as Portfolio's
 * (`portfolio/tokens.ts`): shipped defaults, and only what the owner changed
 * stored (here in `site_settings.data.design`, keyed `group.name`), merged over
 * them. The difference is how it reaches the page: blog screens style
 * themselves with the tokens in `design/tokens.ts`, each of which reads a CSS
 * variable, so applying the design is setting those variables on the page.
 *
 * Only colours and the two families are tokens on the blog. Sizes, spacing and
 * radii are written into each screen, so they are not settings yet.
 */

export type BlogDesign = Record<string, string | null | undefined>

export const BLOG_COLORS: { group: 'paper' | 'ink' | 'garden'; title: string; raw: Record<string, string>; names: Record<string, string> }[] = [
  {
    group: 'paper',
    title: 'Nền',
    raw: RAW_PAPER,
    names: { cream: 'Nền trang', white: 'Nền thẻ', hover: 'Nền khi rê chuột', rule: 'Đường kẻ' },
  },
  {
    group: 'ink',
    title: 'Chữ',
    raw: RAW_INK,
    names: { base: 'Chữ chính', body: 'Chữ thân', strong: 'Chữ đậm', mid: 'Chữ vừa', soft: 'Chữ phụ', muted: 'Chữ mờ', faint: 'Chữ rất mờ', green: 'Liên kết', moss: 'Nhấn sâu' },
  },
  {
    group: 'garden',
    title: 'Bảng màu vườn',
    raw: RAW_GARDEN,
    names: {
      blush: 'Hồng',
      leaf: 'Lá',
      apricot: 'Mơ',
      moss: 'Rêu',
      cinnamon: 'Quế',
      petalTint: 'Hồng nhạt',
      petalTint2: 'Hồng nhạt 2',
      leafTint: 'Lá nhạt',
      leafTint2: 'Lá nhạt 2',
      honeyTint: 'Mật nhạt',
      honeyTint2: 'Mật nhạt 2',
    },
  },
]

export const BLOG_FONTS: { key: 'font.serif' | 'font.sans'; title: string; fallback: string }[] = [
  { key: 'font.serif', title: 'Font tiêu đề', fallback: RAW_FONTS.serif },
  { key: 'font.sans', title: 'Font nội dung', fallback: RAW_FONTS.sans },
]

const HEX = /^#[0-9a-fA-F]{6}$/
/** A Google Fonts family name: letters, digits and spaces — nothing that could break out of a CSS string. */
const FAMILY = /^[A-Za-z0-9 ]{2,60}$/

/** The CSS variables for what the owner changed; anything unset or malformed is left to the default. */
export function blogVars(stored: BlogDesign | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(stored ?? {})) {
    if (typeof value !== 'string') continue
    const [group, name] = key.split('.')
    if (group === 'font') {
      const font = BLOG_FONTS.find((f) => f.key === key)
      if (font && FAMILY.test(value)) out[tokenVar('font', name)] = `'${value}', ${font.fallback}`
      continue
    }
    const known = BLOG_COLORS.find((g) => g.group === group)
    if (known && name in known.raw && HEX.test(value)) out[tokenVar(group, name)] = value
  }
  return out
}

/** The stylesheet that loads the chosen families, or null when both are the shipped ones. */
export function blogFontHref(stored: BlogDesign | null | undefined): string | null {
  const families = BLOG_FONTS.map((f) => stored?.[f.key]).filter((v): v is string => typeof v === 'string' && FAMILY.test(v))
  if (families.length === 0) return null
  const q = families.map((f) => `family=${f.replace(/ /g, '+')}:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400`).join('&')
  return `https://fonts.googleapis.com/css2?${q}&display=swap`
}

const LINK_ID = 'bw-design-fonts'

/**
 * Put the owner's blog design on the page while `active` (the reader's site and
 * Practice), and take it off otherwise — the CMS keeps the shipped look, as
 * Portfolio's design only ever dresses port pages.
 */
export function useBlogDesign(active: boolean): void {
  const { overrides } = useSiteCopy()
  const stored = (overrides as { design?: BlogDesign }).design
  useEffect(() => {
    const root = document.documentElement
    const vars = active ? blogVars(stored) : {}
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
    const href = active ? blogFontHref(stored) : null
    let link = document.getElementById(LINK_ID) as HTMLLinkElement | null
    if (href) {
      if (!link) {
        link = document.createElement('link')
        link.id = LINK_ID
        link.rel = 'stylesheet'
        document.head.appendChild(link)
      }
      if (link.href !== href) link.href = href
    } else link?.remove()
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k)
    }
  }, [active, stored])
}
