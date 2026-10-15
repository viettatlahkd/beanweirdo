import { Article } from './Article'
import { PortBars } from '../portfolio/PortfolioView'
import { buildChrome, usePortChrome, usePublicPort } from '../portfolio/data'
import { useNav } from '../lib/nav'

/**
 * `/p/<slug>`: a post on its own page. Posts are one store shown on biz, bean
 * and the blog, so the page wears none of their frames: only the shared
 * header and footer the port pages wear, and no blog sidebar (owner, 2026-10-15).
 */
export function PostPage() {
  const nav = useNav()
  const { design, loading } = usePublicPort(null)
  const chrome = usePortChrome()
  if (loading || chrome.loading) return null
  const homeOf = (site: 'biz' | 'bean') => chrome.pages.find((p) => p.home_of === site)
  const from = nav.articleFrom
  // Coming from biz or bean, the page wears that home's palette and lights its link.
  const home = from === 'biz' || from === 'bean' ? homeOf(from) : undefined
  return (
    <PortBars
      design={design}
      palette={home?.look ?? Object.keys(design.palettes)[0] ?? 'biz'}
      chrome={buildChrome(chrome.content, chrome.pages, home ? `page:${home.id}` : undefined)}
    >
      <Article homes={{ biz: homeOf('biz')?.title, bean: homeOf('bean')?.title }} />
    </PortBars>
  )
}
