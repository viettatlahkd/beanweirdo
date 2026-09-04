import type { CSSProperties } from 'react'
import { displayNumber, postDescription } from '../lib/postText'
import { Breadcrumbs } from '../components/Breadcrumbs'
import type { ModuleRow } from '../data/useModules'
import { useModules } from '../data/useModules'
import type { PostRow } from '../data/usePublishedPosts'
import { usePublishedPosts } from '../data/usePublishedPosts'
import { ink, layout, paper, prose, sans, serif, wrapTitle } from '../design/tokens'
import { pageCaption, pageFill, pageImage } from '../lib/modulePageImages'
import { Hover } from '../lib/Hover'
import { useNav, useSettings } from '../lib/nav'
import { openPost } from '../lib/openPost'
import { postThumbnail } from '../lib/postThumb'
import { coverStyle } from '../lib/imageFocus'

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
          lang="en"
          style={{
            fontFamily: serif,
            fontSize: 92,
            lineHeight: 0.94,
            letterSpacing: '-.04em',
            margin: '0 0 20px',
            ...wrapTitle,
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
          <div style={{ fontSize: 15, lineHeight: 1.45, ...prose }}>{m.long_desc}</div>
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
                  /*
                   * Điểm căn của ảnh bìa đi theo đường dẫn (`#focus=`), và
                   * `center/cover` viết tay thì bỏ qua nó — chủ site căn xong
                   * mà danh sách vẫn cắt giữa. `coverStyle` là chỗ duy nhất
                   * biết đọc nó.
                   */
                  ...(postThumbnail(e) ? coverStyle(postThumbnail(e)!) : { background: e.tint }),
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
            /*
             * Không đặt bề ngang và chiều cao ở đây.
             *
             * Trước là `width: 571, height: 373` — bản sao thứ ba của chiều cao
             * khối ảnh, và một bề ngang không liên quan gì tới cột lưới đang
             * chứa nó (cột rộng 551, khối rộng 571, nên nó tràn ra). Nâng khối
             * ảnh lên là mảng màu đứng lại ở 373 và để lộ một dải kem bên dưới.
             * Ô lưới đã có sẵn cả hai số ấy.
             */
          }}
        >
          <Breadcrumbs style={{ opacity: 0.75 }} />

          <h1
          lang="en"
            style={{
              fontFamily: serif,
              fontSize: 84,
              lineHeight: 0.94,
              letterSpacing: '-.04em',
              margin: '0 0 18px',
              ...wrapTitle,
            }}
          >
            {m.title}
          </h1>
          <div style={{ fontSize: 15, lineHeight: 1.45, maxWidth: 520, ...prose }}>{m.long_desc}</div>
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
                    ...(postThumbnail(e) ? coverStyle(postThumbnail(e)!) : { background: e.tint }),
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
  // Cùng lý do với dải trang chủ: 208 trên bề ngang 1050 là ~5:1, bẹt tới mức
  // hầu như không ảnh nào cắt cho vừa mà còn ra hình. Lấy từ token để trang,
  // trang module và ô xem trước trong CMS cùng đọc một con số.
  band: layout.moduleHero,
  specimen: layout.moduleSpecimen,
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
              {/*
                * Chú thích để trống thì không vẽ gì.
                *
                * Trước đây ô trống rơi về nhãn thiết kế ("01 — nhân xanh"), nên
                * chủ site xoá sạch ô trong CMS mà chữ vẫn nằm trên ảnh, không có
                * cách nào bỏ. Giữ hay bỏ là việc của chủ site — cùng một luật
                * với mọi khung ảnh khác; nhãn thiết kế chỉ còn là gợi ý trong ô
                * nhập, không phải thứ trang tự điền vào.
                */}
              {pageCaption(m, slot) && (
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 9.5,
                    color: photo ? paper.cream : s.fg,
                    background: photo ? 'rgba(24,22,17,.55)' : undefined,
                    padding: photo ? '3px 7px' : undefined,
                  }}
                >
                  {pageCaption(m, slot)}
                </div>
              )}
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
          // Hàng dưới cũ chỉ được 0,75fr — 114px trên bề ngang 200, bẹt tới
          // mức cắt ảnh cho vừa là mất chủ thể.
          gridTemplateRows: '1.3fr 1fr',
          height: PLATE_HEIGHT.specimen,
        }}
      >
        <PlateCell m={m} slot={1} tint={m.tint} minHeight={180} />
        <PlateCell m={m} slot={2} tint="#2B4B33" fg="#C6D6C6" />
        <PlateCell m={m} slot={3} tint="#F3F7EC" />
        {/*
          * Ô thứ tư từng là một mảng màu đặc, không phải chỗ đặt ảnh. Chủ site
          * nhìn vào và gọi nó là lỗi — bốn ô mà chỉ ba ô nhận ảnh. Giờ nó là
          * một khung như ba ô kia, và khi chưa có ảnh vẫn là đúng mảng màu ấy,
          * nên trang không đổi cho tới lúc chủ site đặt ảnh vào.
          */}
        <PlateCell m={m} slot={4} tint="#BBD9A8" />
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
      {/*
        * Chú thích là tuỳ chọn: không có chữ thì không vẽ gì cả. Trước đây cái
        * nền mờ vẫn được bôi ra dù bên trong rỗng, nên mỗi ảnh chưa đặt chú
        * thích lại có một vệt xám nhỏ ở góc — trang chủ đã làm đúng chuyện này
        * từ lâu, trang module thì chưa.
        */}
      {pageCaption(m, 1) ? (
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
      ) : (
        <div />
      )}
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
      {pageCaption(m, slot) && (
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
      )}
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
          lang="en"
          style={{
            fontFamily: serif,
            fontSize: 96,
            lineHeight: 0.94,
            letterSpacing: '-.04em',
            margin: '0 0 22px',
            ...wrapTitle,
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
          <div style={{ fontSize: 15, lineHeight: 1.45, gridColumn: 'span 2', ...prose }}>{m.long_desc}</div>
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
