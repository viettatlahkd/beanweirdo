import { useEffect } from 'react'
import { useNav } from '../lib/nav'
import { PortAbout, PortHome, PortfolioView } from '../portfolio/PortfolioView'
import { buildChrome, homeCards, onwardOf, usePortChrome, usePostHref, usePortSources, usePublicPort } from '../portfolio/data'
import { portPagePath, portSiteOf } from '../lib/routes'

/**
 * The public portfolio pages: / (main page), /about, the child sites' homes
 * (/biz, /bean) and their pages (/biz/<slug>, /bean/<slug>). Full width, without the site's
 * left rail — every page wears the portfolio's own header and footer (06.1, 06.17).
 */
function NotFound() {
  return <div style={{ padding: '120px 34px', fontFamily: 'Georgia, serif', fontSize: 34 }}>không có trang này</div>
}

export function PortfolioPage() {
  const nav = useNav()
  const { page, design, loading } = usePublicPort(nav.slug, nav.portSite)
  const chrome = usePortChrome()
  const src = usePortSources()
  const postHref = usePostHref(page && !chrome.loading ? portSiteOf(page, chrome.pages) : undefined)

  // A page opened at another site's address (a home by its slug, /biz-hkd; a
  // bean page under /biz/<slug>, its address before bean had pages) moves to its own.
  useEffect(() => {
    if (!page || chrome.loading) return
    const own = portPagePath(page, chrome.pages)
    if (own === window.location.pathname) return
    window.history.replaceState({}, '', own)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [page, chrome.loading, chrome.pages])

  if (loading || chrome.loading) return null
  if (!page) return <NotFound />
  return (
    <PortfolioView
      title={page.title}
      intro={page.intro}
      palette={page.look}
      blocks={page.blocks}
      design={design}
      posts={src.posts}
      moduleTitles={src.moduleTitles}
      postHref={postHref}
      onward={onwardOf(page)}
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
  return (
    <PortAbout
      design={design}
      chrome={buildChrome(chrome.content, chrome.pages, 'about')}
      posts={chrome.pages.filter((p) => p.status === 'published').map((p) => ({ label: p.title, url: portPagePath(p, chrome.pages) }))}
    />
  )
}
