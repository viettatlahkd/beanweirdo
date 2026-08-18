import type { CSSProperties } from 'react'
import { postDescription } from '../lib/postText'
import { useMemo } from 'react'
import type { ModuleRow } from '../data/useModules'
import { readingModules, useModules } from '../data/useModules'
import type { PostRow } from '../data/usePublishedPosts'
import { usePublishedPosts } from '../data/usePublishedPosts'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { useSiteCopy } from '../data/useSiteCopy'
import { garden, ink, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { rowPad, useNav, useSettings } from '../lib/nav'
import { openPost } from '../lib/openPost'

const label: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: ink.muted,
}

const switcher: CSSProperties = {
  ...label,
  cursor: 'pointer',
  display: 'inline-block',
  borderBottom: `1px solid ${paper.rule}`,
  paddingBottom: 3,
}

/**
 * The three opening plates — one per module concept, in module order. Caption
 * and photo both come from the CMS; the colour is what shows until a photo is
 * uploaded, so an empty site still reads as designed.
 */
const plateFallback = [
  { bg: garden.blush, fg: '#3B2A2B' },
  { bg: garden.leaf, fg: '#1F3323' },
  { bg: 'oklch(0.50 0.135 14)', fg: '#3B2E19' },
]

function usePlates() {
  const { site } = useSiteCopy()
  const captions = [site.plate1, site.plate2, site.plate3]
  const photos = [site.plateImg1, site.plateImg2, site.plateImg3]
  return plateFallback.map((p, i) => ({
    ...p,
    caption: captions[i],
    background: photos[i] ? `url(${photos[i]}) center/cover no-repeat` : p.bg,
  }))
}

/** Groups posts by `module_id`, preserving each module's `sort_order`. */
function groupByModule(posts: PostRow[]): Map<string, PostRow[]> {
  const map = new Map<string, PostRow[]>()
  for (const p of posts) {
    const list = map.get(p.module_id)
    if (list) list.push(p)
    else map.set(p.module_id, [p])
  }
  return map
}

type ModulesProps = { modules: ModuleRow[]; postsByModule: Map<string, PostRow[]> }

/** A — the ledger. Reads top to bottom like the contents page of a notebook. */
function Ledger({ modules, postsByModule }: ModulesProps) {
  const nav = useNav()
  const { density, showPlates } = useSettings()
  const pad = rowPad(density)
  const { site } = useSiteCopy()
  const plates = usePlates()

  return (
    <div>
      <div style={{ padding: '44px 56px 38px', maxWidth: 1240 }}>
        <Breadcrumbs color={ink.muted} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)',
            gap: 44,
            alignItems: 'end',
          }}
        >
          <h1
            style={{
              fontFamily: serif,
              fontSize: 108,
              lineHeight: 0.9,
              letterSpacing: '-.035em',
              margin: 0,
            }}
          >
            {site.t1}
            <br />
            <span style={{ fontStyle: 'italic', color: ink.green }}>{site.t2}</span>
          </h1>
          <div style={{ paddingBottom: 14 }}>
            <div style={{ fontSize: 14, lineHeight: 1.45, color: ink.mid, marginBottom: 14 }}>
              {site.blurb}
            </div>
            <Hover
              onClick={nav.toggleVariant}
              style={switcher}
              hoverStyle={{ color: ink.green }}
            >
              xem dạng cột →
            </Hover>
          </div>
        </div>
      </div>

      {showPlates && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)',
            gap: 0,
          }}
        >
          {plates.map((p) => (
            <div
              key={p.caption}
              style={{
                aspectRatio: '16/9',
                background: p.background,
                display: 'flex',
                alignItems: 'flex-end',
                padding: 16,
              }}
            >
              <div style={{ fontFamily: sans, fontSize: 10, color: p.fg }}>{p.caption}</div>
            </div>
          ))}
        </div>
      )}

      {modules.map((m) => {
        const entries = postsByModule.get(m.id) ?? []
        return (
          <div key={m.id} style={{ padding: '44px 56px 8px', maxWidth: 1240 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, paddingBottom: 14 }}>
              <Hover
                as="h2"
                onClick={() => nav.openModule(m.id)}
                style={{
                  fontFamily: serif,
                  fontSize: 44,
                  lineHeight: 1,
                  letterSpacing: '-.028em',
                  margin: 0,
                  cursor: 'pointer',
                  borderBottom: `6px solid ${m.accent}`,
                }}
                hoverStyle={{ color: ink.green }}
              >
                {m.title}
              </Hover>
              <div style={{ fontFamily: sans, fontSize: 11, color: ink.muted, paddingBottom: 6 }}>
                {entries.length} bài
              </div>
              <div style={{ flex: 1, height: 1, background: paper.rule, marginBottom: 8 }} />
              <div style={{ ...label, paddingBottom: 6 }}>{m.concept}</div>
            </div>

            <div
              style={{
                fontSize: 14,
                lineHeight: 1.35,
                color: ink.soft,
                maxWidth: 600,
                margin: '0 0 18px',
              }}
            >
              {m.blurb}
            </div>

            {entries.map((e) => (
              <Hover
                key={e.id}
                onClick={() => openPost(nav, e)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px minmax(0,1fr) minmax(0,1.05fr) 72px 56px',
                  alignItems: 'baseline',
                  gap: 18,
                  padding: `${pad} 12px ${pad} 10px`,
                  borderTop: `1px solid ${paper.rule}`,
                  cursor: 'pointer',
                  borderLeft: '3px solid transparent',
                }}
                hoverStyle={{ background: paper.white, borderLeft: `3px solid ${ink.green}` }}
              >
                <div style={{ fontFamily: sans, fontSize: 11, color: ink.faint }}>{e.n}</div>
                <div style={{ fontFamily: serif, fontSize: 23, letterSpacing: '-.015em' }}>{e.en}</div>
                <div style={{ fontSize: 13, color: ink.soft, lineHeight: 1.2 }}>{postDescription(e)}</div>
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 10,
                    color: ink.muted,
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {e.kind}
                </div>
                <div
                  style={{ fontFamily: sans, fontSize: 10, color: ink.faint, textAlign: 'right' }}
                >
                  {e.date_label}
                </div>
              </Hover>
            ))}
            <div style={{ borderTop: `1px solid ${paper.rule}` }} />
          </div>
        )
      })}
      <div style={{ height: 80 }} />
    </div>
  )
}

