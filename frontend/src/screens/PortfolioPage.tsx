import { useNav } from '../lib/nav'
import { PortAbout, PortHome, PortfolioView } from '../portfolio/PortfolioView'
import { buildChrome, homeCards, postHref, usePortChrome, usePortSources, usePublicPort } from '../portfolio/data'
import { activeWords } from '../lib/routeWords'

/**
 * The public portfolio: /portfolio (main page), /portfolio/about and
 * /portfolio/<slug>. Full width, without the site's left rail — every page
 * wears the portfolio's own header and footer (06.1, 06.17).
 */
function NotFound() {
  return <div style={{ padding: '120px 34px', fontFamily: 'Georgia, serif', fontSize: 34 }}>không có trang này</div>
}

export function PortfolioPage() {
  const nav = useNav()
  const { page, design, loading } = usePublicPort(nav.slug)
  const chrome = usePortChrome()
  const src = usePortSources()

  if (loading || chrome.loading) return null
  if (!page) return <NotFound />
  return (
    <PortfolioView
      title={page.title}
      intro={page.intro}
      palette={page.palette}
      blocks={page.blocks}
      design={design}
      posts={src.posts}
      moduleTitles={src.moduleTitles}
      postHref={postHref}
      chrome={buildChrome(chrome.content, chrome.pages, `page:${page.id}`)}
    />
  )
}

export function PortfolioHome() {
  const { design, loading } = usePublicPort(null)
  const chrome = usePortChrome()
  if (loading || chrome.loading) return null
  return (
    <PortHome
      design={design}
      chrome={buildChrome(chrome.content, chrome.pages, 'home')}
      cards={homeCards(chrome.content, chrome.pages, design)}
    />
  )
}

export function PortfolioAbout() {
  const { design, loading } = usePublicPort(null)
  const chrome = usePortChrome()
  if (loading || chrome.loading) return null
  const word = activeWords().portfolio
  return (
    <PortAbout
      design={design}
      chrome={buildChrome(chrome.content, chrome.pages, 'about')}
      posts={chrome.pages.filter((p) => p.status === 'published').map((p) => ({ label: p.title, url: `/${word}/${p.slug}` }))}
    />
  )
}
