import type { CSSProperties } from 'react'
import { displayNumber, postDescription } from '../lib/postText'
import { Breadcrumbs } from '../components/Breadcrumbs'
import type { ModuleRow } from '../data/useModules'
import { useModules } from '../data/useModules'
import type { PostRow } from '../data/usePublishedPosts'
import { usePublishedPosts } from '../data/usePublishedPosts'
import { ink, paper, sans, serif } from '../design/tokens'
import { pageCaption, pageFill, pageImage } from '../lib/modulePageImages'
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
        <ModulePlates m={m} />
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
          <ModulePlates m={m} />
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
/**
 * The plates on a module's own page.
 *
 * Exported because the CMS preview draws this exact component: the three
 * layouts put their photos in shapes that have nothing in common — a 5:1 hero,
 * a pair of 0.74:1 cells over a pair of 1.66:1 ones, a strip of 3:4 — and a
 * preview that redrew them by hand was wrong within a day of being written.
 *
 * The widths are the page's own, which is why they are named here rather than
 * measured: the CMS renders this at `PLATE_WIDTH[layout]` and scales it down,
 * so both surfaces read one number.
 */
export const PLATE_WIDTH: Record<string, number> = {
  band: 1050,
  specimen: 380,
  sequence: 836,
}

/**
 * Heights the layouts fix for themselves.
 *
 * A band hero is 208 and a roast strip follows from its 3:4 cells, but the
 * specimen grid used to take its height from the intro text in the column
 * beside it — so editing the description reshaped the photos, and no preview
 * could tell you what shape they would end up. Pinned to what the page draws
 * today, which changes nothing on screen and makes the crop something you can
 * see before you commit to it.
 */
export const PLATE_HEIGHT: Record<string, number> = {
  band: 208,
  specimen: 373,
}

export function ModulePlates({ m }: { m: ModuleRow }) {
  if (m.layout === 'sequence') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
        {roastStrip.map((s, i) => {
          const slot = (i + 1) as 1 | 2 | 3 | 4
          const photo = pageImage(m, slot)
          return (
            <div
              key={s.label}
              style={{
                aspectRatio: '3/4',
                ...pageFill(m, slot, s.bg),
                display: 'flex',
                alignItems: 'flex-end',
                padding: 12,
              }}
            >
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 9.5,
                  color: photo ? paper.cream : s.fg,
                  background: photo ? 'rgba(24,22,17,.55)' : undefined,
                  padding: photo ? '3px 7px' : undefined,
                }}
              >
                {pageCaption(m, slot) || s.label}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (m.layout === 'specimen') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1.7fr 0.75fr',
          height: PLATE_HEIGHT.specimen,
        }}
      >
        <PlateCell m={m} slot={1} tint={m.tint} minHeight={180} />
        <PlateCell m={m} slot={2} tint="#2B4B33" fg="#C6D6C6" />
        <PlateCell m={m} slot={3} tint="#F3F7EC" />
        {/* fourth cell is a solid tint, not a photo slot */}
        <div style={{ background: '#BBD9A8' }} />
      </div>
    )
  }

  return (
    <div
      style={{
        // The hero is a fixed 1050 on the page, not a share of the window.
        width: PLATE_WIDTH.band,
        height: 208,
        ...pageFill(m, 1, m.tint),
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '16px 18px',
      }}
    >
      <div
        style={{
          fontFamily: sans,
          fontSize: 10,
          color: pageImage(m, 1) ? paper.cream : ink.strong,
          background: pageImage(m, 1) ? 'rgba(24,22,17,.55)' : undefined,
          padding: pageImage(m, 1) ? '3px 7px' : undefined,
        }}
      >
        {pageCaption(m, 1)}
      </div>
      <div style={{ fontFamily: sans, fontSize: 10, color: pageImage(m, 1) ? paper.cream : '#A4908C' }}>
        16:5 / hero
      </div>
    </div>
  )
}

function PlateCell({
  m,
  slot,
  tint,
  fg,
  minHeight,
}: {
  m: ModuleRow
  slot: 1 | 2 | 3 | 4
  tint: string
  fg?: string
  minHeight?: number
}) {
  const photo = pageImage(m, slot)
  return (
    <div
      style={{
        ...pageFill(m, slot, tint),
        display: 'flex',
        alignItems: 'flex-end',
        padding: 12,
        minHeight,
      }}
    >
      <div
        style={{
          fontFamily: sans,
          fontSize: 9.5,
          lineHeight: 1.25,
          color: photo ? paper.cream : (fg ?? ink.strong),
          background: photo ? 'rgba(24,22,17,.55)' : undefined,
          padding: photo ? '3px 7px' : undefined,
        }}
      >
        {pageCaption(m, slot)}
      </div>
    </div>
  )
}

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
        <ModulePlates m={m} />
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