/** B — three parallel columns. Easier to compare modules side by side. */
function Columns({ modules, postsByModule }: ModulesProps) {
  const nav = useNav()
  const { showPlates } = useSettings()
  const { site } = useSiteCopy()

  return (
    <div style={{ padding: '44px 56px 130px', maxWidth: 1340 }}>
      <Breadcrumbs color={ink.muted} />

      <h1
        style={{
          fontFamily: serif,
          fontSize: 108,
          lineHeight: 0.9,
          letterSpacing: '-.035em',
          margin: '0 0 16px',
        }}
      >
        {site.t1} <span style={{ fontStyle: 'italic', color: ink.green }}>{site.t2}</span>
      </h1>
      <div
        style={{
          maxWidth: 440,
          fontSize: 14,
          lineHeight: 1.45,
          color: ink.mid,
          marginBottom: 14,
        }}
      >
        {site.blurbShort}
      </div>
      <Hover
        onClick={nav.toggleVariant}
        style={{ ...switcher, marginBottom: 44 }}
        hoverStyle={{ color: ink.green }}
      >
        xem dạng danh sách →
      </Hover>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 0 }}>
        {modules.map((m) => {
          const entries = postsByModule.get(m.id) ?? []
          return (
            <div
              key={m.id}
              style={{ background: m.accent, color: m.on_color, padding: '26px 24px 30px' }}
            >
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 10,
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  opacity: 0.7,
                  marginBottom: 10,
                }}
              >
                {m.concept}
              </div>
              <h2
                onClick={() => nav.openModule(m.id)}
                style={{
                  fontFamily: serif,
                  fontSize: 46,
                  lineHeight: 1,
                  letterSpacing: '-.03em',
                  margin: '0 0 14px',
                  cursor: 'pointer',
                }}
              >
                {m.title}
              </h2>
              <div style={{ fontSize: 13.5, lineHeight: 1.35, marginBottom: 20 }}>{m.blurb}</div>

              {showPlates && (
                <div
                  style={{
                    aspectRatio: '4/3',
                    marginBottom: 20,
                    background: paper.cream,
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 12,
                  }}
                >
                  <div
                    style={{ fontFamily: sans, fontSize: 10, color: ink.strong, lineHeight: 1.3 }}
                  >
                    {m.shot1}
                  </div>
                </div>
              )}

              {entries.map((e) => (
                <div
                  key={e.id}
                  onClick={() => openPost(nav, e)}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '11px 0',
                    borderTop: '1px solid rgba(35,33,26,.16)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontFamily: sans, fontSize: 10, opacity: 0.6, paddingTop: 6 }}>
                    {e.n}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: serif,
                        fontSize: 21,
                        lineHeight: 1.2,
                        letterSpacing: '-.015em',
                      }}
                    >
                      {e.en}
                    </div>
                    <div
                      style={{ fontSize: 12.5, lineHeight: 1.2, marginTop: 3, opacity: 0.82 }}
                    >
                      {postDescription(e)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Mục lục — the table of contents, in whichever shape is selected. */
export function IndexScreen() {
  const { variant } = useNav()
  const { data: allModules } = useModules()
  const modules = readingModules(allModules)
  const { data: posts } = usePublishedPosts({ orderBy: 'sort_order', ascending: true })
  const postsByModule = useMemo(() => groupByModule(posts), [posts])

  return variant === 'A' ? (
    <Ledger modules={modules} postsByModule={postsByModule} />
  ) : (
    <Columns modules={modules} postsByModule={postsByModule} />
  )
}
