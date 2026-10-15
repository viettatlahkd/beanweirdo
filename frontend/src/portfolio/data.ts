import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { usePublishedPosts, type PostRow } from '../data/usePublishedPosts'
import { useModules } from '../data/useModules'
import { usePostAddresses } from '../data/usePostAddresses'
import { portPagePath, toPath, type PortSite } from '../lib/routes'
import { activeWords } from '../lib/routeWords'
import type { Origin } from '../lib/nav'
import type { Node } from 'api-contract'
import { parseBlocks, type Block, type PortPost } from './blocks'
import { resolveDesign, type Design } from './tokens'
import { navLinks, resolveContent, type NavPage, type PortContent } from './content'
import type { Chrome, HomeCard } from './PortfolioView'

/** A node of site 'port' (0032), with its look resolved and its blocks parsed. */
type PortPage = Pick<Node, 'id' | 'slug' | 'title' | 'intro' | 'status' | 'sort_order' | 'home_of' | 'parent_id'> & { look: string; blocks: Block[] }

const toPortPost = (p: PostRow): PortPost => ({
  id: p.id,
  module_id: p.module_id,
  en: p.en,
  vi: p.vi,
  lead: p.lead,
  kind: p.kind,
  date_label: p.date_label,
  slug: p.slug,
  pinned: p.pinned,
  hero_image_url: p.hero_image_url,
  published_at: p.published_at,
  shown_on: p.shown_on,
})

/**
 * A post's public address — the same as everywhere else on the site.
 *
 * `posts.slug` is only set when the owner types one by hand, so reading it
 * directly sent almost every portfolio link to '#'. The address book already
 * derives every post's slug (and honours a hand-typed one), so ask it.
 */
export function usePostHref(from?: Origin): (p: PortPost) => string {
  const { slugOf } = usePostAddresses()
  // The site the link sits on rides along, so the post page leads back to it.
  return useCallback((p: PortPost) => toPath({ area: 'public', screen: 'article', slug: slugOf(p.id), from }), [slugOf, from])
}

/** Published posts and module names — what every block needs to render. */
export function usePortSources(): { posts: PortPost[]; moduleTitles: Record<string, string>; moduleIds: string[]; loading: boolean } {
  const posts = usePublishedPosts()
  const modules = useModules()
  // Which pages list each post, by page id and old addresses: a port block's
  // "module" source is the page of that name, read through its rule.
  const pagesOf = useMemo(() => {
    const out = new Map<string, string[]>()
    for (const page of modules.data)
      for (const p of modules.postsOf(page.id)) out.set(p.id, [...(out.get(p.id) ?? []), page.id, ...page.aliases])
    return out
  }, [modules])
  return useMemo(
    () => ({
      posts: posts.data.map((p) => ({ ...toPortPost(p), pages: pagesOf.get(p.id) ?? [], tags: modules.tagsOf?.(p.id) ?? [] })),
      moduleTitles: Object.fromEntries(modules.data.map((m) => [m.id, m.title])),
      moduleIds: modules.data.map((m) => m.id),
      loading: posts.loading || modules.loading,
    }),
    [posts.data, posts.loading, modules.data, modules.loading, pagesOf],
  )
}

/**
 * One public port page, by its slug or as a child site's home, read directly
 * with the anon key. RLS (0032) only returns published pages, so a draft still
 * comes back as "not found" even when its exact address is typed in.
 */
export function usePublicPort(slug: string | null, site?: PortSite): { page: PortPage | null; design: Design; loading: boolean } {
  const [page, setPage] = useState<PortPage | null>(null)
  const [design, setDesign] = useState<Design>(() => resolveDesign({}))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      slug
        ? supabase.from('nodes').select('*').eq('site', 'port').eq('slug', slug).maybeSingle()
        : site
          ? supabase.from('nodes').select('*').eq('home_of', site).maybeSingle()
          : Promise.resolve({ data: null }),
      supabase.from('portfolio_design').select('data').eq('id', true).maybeSingle(),
    ]).then(([p, d]: [{ data: Record<string, unknown> | null }, { data: { data: unknown } | null }]) => {
      if (!alive) return
      const row = p.data
      setPage(row ? toPortPage(row) : null)
      setDesign(resolveDesign(d.data?.data))
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [slug, site])

  return { page, design, loading }
}

/** The shared portfolio content and the published pages, read with the anon key. */
export function usePortChrome(): { content: PortContent; pages: PortPage[]; loading: boolean } {
  const [state, setState] = useState<{ content: PortContent; pages: PortPage[]; loading: boolean }>({
    content: resolveContent({}),
    pages: [],
    loading: true,
  })
  useEffect(() => {
    let alive = true
    Promise.all([
      supabase.from('site_settings').select('data').eq('id', true).maybeSingle(),
      supabase.from('nodes').select('*').eq('site', 'port').order('sort_order', { ascending: true }),
    ]).then(([s, p]: [{ data: { data: Record<string, unknown> } | null }, { data: Record<string, unknown>[] | null }]) => {
      if (!alive) return
      setState({
        content: resolveContent(s.data?.data?.portfolio),
        pages: (p.data ?? []).map(toPortPage),
        loading: false,
      })
    })
    return () => {
      alive = false
    }
  }, [])
  return state
}

const toPortPage = (row: Record<string, unknown>): PortPage => ({
  id: String(row.id),
  slug: String(row.slug),
  title: String(row.title),
  intro: String(row.intro ?? ''),
  look: String(row.look ?? 'biz'),
  blocks: parseBlocks(row.blocks),
  status: row.status === 'published' || row.status === 'archived' ? row.status : 'draft',
  sort_order: Number(row.sort_order ?? 0),
  home_of: row.home_of === 'biz' || row.home_of === 'bean' ? row.home_of : null,
  parent_id: typeof row.parent_id === 'string' ? row.parent_id : null,
})

/**
 * The way from bean's home (`/bean`) to the journal's front page
 * (`/journal`), which used to sit under it; no other page has one.
 */
export function onwardOf(page: Pick<PortPage, 'home_of'>): { href: string; label: string } | undefined {
  if (page.home_of !== 'bean') return undefined
  return { href: toPath({ area: 'public', screen: 'landing' }), label: activeWords().details }
}

/** Header links and footer for a page; `current` marks the link of the page being shown. */
export function buildChrome(content: PortContent, pages: NavPage[], current?: string): Chrome {
  return { content, links: navLinks(content, pages), current }
}

/**
 * The cards on the main page: the pages the owner featured, in their order —
 * or, before anything is set, every published page. A featured page that has
 * since been unpublished is skipped rather than shown as a dead link.
 */
export function homeCards(content: PortContent, pages: PortPage[], design: Design): HomeCard[] {
  const live = pages.filter((p) => p.status === 'published')
  const features = content.home.features.length
    ? content.home.features
    : live.map((p) => ({ pageId: p.id, label: '', intro: '', image: '' }))
  return features.flatMap((f) => {
    const page = live.find((p) => p.id === f.pageId)
    if (!page) return []
    return [{
      href: portPagePath(page, pages),
      title: page.title,
      label: f.label || design.palettes[page.look]?.name || '',
      intro: f.intro || page.intro,
      image: f.image,
      palette: page.look,
    }]
  })
}
