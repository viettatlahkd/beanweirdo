import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { resolvePosts, type Block, type PortPost } from './blocks'
import { gridArea, imageOf, seriesLayout, storyLayout, type Placed } from './layout'
import { PF_CSS } from './styles'
import { cssVars, fontFaceCss, fontHrefs, type Design } from './tokens'

/**
 * Renders a port page from its blocks, tokens and real posts.
 *
 * The same component serves the public page and the admin preview, so what the
 * site owner sees while arranging a page is exactly what readers will see.
 */
export type PortfolioViewProps = {
  title: string
  intro: string
  palette: string
  blocks: Block[]
  design: Design
  posts: PortPost[]
  /** Module names, so a series block can show one when it has no label of its own. */
  moduleTitles: Record<string, string>
  /** The address for reading a post. */
  postHref: (p: PortPost) => string
  /** Text on the left of the topbar. */
  brand?: string
  /** The block selected in the page arranger — lightly outlined so it is easy to spot. */
  activeId?: string | null
  onPick?: (id: string) => void
}

/** Load the CSS and fonts once for the whole page. */
function useAssets(library: string[], files: Record<string, string>) {
  useEffect(() => {
    if (!document.getElementById('pf-css')) {
      const el = document.createElement('style')
      el.id = 'pf-css'
      el.textContent = PF_CSS
      document.head.appendChild(el)
    }
    let faces = document.getElementById('pf-fonts')
    if (!faces) {
      faces = document.createElement('style')
      faces.id = 'pf-fonts'
      document.head.appendChild(faces)
    }
    faces.textContent = fontFaceCss(files)
    // Uploaded families come from their own file; only the rest are fetched from Google.
    for (const href of fontHrefs(library.filter((f) => !(f in files)))) {
      if (document.querySelector(`link[data-pf-font="${href}"]`)) continue
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.dataset.pfFont = href
      document.head.appendChild(link)
    }
  }, [library, files])
}

function Img({ url }: { url: string | null | undefined }) {
  const im = imageOf(url)
  return (
    <div className="ph">
      {im && <img src={im.src} alt="" loading="lazy" style={im.position ? { objectPosition: im.position } : undefined} />}
    </div>
  )
}

const metaOf = (p: PortPost, modules: Record<string, string>) => `${modules[p.module_id] ?? p.module_id} · ${p.date_label}`

