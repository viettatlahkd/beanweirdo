import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { usePublishedPosts, type PostRow } from '../data/usePublishedPosts'
import { useModules } from '../data/useModules'
import { usePostAddresses } from '../data/usePostAddresses'
import { toPath } from '../lib/routes'
import { parseBlocks, type Block, type PortPost } from './blocks'
import { resolveDesign, type Design } from './tokens'
import { navLinks, resolveContent, type NavPage, type PortContent } from './content'
import type { Chrome, HomeCard } from './PortfolioView'
import { activeWords } from '../lib/routeWords'

export type PortPage = {
  id: string
  slug: string
  title: string
  intro: string
  palette: string
  blocks: Block[]
  status: 'draft' | 'published' | 'archived'
  sortOrder: number
}

export const toPortPost = (p: PostRow): PortPost => ({
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
})

/**
 * A post's public address — the same as everywhere else on the site.
 *
 * `posts.slug` is only set when the owner types one by hand, so reading it
 * directly sent almost every portfolio link to '#'. The address book already
 * derives every post's slug (and honours a hand-typed one), so ask it.
 */
export function usePostHref(): (p: PortPost) => string {
  const { slugOf } = usePostAddresses()
  return useCallback((p: PortPost) => toPath({ area: 'public', screen: 'article', slug: slugOf(p.id) }), [slugOf])
}

/** Published posts and module names — what every block needs to render. */
export function usePortSources(): { posts: PortPost[]; moduleTitles: Record<string, string>; moduleIds: string[]; loading: boolean } {
  const posts = usePublishedPosts()
  const modules = useModules()
  return useMemo(
    () => ({
      posts: posts.data.map(toPortPost),
      moduleTitles: Object.fromEntries(modules.data.map((m) => [m.id, m.title])),
      moduleIds: modules.data.map((m) => m.id),
      loading: posts.loading || modules.loading,
    }),
    [posts.data, posts.loading, modules.data, modules.loading],
  )
}

/**
 * One public port page, read directly with the anon key. RLS (0025) only
 * returns published pages, so a draft still comes back as "not found" even
 * when its exact address is typed in.
 */
export function usePublicPort(slug: string | null): { page: PortPage | null; design: Design; loading: boolean } {
  const [page, setPage] = useState<PortPage | null>(null)
  const [design, setDesign] = useState<Design>(() => resolveDesign({}))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      slug ? supabase.from('portfolio_pages').select('*').eq('slug', slug).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('portfolio_design').select('data').eq('id', true).maybeSingle(),
    ]).then(([p, d]: [{ data: Record<string, unknown> | null }, { data: { data: unknown } | null }]) => {
      if (!alive) return
      const row = p.data
      setPage(
        row
          ? {
              id: String(row.id),
              slug: String(row.slug),
              title: String(row.title),
              intro: String(row.intro ?? ''),
              palette: String(row.palette ?? 'biz'),
              blocks: parseBlocks(row.blocks),
              status: row.status === 'published' || row.status === 'archived' ? row.status : 'draft',
              sortOrder: Number(row.sort_order ?? 0),
            }
          : null,
      )
      setDesign(resolveDesign(d.data?.data))
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [slug])

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
      supabase.from('portfolio_pages').select('*').order('sort_order', { ascending: true }),
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

export const toPortPage = (row: Record<string, unknown>): PortPage => ({
  id: String(row.id),
  slug: String(row.slug),
  title: String(row.title),
  intro: String(row.intro ?? ''),
  palette: String(row.palette ?? 'biz'),
  blocks: parseBlocks(row.blocks),
  status: row.status === 'published' || row.status === 'archived' ? row.status : 'draft',
  sortOrder: Number(row.sort_order ?? 0),
})

/** Header links and footer for a page; `current` marks the link of the page being shown. */
export function buildChrome(content: PortContent, pages: NavPage[], current?: string): Chrome {
  return { content, links: navLinks(content, pages, activeWords().portfolio), current }
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
  const word = activeWords().portfolio
  return features.flatMap((f) => {
    const page = live.find((p) => p.id === f.pageId)
    if (!page) return []
    return [{
      href: `/${word}/${page.slug}`,
      title: page.title,
      label: f.label || design.palettes[page.palette]?.name || '',
      intro: f.intro || page.intro,
      image: f.image,
      palette: page.palette,
    }]
  })
}
