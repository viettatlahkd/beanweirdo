import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { useNav, type Nav, type Origin } from '../lib/nav'
import { toPath } from '../lib/routes'
import { openModule } from '../lib/moduleTarget'
import { SITE_CHIPS } from '../components/PostHead'
import type { PageRow } from '../data/useModules'
import { sans } from '../design/tokens'

/** The names of biz's and bean's home pages ("strat & ops", "art & culture"), for the way back. */
export type Homes = Partial<Record<'biz' | 'bean', string>>

type Back = { href: string; site: string; home: string; color: string; go?: () => void }

/**
 * Where "Quay lại" leads: the door the post was opened through. A post sits in
 * one store and shows on several homes, so its page cannot lead back to "its"
 * site; it leads back the way the reader came (owner, 2026-10-15).
 */
function backOf(from: Origin, nav: Nav, module: PageRow | undefined, homes: Homes): Back {
  const blog = SITE_CHIPS.blog
  switch (from) {
    case 'biz':
    case 'bean':
      return {
        href: toPath({ area: 'public', screen: 'portfolioPage', site: from }),
        site: SITE_CHIPS[from].name,
        home: homes[from] ?? 'Trang chủ',
        color: SITE_CHIPS[from].color,
      }
    case 'blog':
      return { href: toPath({ area: 'public', screen: 'landing' }), site: blog.name, home: 'Trang chủ', color: blog.color, go: nav.goLanding }
    case 'admin':
      return { href: toPath({ area: 'admin', screen: 'cms', tab: 'posts' }), site: 'Nội dung', home: 'Danh sách bài', color: blog.color, go: () => nav.goCms('posts') }
    case 'archive':
      return { href: toPath({ area: 'admin', screen: 'archive' }), site: 'Nội dung', home: 'Lưu trữ', color: blog.color, go: nav.goArchive }
    default:
      // Through moduleTarget: Ghi 01 and Ghi 02 have their own screens.
      return module
        ? { href: toPath({ area: 'public', screen: 'module', moduleId: module.id }), site: blog.name, home: module.title, color: blog.color, go: () => openModule(nav, module) }
        : { href: toPath({ area: 'public', screen: 'landing' }), site: blog.name, home: 'Trang chủ', color: blog.color, go: nav.goLanding }
  }
}

type Head = { id: string; text: string }

const RAIL_W = 200
const RAIL_EDGE = 32
const RAIL_GAP = 32

/**
 * The post page's left rail (mock "B + cột trái của C"): the way back, then
 * the post's own headings, held against the screen's left edge and centred
 * top to bottom while reading (owner, 2026-10-15). The templates' text
 * columns differ in width, so whether it fits beside the column is measured,
 * not assumed. With no room (a phone, a wide template on a narrow screen) the
 * rail gives way to one back link above the post.
 */
export function PostRail({
  from,
  module,
  homes = {},
  mobile,
  children,
}: {
  from: Origin
  module: PageRow | undefined
  homes?: Homes
  mobile: boolean
  children: ReactNode
}) {
  const nav = useNav()
  const back = backOf(from, nav, module, homes)
  const box = useRef<HTMLDivElement>(null)
  const [heads, setHeads] = useState<Head[]>([])
  const [on, setOn] = useState<string | null>(null)
  // Whether the rail fits left of the text column. Undefined: not measured
  // yet, when neither the rail nor the back line shows, so the measuring is
  // not thrown off by a line that is about to go.
  const [room, setRoom] = useState<boolean>()

  // The headings are read off the rendered post rather than its data: six
  // templates store sections six ways, but all of them draw h1–h3. The page's
  // own head is left out (it is the title), and so are the fold marks
  // long-form puts inside its headings. The rail is keyed by post, so reading
  // once on mount is enough.
  useEffect(() => {
    const root = box.current
    if (!root) return
    const els = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3')).filter(
      (el) => !el.closest('[data-post-head]') && clean(el.textContent),
    )
    els.forEach((el, i) => {
      if (!el.id) el.id = `muc-${i + 1}`
    })
    setHeads(els.map((el) => ({ id: el.id, text: clean(el.textContent) })))

    const place = () => {
      const head = root.querySelector<HTMLElement>('[data-post-head]')
      setRoom(!!head && head.getBoundingClientRect().left >= RAIL_EDGE + RAIL_W + RAIL_GAP)
    }
    const light = () => {
      let at: string | null = null
      for (const el of els) if (el.getBoundingClientRect().top < 120) at = el.id
      setOn(at)
    }
    place()
    light()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', light, { passive: true })
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', light)
    }
  }, [])

  const goBack = (e: MouseEvent) => {
    if (!back.go || e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    back.go()
  }
  const jump = (id: string) => (e: MouseEvent) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const beside = !mobile && room
  return (
    <div ref={box}>
      {(mobile || room === false) && (
        <a href={back.href} onClick={goBack} style={{ ...backLine, padding: mobile ? '12px 20px' : '16px 56px 0' }}>
          <i style={{ ...dot, background: back.color }} />← Quay lại <b style={{ fontWeight: 500, color: 'var(--ink)' }}>{back.site}</b>
        </a>
      )}
      {children}
      {beside && (
        <aside aria-label="Trong bài này" style={rail}>
          <a href={back.href} onClick={goBack} style={{ ...backBlock, borderLeftColor: back.color }}>
            <small style={{ fontSize: 12 }}>← Quay lại</small>
            <b style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{back.site}</b>
            <small style={{ fontSize: 12 }}>{back.home}</small>
          </a>
          {heads.length > 0 && (
            <>
              <span style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 8 }}>Trong bài này</span>
              {heads.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  onClick={jump(h.id)}
                  aria-current={on === h.id ? 'location' : undefined}
                  style={{ ...tocLink, color: on === h.id ? 'var(--ink)' : 'var(--ink-2)', borderLeftColor: on === h.id ? back.color : LINE }}
                >
                  {h.text}
                </a>
              ))}
            </>
          )}
        </aside>
      )}
    </div>
  )
}

/** A heading's words without long-form's fold marks (▾ ▸). */
const clean = (text: string | null) => (text ?? '').replace(/[▾▸]/g, '').trim()

const LINE = 'rgba(127,127,127,.3)'

const rail: CSSProperties = {
  position: 'fixed',
  left: RAIL_EDGE,
  top: '50%',
  transform: 'translateY(-50%)',
  width: RAIL_W,
  // Clear of the site header above and the footer below.
  maxHeight: 'calc(100vh - 160px)',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontFamily: sans,
  fontSize: 13,
  lineHeight: 1.45,
}

const backBlock: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  marginBottom: 14,
  paddingLeft: 12,
  borderLeft: '2px solid',
  color: 'var(--ink-2)',
  textDecoration: 'none',
}

const tocLink: CSSProperties = { borderLeft: '2px solid', paddingLeft: 10, textDecoration: 'none' }

const backLine: CSSProperties = { fontFamily: sans, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--ink-2)', textDecoration: 'none' }

const dot: CSSProperties = { width: 8, height: 8, borderRadius: 999 }
