import type { CSSProperties } from 'react'
import { displayNumber, postDescription } from '../lib/postText'
import { Breadcrumbs } from '../components/Breadcrumbs'
import type { ModuleRow } from '../data/useModules'
import { useModules } from '../data/useModules'
import type { PostRow } from '../data/usePublishedPosts'
import { usePublishedPosts } from '../data/usePublishedPosts'
import { ink, paper, sans, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { useNav, useSettings } from '../lib/nav'
import { openPost } from '../lib/openPost'
import { postThumbnail } from '../lib/postThumb'

const kicker: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  opacity: 0.7,
}

const meta: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  color: ink.faint,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
}

const rowHover: CSSProperties = { background: paper.white }

const statusLabel: CSSProperties = { ...kicker, padding: '120px 56px' }

/** `01`, `02`, `03` — position of the module in the running order. */
/** Alternate the two tints down a list so consecutive thumbnails differ. */
type TintedPost = PostRow & { tint: string }
const withTints = (posts: PostRow[], m: ModuleRow): TintedPost[] =>
  posts.map((p, i) => ({ ...p, tint: i % 2 === 0 ? m.tint : m.tint2 }))

/**
 * Band — a colour block across the head, one wide hero, then the contents in
 * two columns with a thumbnail apiece.
 */
function Band({ m, posts }: { m: ModuleRow; posts: PostRow[] }) {
  const nav = useNav()
  const { showPlates } = useSettings()
  const entries = withTints(posts, m)

  return (
    <div>
      <div style={{ background: m.accent, color: m.on_color, padding: '52px 56px 44px' }}>
        <Breadcrumbs style={{ opacity: 0.75 }} />

        <h1
          style={{
            fontFamily: serif,
            fontSize: 92,
            lineHeight: 0.94,
            letterSpacing: '-.04em',
            margin: '0 0 20px',
          }}
        >
          {m.title}
        </h1>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
            gap: 44,
          }}
        >
          <div style={{ fontSize: 15, lineHeight: 1.45 }}>{m.long_desc}</div>
        </div>
      </div>

      {showPlates && (
        <div
          style={{
            height: 208,
            background: m.tint,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: '16px 18px',
            width: 1050,
          }}
        >
          <div style={{ fontFamily: sans, fontSize: 10, color: ink.strong }}>{m.shot1}</div>
          <div style={{ fontFamily: sans, fontSize: 10, color: '#A4908C' }}>16:5 / hero</div>
        </div>
      )}

      <div style={{ padding: '36px 56px 120px', maxWidth: 1240 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
            gap: '0 44px',
          }}
        >
          {entries.map((e, i) => (
            <Hover
              key={e.id}
              onClick={() => openPost(nav, e)}
              style={{
                display: 'flex',
                gap: 16,
                padding: '18px 10px',
                borderTop: `1px solid ${paper.rule}`,
                cursor: 'pointer',
                alignItems: 'flex-start',
              }}
              hoverStyle={rowHover}
            >
              <div
                style={{
                  width: 172,
                  height: 130,
                  flex: 'none',
                  background: postThumbnail(e)
                    ? `url(${postThumbnail(e)}) center/cover no-repeat`
                    : e.tint,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: serif,
                    fontSize: 24,
                    letterSpacing: '-.018em',
                    lineHeight: 1.15,
                  }}
                >
                  {e.en}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: ink.soft,
                    lineHeight: 1.25,
                    margin: '5px 0 8px',
                  }}
                >
                  {postDescription(e)}
                </div>
                <div style={{ display: 'flex', gap: 12, ...meta }}>
                  <div>{displayNumber(i)}</div>
                  <div>{e.kind}</div>
                  <div>{e.date_label}</div>
                </div>
              </div>
            </Hover>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Specimen — the colour block takes the left half, a tray of square plates the
 * right; the contents below sit in a three-column grid like a specimen drawer.
 */
function Specimen({ m, posts }: { m: ModuleRow; posts: PostRow[] }) {
  const nav = useNav()
  const { showPlates } = useSettings()
  const entries = withTints(posts, m)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)' }}>
        <div
          style={{
            background: m.accent,
            color: m.on_color,
            padding: '52px 48px 48px',
            width: 571,
            height: 373,
          }}
        >
          <Breadcrumbs style={{ opacity: 0.75 }} />

          <h1
            style={{
              fontFamily: serif,
              fontSize: 84,
              lineHeight: 0.94,
              letterSpacing: '-.04em',
              margin: '0 0 18px',
            }}
          >
            {m.title}
          </h1>
          <div style={{ fontSize: 15, lineHeight: 1.45, maxWidth: 520 }}>{m.long_desc}</div>
        </div>

        {showPlates && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div
              style={{
                background: m.tint,
                display: 'flex',
                alignItems: 'flex-end',
                padding: 12,
                minHeight: 180,
              }}
            >
              <div
                style={{ fontFamily: sans, fontSize: 9.5, color: ink.strong, lineHeight: 1.25 }}
              >
                {m.shot1}
              </div>
            </div>
            <div
              style={{
                background: '#2B4B33',
                display: 'flex',
                alignItems: 'flex-end',
                padding: 12,
              }}
            >
              <div
                style={{ fontFamily: sans, fontSize: 9.5, color: '#C6D6C6', lineHeight: 1.25 }}
              >
                {m.shot2}
              </div>
            </div>
            <div
              style={{
                background: '#F3F7EC',
                display: 'flex',
                alignItems: 'flex-end',
                padding: 12,
              }}
            >
              <div
                style={{ fontFamily: sans, fontSize: 9.5, color: ink.strong, lineHeight: 1.25 }}
              >
                {m.shot3}
              </div>
            </div>
            {/* fourth cell is a solid tint, not a photo slot */}
            <div style={{ background: '#BBD9A8' }} />
          </div>
        )}
      </div>

      <div style={{ padding: '0 0 120px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
            gap: 1,
            background: paper.rule,
            borderBottom: `1px solid ${paper.rule}`,
          }}
        >
          {entries.map((e, i) => (
            <Hover
              key={e.id}
              onClick={() => openPost(nav, e)}
              style={{
                background: paper.cream,
                padding: '18px 18px 20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 230,
              }}
              hoverStyle={rowHover}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 11,
                }}
              >
                <div style={{ fontFamily: sans, fontSize: 10, color: ink.faint }}>{displayNumber(i)}</div>
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 9.5,
                    color: ink.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '.08em',
                  }}
                >
                  {e.kind}
                </div>
              </div>
              {showPlates && (
                <div
                  style={{
                    aspectRatio: '3/2',
                    marginBottom: 13,
                    background: postThumbnail(e)
                      ? `url(${postThumbnail(e)}) center/cover no-repeat`
                      : e.tint,
                  }}
                />
              )}
              <div
                style={{
                  fontFamily: serif,
                  fontSize: 25,
                  letterSpacing: '-.02em',
                  lineHeight: 1.14,
                  marginBottom: 7,
                }}
              >
                {e.en}
              </div>
              <div style={{ fontSize: 13, color: ink.soft, lineHeight: 1.3 }}>{postDescription(e)}</div>
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: 11,
                  fontFamily: sans,
                  fontSize: 10,
                  color: ink.faint,
                }}
              >
                {e.date_label}
              </div>
            </Hover>
          ))}
        </div>
      </div>
    </div>
  )
}

