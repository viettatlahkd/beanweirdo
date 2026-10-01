import { useNav } from '../lib/nav'
import { PortfolioView } from '../portfolio/PortfolioView'
import { postHref, usePortSources, usePublicPort } from '../portfolio/data'

/**
 * /portfolio/<slug> — một trang port đã đăng.
 *
 * Đầy bề ngang, không có thanh trái của site: port có topbar và footer riêng
 * (06.1, 06.17).
 */
export function PortfolioPage() {
  const nav = useNav()
  const { page, design, loading } = usePublicPort(nav.slug)
  const src = usePortSources()

  if (loading) return null
  if (!page) {
    return (
      <div style={{ padding: '120px 34px', fontFamily: 'Georgia, serif', fontSize: 34 }}>
        không có trang này
      </div>
    )
  }
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
    />
  )
}
