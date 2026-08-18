import type { NavGroup } from './site'
import type { Screen } from '../lib/nav'

/**
 * A sidebar glyph. Every page in the nav gets its own small mark rather than an
 * icon set — the shapes are drawn from border/background alone so they repaint
 * with the row's `currentColor` when the sidebar flips to its dark theme.
 *
 * Verbatim from the prototype's `NAV[].sh`
 * (`design/prototype/Coffee Study Blog v4.dc.html`).
 */
export type Glyph = {
  w: string
  h: string
  /** border-radius */
  r: string
  /** shorthand `border`, then the two sides that override it */
  bd: string
  brw: string
  bbw: string
  bg: string
  tf: string
}

export type NavItem = {
  /** Stable key — also the `[[token]]` name used by the System-conventions copy. */
  key: string
  group: NavGroup
  label: string
  desc: string
  screen: Screen
  /** Template pages nest under a "Templates" head inside Admin. */
  sub?: boolean
  shape: Glyph
}

const glyph = (g: Partial<Glyph>): Glyph => ({
  w: '10px',
  h: '10px',
  r: '0',
  bd: '1px solid currentColor',
  brw: '1px',
  bbw: '1px',
  bg: 'transparent',
  tf: 'none',
  ...g,
})

export const NAV: NavItem[] = [
  {
    key: 'landing',
    group: 'Public',
    label: 'Trang chủ',
    desc: 'tổng quan module',
    screen: 'landing',
    shape: glyph({ r: '50%' }),
  },
  {
    key: 'home',
    group: 'Public',
    label: 'Mục lục',
    desc: 'danh sách toàn bộ bài',
    screen: 'home',
    shape: glyph({ h: '1px', bd: '0', brw: '0', bbw: '0', bg: 'currentColor' }),
  },
  {
    key: 'notes',
    group: 'Public',
    label: 'Ghi 01',
    desc: 'bite-size — ghi chép rời',
    screen: 'notes',
    shape: glyph({ w: '9px', h: '9px', bd: '0', brw: '0', bbw: '0', bg: '#6FA8C0' }),
  },
  {
    key: 'hours',
    group: 'Practice',
    label: 'Ghi 02',
    desc: 'daily journal',
    screen: 'hours',
    shape: glyph({ r: '50% 50% 50% 0', bd: '0', brw: '0', bbw: '0', bg: '#C25C7C' }),
  },
  {
    key: 'cms',
    group: 'Admin',
    label: 'Content management',
    desc: 'sơ đồ và nội dung',
    screen: 'cms',
    shape: glyph({ w: '9px', h: '11px', bbw: '4px' }),
  },
  {
    key: 'art',
    group: 'Admin',
    label: 'Design system',
    desc: 'màu, chữ, khoảng cách',
    screen: 'art',
    shape: glyph({ r: '50%', bd: '3px solid currentColor', brw: '3px', bbw: '3px' }),
  },
  {
    key: 'logic',
    group: 'Admin',
    label: 'System conventions',
    desc: 'quy tắc FE / BE',
    screen: 'logic',
    shape: glyph({ w: '8px', h: '8px', tf: 'rotate(45deg)' }),
  },
  {
    key: 'archive',
    group: 'Admin',
    label: 'Archive',
    desc: 'toàn bộ bài theo thời gian',
    screen: 'archive',
    shape: glyph({ w: '13px', h: '5px', r: '3px' }),
  },
  {
    key: 'article',
    group: 'Admin',
    label: 'Article',
    desc: 'khung bài dài',
    screen: 'article',
    sub: true,
    shape: glyph({ w: '11px', h: '7px', brw: '0' }),
  },
  {
    key: 'report',
    group: 'Admin',
    label: 'Field report',
    desc: 'khung ghi hiện trường',
    screen: 'report',
    sub: true,
    shape: glyph({ w: '11px', h: '9px' }),
  },
  {
    key: 'longform',
    group: 'Admin',
    label: 'Long-form',
    desc: 'khung bài dịch dài',
    screen: 'article',
    sub: true,
    shape: glyph({ w: '11px', h: '11px', brw: '3px' }),
  },
  {
    key: 'memo',
    group: 'Admin',
    label: 'Memo',
    desc: 'khung ghi nếm thử',
    screen: 'memo',
    sub: true,
    shape: glyph({ w: '10px', h: '8px', r: '2px' }),
  },
  {
    key: 'cards',
    group: 'Admin',
    label: 'Info cards',
    desc: 'khung thẻ gập',
    screen: 'cards',
    sub: true,
    shape: glyph({ w: '11px', h: '4px' }),
  },
]

/** The head row the three template pages nest under. */
export const TEMPLATES_HEAD = {
  label: 'Templates',
  desc: 'khung bài mẫu',
  shape: glyph({ w: '11px', h: '8px', r: '0 2px 2px 0', brw: '4px' }),
}

export const navByKey = (key: string): NavItem | undefined => NAV.find((n) => n.key === key)

export const navLabel = (key: string): string => navByKey(key)?.label ?? key

/**
 * System-conventions copy references pages by `[[key]]` so renaming a page in
 * the CMS rewrites every rule that mentions it. Unknown tokens are left alone.
 */
export function interpolateNav(text: string, sections: Record<NavGroup, string>): string {
  if (!text.includes('[[')) return text
  return text.replace(/\[\[([a-zA-Z]+)\]\]/g, (all, key: string) => {
    if (key === 'secPublic') return sections.Public
    if (key === 'secPractice') return sections.Practice
    if (key === 'secAdmin') return sections.Admin
    return navByKey(key)?.label ?? all
  })
}
