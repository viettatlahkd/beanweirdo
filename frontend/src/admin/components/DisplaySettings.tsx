import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { BLOG_COLORS, BLOG_FONTS, blogFontHref, blogVars, type BlogDesign } from '../../design/blogDesign'
import { ink, paper, sans, serif } from '../../design/tokens'
import { DesignTab, sectionHead, usePortAdmin, useSplit } from './PortEditors'
import { ScaledPreview, useWidth } from './ScaledPreview'

/**
 * Cài đặt hiển thị — one half per site. Personal Blog: its addresses, the
 * admin headings, and its design system; Port: the design system port pages
 * are drawn with (it was the third tab of the separate Portfolio screen).
 */

type Site = 'blog' | 'port' | 'routes'
const KEY = 'beanweirdo.display.site'
const remembered = (): Site => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'port' || v === 'routes' ? v : 'blog'
  } catch {
    return 'blog'
  }
}

const label: CSSProperties = { fontFamily: sans, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: ink.faint, marginBottom: 6 }
const box: CSSProperties = { boxSizing: 'border-box', width: '100%', background: paper.white, border: `1px solid ${paper.rule}`, color: ink.base, fontFamily: sans, fontSize: 12.5, padding: '6px 8px', outline: 'none' }
const HEX = /^#[0-9a-fA-F]{6}$/

/** Addresses are the whole site's — blog, port and practice words alike — so they are a tab of their own. */
export function DisplaySettings({
  blog,
  routes,
  design,
  onSaveDesign,
}: {
  blog: ReactNode
  routes: ReactNode
  design: BlogDesign | undefined
  onSaveDesign: (patch: BlogDesign) => Promise<void>
}) {
  const [site, setSiteState] = useState<Site>(remembered)
  const setSite = (s: Site) => {
    setSiteState(s)
    try {
      localStorage.setItem(KEY, s)
    } catch {
      /* a remembered half is a convenience */
    }
  }
  return (
    <div>
      <div role="tablist" style={{ display: 'inline-flex', border: `1px solid ${paper.rule}`, background: paper.white, margin: '26px 56px 0' }}>
        {(['blog', 'port', 'routes'] as const).map((s, i) => (
          <button
            key={s}
            role="tab"
            aria-selected={site === s}
            onClick={() => setSite(s)}
            style={{ all: 'unset', cursor: 'pointer', fontFamily: sans, fontSize: 13, padding: '7px 18px', borderLeft: i ? `1px solid ${paper.rule}` : undefined, background: site === s ? ink.base : 'transparent', color: site === s ? paper.cream : ink.soft }}
          >
            {{ blog: 'Personal Blog', port: 'Port', routes: 'Đường dẫn' }[s]}
          </button>
        ))}
      </div>
      {site === 'blog' ? (
        <>
          <BlogDesignPanel stored={design ?? {}} onSave={onSaveDesign} />
          <div style={{ padding: '6px 56px 130px', maxWidth: 1180 }}>{blog}</div>
        </>
      ) : site === 'port' ? (
        <PortDesign />
      ) : (
        <div style={{ padding: '26px 56px 130px', maxWidth: 1180 }}>{routes}</div>
      )}
    </div>
  )
}

function PortDesign() {
  const port = usePortAdmin()
  if (port.error) return <div style={{ padding: '20px 56px', fontFamily: sans, fontSize: 12.5, color: '#8E1E42' }}>{port.error}</div>
  if (!port.loaded) return null
  return <DesignTab stored={port.stored} setStored={port.setStored} design={port.design} />
}