/** The four roast stages, as colour rather than photography. */
const roastStrip = [
  { bg: '#F5F2DC', fg: ink.strong, label: '01 — nhân xanh' },
  { bg: '#F6E2B0', fg: ink.strong, label: '02 — vàng' },
  { bg: '#D99C55', fg: '#2E2113', label: '03 — first crack' },
  { bg: '#8A5A33', fg: '#F6E2B0', label: '04 — phát triển' },
]

/**
 * Sequence — an oversized title on the apricot block, the roast strip shifting
 * cream → yellow → earth → cinnamon, then the contents as big numbered rows.
 */
function Sequence({ m, posts }: { m: ModuleRow; posts: PostRow[] }) {
  const nav = useNav()
  const { showPlates } = useSettings()

  return (
    <div>
      <div style={{ background: m.accent, color: m.on_color, padding: '52px 56px 40px' }}>
        <Breadcrumbs style={{ opacity: 0.75 }} />

        <h1
          style={{
            fontFamily: serif,
            fontSize: 96,
            lineHeight: 0.94,
            letterSpacing: '-.04em',
            margin: '0 0 22px',
          }}
        >
          {m.title}
        </h1>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',
            gap: 36,
          }}
        >
          <div style={{ fontSize: 15, lineHeight: 1.45, gridColumn: 'span 2' }}>{m.long_desc}</div>
        </div>
      </div>

      {showPlates && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
          {roastStrip.map((s) => (
            <div
              key={s.label}
              style={{
                aspectRatio: '3/4',
                background: s.bg,
                display: 'flex',
                alignItems: 'flex-end',
                padding: 12,
              }}
            >
              <div style={{ fontFamily: sans, fontSize: 9.5, color: s.fg }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '34px 56px 120px', maxWidth: 1240 }}>
        {posts.map((e, i) => (
          <Hover
            key={e.id}
            onClick={() => openPost(nav, e)}
            style={{
              display: 'grid',
              gridTemplateColumns: '70px minmax(0,1.1fr) minmax(0,1.3fr) 88px',
              gap: 24,
              alignItems: 'center',
              padding: '20px 10px',
              borderBottom: `1px solid ${paper.rule}`,
              cursor: 'pointer',
            }}
            hoverStyle={rowHover}
          >
            <div style={{ fontFamily: serif, fontSize: 38, color: '#D99C55' }}>{displayNumber(i)}</div>
            <div
              style={{
                fontFamily: serif,
                fontSize: 27,
                letterSpacing: '-.02em',
                lineHeight: 1.15,
              }}
            >
              {e.en}
            </div>
            <div style={{ fontSize: 13.5, color: ink.soft, lineHeight: 1.3 }}>{postDescription(e)}</div>
            <div style={{ ...meta, textAlign: 'right' }}>
              {e.kind}
              <br />
              {e.date_label}
            </div>
          </Hover>
        ))}
      </div>
    </div>
  )
}

/** Picks the layout the module declares — band, specimen or sequence. */
export function ModuleScreen() {
  const { moduleId } = useNav()
  const { data: modules, loading: modulesLoading } = useModules()
  const m = modules.find((x) => x.id === moduleId) ?? modules[0]
  const { data: posts, loading: postsLoading } = usePublishedPosts({
    moduleId: m?.id,
    enabled: Boolean(m),
  })

  if (modulesLoading || !m) {
    return <div style={statusLabel}>Đang tải…</div>
  }
  if (postsLoading) {
    return <div style={statusLabel}>Đang tải…</div>
  }

  if (m.layout === 'band') return <Band m={m} posts={posts} />
  if (m.layout === 'specimen') return <Specimen m={m} posts={posts} />
  return <Sequence m={m} posts={posts} />
}
