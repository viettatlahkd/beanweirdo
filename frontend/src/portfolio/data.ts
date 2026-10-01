import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { usePublishedPosts, type PostRow } from '../data/usePublishedPosts'
import { useModules } from '../data/useModules'
import { toPath } from '../lib/routes'
import { parseBlocks, type Block, type PortPost } from './blocks'
import { resolveDesign, type Design } from './tokens'

export type PortPage = {
  id: string
  slug: string
  title: string
  intro: string
  palette: string
  blocks: Block[]
  status: 'draft' | 'published'
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

/** Địa chỉ công khai của một bài — đúng như mọi chỗ khác trên site. */
export const postHref = (p: PortPost) => (p.slug ? toPath({ area: 'public', screen: 'article', slug: p.slug }) : '#')

/** Bài đã đăng và tên module — thứ mọi khối cần để vẽ. */
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
 * Một trang port công khai, đọc thẳng bằng anon key. RLS (0025) chỉ trả trang
 * đã đăng, nên nháp gõ đúng địa chỉ vẫn ra "không có".
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
              status: row.status === 'published' ? 'published' : 'draft',
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