/** Colours and families of the blog, each beside its default; the preview is the front page wearing them. */
function BlogDesignPanel({ stored, onSave }: { stored: BlogDesign; onSave: (patch: BlogDesign) => Promise<void> }) {
  const [draft, setDraft] = useState<BlogDesign>(stored)
  useEffect(() => setDraft(stored), [stored])
  const frame = useRef<HTMLIFrameElement>(null)
  // A colour picker reports every step of a drag: gather them, save once it rests.
  const pending = useRef<BlogDesign>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const save = (patch: BlogDesign) => {
    setDraft((d) => ({ ...d, ...patch }))
    pending.current = { ...pending.current, ...patch }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const p = pending.current
      pending.current = {}
      void onSave(p)
    }, 600)
  }
  const changed = Object.values(stored).some((v) => typeof v === 'string' && v)

  // The preview frame wears the draft at once, before the save comes back.
  const previewStyle = Object.entries(blogVars(draft))
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
  const fonts = blogFontHref(draft)

  /** Same-origin: dress the frame in the draft, so a change shows before it is saved. */
  const dress = () => {
    const doc = frame.current?.contentDocument
    if (!doc?.documentElement) return
    doc.documentElement.setAttribute('style', previewStyle)
    let l = doc.getElementById('bw-preview-fonts') as HTMLLinkElement | null
    if (fonts) {
      if (!l) {
        l = doc.createElement('link')
        l.id = 'bw-preview-fonts'
        l.rel = 'stylesheet'
        doc.head.appendChild(l)
      }
      if (l.href !== fonts) l.href = fonts
    } else l?.remove()
  }
  useEffect(dress, [previewStyle, fonts])

  // The tokens get the room; the page shrinks to fit (drawn at desktop width, scaled down).
  const split = useSplit('blog-design-v2', 560, 'right', 360, 1000)
  const [root, rootWidth] = useWidth<HTMLDivElement>()
  const stacked = rootWidth > 0 && rootWidth < 860
  const group = (title: string, body: ReactNode, extra?: ReactNode) => (
    <>
      <div style={{ ...sectionHead, display: 'flex', justifyContent: 'space-between' }}>
        <span>{title}</span>
        {extra}
      </div>
      {body}
    </>
  )

  // Port's layout, half for half: the page on the left, the tokens on the right.
  return (
    <div ref={root} style={{ display: 'grid', gridTemplateColumns: stacked ? 'minmax(0,1fr)' : split.columns, alignItems: 'start', marginTop: 16 }}>
      <div style={{ background: paper.white, pointerEvents: split.dragging ? 'none' : undefined, ...(stacked ? { height: '55vh', order: 2 } : { height: 'calc(100vh - 220px)', position: 'sticky', top: 0 }) }}>
        <ScaledPreview>
          <iframe ref={frame} title="xem trước Personal Blog" src="/" onLoad={dress} style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
        </ScaledPreview>
      </div>
      {!stacked && split.handle}
      <div style={stacked ? { padding: '6px 20px 24px' } : { padding: '6px 34px 80px 22px', height: 'calc(100vh - 220px)', overflowY: 'auto', position: 'sticky', top: 0 }}>
        {group(
          'Font',
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {BLOG_FONTS.map((f) => (
              <label key={f.key} style={{ display: 'grid', gap: 5 }}>
                <span style={label}>{f.title}</span>
                <input
                  aria-label={f.title}
                  key={String(stored[f.key] ?? '')}
                  defaultValue={stored[f.key] ?? ''}
                  placeholder={f.fallback.split(',')[0].replace(/'/g, '')}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v !== (stored[f.key] ?? '')) save({ [f.key]: v || null })
                  }}
                  style={{ ...box, fontFamily: f.key === 'font.serif' ? serif : sans, fontSize: 14 }}
                />
              </label>
            ))}
          </div>,
          changed && (
            <button type="button" onClick={() => save(Object.fromEntries(Object.keys(stored).map((k) => [k, null])))} style={{ all: 'unset', cursor: 'pointer', fontSize: 10, letterSpacing: '.16em', color: ink.faint }}>
              Trả về mặc định
            </button>
          ),
        )}
        {BLOG_COLORS.map((g) => (
          <div key={g.group}>
            {group(
              g.title,
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: '8px 12px' }}>
                {Object.entries(g.raw).map(([name, def]) => {
                  const key = `${g.group}.${name}`
                  const value = draft[key] ?? def
                  const own = typeof draft[key] === 'string' && draft[key] !== ''
                  return (
                    <label key={key} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr)', gap: 8, alignItems: 'center' }}>
                      <input
                        type="color"
                        aria-label={g.names[name] ?? name}
                        value={HEX.test(value) ? value.toLowerCase() : def.toLowerCase()}
                        onChange={(e) => save({ [key]: e.target.value })}
                        style={{ width: 28, height: 28, padding: 0, border: `1px solid ${paper.rule}`, background: 'none' }}
                      />
                      <span style={{ display: 'grid', fontFamily: sans, fontSize: 12, color: ink.soft, lineHeight: 1.3 }}>
                        {g.names[name] ?? name}
                        <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10.5, color: own ? ink.base : ink.faint }}>
                          {value.toUpperCase()}
                          {own && (
                            <button type="button" aria-label={`${g.names[name] ?? name}: về mặc định`} onClick={(e) => (e.preventDefault(), save({ [key]: null }))} style={{ all: 'unset', cursor: 'pointer', marginLeft: 6, color: ink.faint }}>
                              ×
                            </button>
                          )}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>,
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
