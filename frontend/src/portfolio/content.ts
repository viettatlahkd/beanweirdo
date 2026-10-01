/**
 * Fixed content shared by every portfolio page: header, footer, the main
 * portfolio page (/portfolio) and the about page (/portfolio/about).
 *
 * Stored under `site_settings.data.portfolio`, next to the copy that Content
 * management's "Nội dung trang" tab already edits — same row, same autosave,
 * no migration. Only what the owner changed is stored; `resolveContent` fills
 * the rest from DEFAULT_CONTENT.
 */

export type LinkItem = { label: string; url: string }

/** A header link the owner has touched: renamed, moved or hidden. */
export type NavOverride = { key: string; label?: string; hidden?: boolean }

export type Feature = { pageId: string; label: string; intro: string; image: string }

export type PortContent = {
  header: { brand: string; right: string; links: NavOverride[] }
  footer: { left: string; right: string }
  home: { title: string; intro: string; features: Feature[] }
  about: {
    text: string
    tags: string[]
    /** Several signatures can be kept; `signUse` picks the one the about page shows. */
    signs: string[]
    signUse: number
    imageLeft: string
    imageRight: string
    reach: LinkItem[]
  }
}

export const DEFAULT_CONTENT: PortContent = {
  header: { brand: 'bæn.', right: 'inside the mind of hkd', links: [] },
  footer: { left: 'bæn. 2026', right: 'by hkd' },
  home: { title: 'bæn.', intro: 'inside the mind of hkd', features: [] },
  about: {
    text: "Mostly I'm trying to understand how things work — a business, a roast curve, a person. This is where I write it down as I go.",
    tags: ['ops', 'compliance', 'coffee', 'philo'],
    signs: ['bæn. — inside the mind of hkd'],
    signUse: 0,
    imageLeft: '',
    imageRight: '',
    reach: [
      { label: 'email', url: '' },
      { label: 'linkedin', url: '' },
      { label: 'cv', url: '' },
    ],
  },
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Stored groups replace their defaults field by field; arrays replace whole. */
export function resolveContent(stored: unknown): PortContent {
  const s = isObj(stored) ? stored : {}
  const group = <K extends keyof PortContent>(k: K): PortContent[K] =>
    ({ ...DEFAULT_CONTENT[k], ...(isObj(s[k]) ? (s[k] as object) : {}) }) as PortContent[K]
  return { header: group('header'), footer: group('footer'), home: group('home'), about: group('about') }
}

/** The signature the about page shows — the chosen one, or the first if the choice was removed. */
export function aboutSign(about: PortContent['about']): string {
  return about.signs[about.signUse] ?? about.signs[0] ?? ''
}

export type NavPage = { id: string; slug: string; title: string; status: string }
export type NavLink = { key: string; label: string; href: string; hidden: boolean }

/**
 * The header links: the main page, every published port page, and about —
 * in that order unless the owner reordered them. A newly published page
 * appears on its own; an unpublished one drops out even if it was renamed.
 */
export function navLinks(content: PortContent, pages: NavPage[], portfolioWord = 'portfolio'): NavLink[] {
  const auto: NavLink[] = [
    { key: 'home', label: content.home.title || 'portfolio', href: `/${portfolioWord}`, hidden: false },
    ...pages
      .filter((p) => p.status === 'published')
      .map((p) => ({ key: `page:${p.id}`, label: p.title, href: `/${portfolioWord}/${p.slug}`, hidden: false })),
    { key: 'about', label: 'about', href: `/${portfolioWord}/about`, hidden: false },
  ]
  const byKey = new Map(auto.map((l) => [l.key, l]))
  const out: NavLink[] = []
  for (const o of content.header.links) {
    const l = byKey.get(o.key)
    if (!l) continue
    out.push({ ...l, label: o.label?.trim() ? o.label : l.label, hidden: !!o.hidden })
    byKey.delete(o.key)
  }
  return [...out, ...byKey.values()]
}