export function PortfolioView(props: PortfolioViewProps) {
  const { design, palette, blocks, posts, moduleTitles, postHref, activeId, onPick } = props
  useAssets(design.fonts.library, design.fonts.files)
  const [open, setOpen] = useState<PortPost | null>(null)
  const vars = cssVars(design, palette) as CSSProperties

  const card = (p: PortPost, key: string, hidden = false) => (
    <button
      key={key}
      className="card"
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      onClick={() => setOpen(p)}
    >
      <Img url={p.hero_image_url} />
      <span className="meta">{metaOf(p, moduleTitles)}</span>
      <h3 className="title">
        <span className="mk">{p.en}</span>
      </h3>
    </button>
  )

  let seriesN = 0
  let storyN = 0

  const render = (b: Block): ReactNode => {
    switch (b.type) {
      case 'head':
        return (
          <section className="rg hero">
            <div className="rail" />
            <div className="main">
              <h1 className="d1">{b.title || props.title}</h1>
              {(b.intro || props.intro) && <p className="body">{b.intro || props.intro}</p>}
            </div>
          </section>
        )

      case 'opening': {
        const list = resolvePosts(b.source, posts)
        const cap = (p: PortPost | undefined, cls = '') =>
          p && (
            <figcaption className={cls}>
              <button onClick={() => setOpen(p)}>
                <span className="mk">{moduleTitles[p.module_id] ?? p.module_id}</span>
              </button>
              <span className="meta">{p.en}</span>
            </figcaption>
          )
        const over = b.text && (
          <div className="over">
            <p>{b.text}</p>
          </div>
        )
        if (b.variant === 'C') {
          const [a, c] = list
          return (
            <section className="sec">
              <div className="open-c">
                <figure className={b.text ? 'scrim' : undefined}>
                  <Img url={a?.hero_image_url} />
                  {cap(a)}
                  {over}
                </figure>
                <figure>
                  <Img url={c?.hero_image_url} />
                  {cap(c)}
                </figure>
              </div>
            </section>
          )
        }
        const [r, big, last] = list
        return (
          <section className="sec">
            <div className={`open-ab${b.variant === 'B' ? ' fibh' : ''}`}>
              <div className="d d-rail">
                <Img url={r?.hero_image_url} />
              </div>
              <div className={`d d-big${b.text ? ' scrim' : ''}`}>
                <Img url={big?.hero_image_url} />
                {over}
              </div>
              <div className="d d-last">
                <Img url={last?.hero_image_url} />
              </div>
              {cap(r, 'c-rail')}
              {cap(big, 'c-big')}
              {cap(last, 'c-last')}
            </div>
          </section>
        )
      }

      case 'cards': {
        const list = resolvePosts(b.source, posts)
        return (
          <section className="rg sec">
            <div className="rail">{b.label && <span className="lbl">{b.label}</span>}</div>
            <div className="main">
              <div className={`cards${b.cols === 2 ? ' two' : ''}`}>{list.map((p) => card(p, p.id))}</div>
            </div>
          </section>
        )
      }

      case 'slider':
        return <Slider block={b} list={resolvePosts(b.source, posts)} card={card} />

      case 'series': {
        const list = resolvePosts(b.source, posts)
        const label = b.label || (b.source.mode === 'module' ? moduleTitles[b.source.moduleId] : '') || ''
        const places = seriesLayout(seriesN++)
        return (
          <section className="rg sec">
            <div className="rail" />
            <div className="main">
              <div className="series">
                <div>
                  {label && <span className="tag">{label}</span>}
                  <ol>
                    {list.map((p, i) => (
                      <li key={p.id}>
                        <button onClick={() => setOpen(p)}>
                          <span className="n">{String(i + 1).padStart(2, '0')}</span>
                          <span>
                            <span className="title">
                              <span className="mk">{p.en}</span>
                            </span>
                            <span className="body">{p.vi}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
                <Fib places={places} list={list} onOpen={setOpen} />
              </div>
            </div>
          </section>
        )
      }

      case 'story': {
        const list = resolvePosts(b.source, posts)
        const label = b.label || (b.source.mode === 'module' ? moduleTitles[b.source.moduleId] : '') || ''
        const imageLeft = b.side === 'left'
        const places = storyLayout(storyN++, imageLeft)
        const dates = list.map((p) => p.date_label).sort()
        return (
          <section className="rg sec">
            <div className="rail" />
            <div className="main">
              <div className={`story${imageLeft ? ' flip' : ''}`}>
                <div>
                  {label && <span className="tag">{label}</span>}
                  {b.head && <p className="head">{b.head}</p>}
                  {b.text && (
                    <div className="read">
                      {b.text.split(/\n\s*\n/).map((t, i) => (
                        <p key={i}>{t}</p>
                      ))}
                    </div>
                  )}
                  {list[0] && (
                    <a className="go" href={postHref(list[0])}>
                      <span className="mk">đọc series →</span>
                      <span className="meta">
                        {list.length} bài · {dates[0]}
                        {dates.length > 1 ? `–${dates[dates.length - 1]}` : ''}
                      </span>
                    </a>
                  )}
                </div>
                <div className="fib-wrap">
                  <Fib places={places} list={list} onOpen={setOpen} tall />
                </div>
              </div>
            </div>
          </section>
        )
      }

      case 'about':
        return (
          <section className="rg sec">
            <div className="rail" />
            <div className="main">
              <div className="about-block">
                <div className="intro">
                  <span className="lbl">about</span>
                  {b.head && <p className="head">{b.head}</p>}
                  {b.text && <p className="body">{b.text}</p>}
                  {b.links.some((l) => l.url) && (
                    <div className="links">
                      <div>
                        <span className="lbl">reach</span>
                        <ul>
                          {b.links
                            .filter((l) => l.url)
                            .map((l) => (
                              <li key={l.label}>
                                <a href={l.url} target="_blank" rel="noopener noreferrer">
                                  <span className="mk">{l.label}</span>
                                </a>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                <Img url={b.image || null} />
              </div>
            </div>
          </section>
        )
    }
  }

  return (
    <div className="pf" style={vars}>
      <header className="topbar">
        <span className="brand">{props.brand ?? 'bæn.'}</span>
        <span className="r">{props.title}</span>
      </header>
      {blocks.map((b) => (
        <div
          key={b.id}
          data-block={b.id}
          onClickCapture={onPick ? () => onPick(b.id) : undefined}
          style={activeId === b.id ? { outline: `1px dashed ${design.colors.ink3}`, outlineOffset: -1 } : undefined}
        >
          {render(b)}
        </div>
      ))}
      <footer className="footer">
        <span>{props.brand ?? 'bæn.'} {new Date().getFullYear()}</span>
        <span>{props.title}</span>
      </footer>
      {open &&
        createPortal(
          <Summary post={open} vars={vars} moduleTitles={moduleTitles} href={postHref(open)} onClose={() => setOpen(null)} />,
          document.body,
        )}
    </div>
  )
}

function Fib({ places, list, onOpen, tall }: { places: Placed[]; list: PortPost[]; onOpen: (p: PortPost) => void; tall?: boolean }) {
  return (
    <div className={`fib${tall ? ' tall' : ''}`}>
      {places.map((pl, i) => {
        const p = list[i]
        if (!p) return null
        return (
          <button key={p.id} style={{ gridArea: gridArea(pl) }} onClick={() => onOpen(p)} aria-label={p.en}>
            <Img url={p.hero_image_url} />
          </button>
        )
      })}
    </div>
  )
}

function Slider({
  block,
  list,
  card,
}: {
  block: Extract<Block, { type: 'slider' }>
  list: PortPost[]
  card: (p: PortPost, key: string, hidden?: boolean) => ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const next = () => {
    const el = ref.current
    if (!el) return
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    el.scrollTo({ left: end ? 0 : el.scrollLeft + el.clientWidth * 0.7, behavior: 'smooth' })
  }
  const head = (
    <div className="rg row-head" style={{ marginBottom: 'var(--s-4)' }}>
      <div className="rail">{block.label && <span className="lbl">{block.label}</span>}</div>
      <div className="main" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {block.motion === 'arrow' && (
          <button className="arrow" onClick={next} aria-label="next">
            →
          </button>
        )}
      </div>
    </div>
  )
  if (block.motion === 'arrow') {
    return (
      <section className="sec">
        {head}
        <div className="slider" ref={ref}>
          {list.map((p) => card(p, p.id))}
        </div>
      </section>
    )
  }
  // Auto-scroll: the strip is repeated twice so the loop is seamless; the copy is hidden from screen readers.
  return (
    <section className="sec">
      {(block.label || null) && head}
      <div className={`marquee${block.motion === 'right' ? ' rev' : ''}`}>
        <div className="track">
          {list.map((p) => card(p, p.id))}
          {list.map((p) => card(p, `${p.id}-dup`, true))}
        </div>
      </div>
    </section>
  )
}

function Summary({
  post,
  vars,
  moduleTitles,
  href,
  onClose,
}: {
  post: PortPost
  vars: CSSProperties
  moduleTitles: Record<string, string>
  href: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="pf-pop" style={vars} onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className="summary pf">
        <button className="close" onClick={onClose} aria-label="đóng">
          ×
        </button>
        <Img url={post.hero_image_url} />
        <div className="txt">
          <span className="meta">{metaOf(post, moduleTitles)}</span>
          <h3 className="head">{post.en}</h3>
          <span className="lbl">trước khi đọc</span>
          <p className="read">{post.lead || post.vi}</p>
          <div className="foot">
            <a className="lbl" href={href}>
              <span className="mk">đọc bài →</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
