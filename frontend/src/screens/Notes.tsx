import { useMemo, useState, type CSSProperties } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { useSiteCopy } from '../data/useSiteCopy'
import { noteFilterBar } from '../lib/notesFilter'
import { useTags } from '../data/useTags'
import { useIsMobile } from '../lib/useIsMobile'
import {
  featureCells,
  withOverrides,
  type FeatureCell,
  type FeatureOverride,
} from '../content/notes'
import { usePublishedPosts, type PostRow } from '../data/usePublishedPosts'
import { postDescription } from '../lib/postText'
import { postThumbnail } from '../lib/postThumb'
import { buildNotesGrid } from '../lib/notesGrid'
import { featureMobile, notePlacementMobile } from '../content/notes'
import { coverStyle } from '../lib/imageFocus'
import { useModules } from '../data/useModules'
import { BitesizeCard, PostRenderer } from 'post-renderer'
import {
  toArticleData,
  toBitesizeData,
  toCardsData,
  toLongformData,
  toMemoData,
  toReportData,
} from '../lib/postToRenderer'
import { prose, serif } from '../design/tokens'
import { Hover } from '../lib/Hover'

const label: CSSProperties = {
  fontFamily: "'Be Vietnam Pro',sans-serif",
  fontSize: 9.5,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: '#5A5A50',
}

/**
 * A post filed under Ghi 01, opened where it sits.
 *
 * It is drawn by its own template — the same components the post's own page
 * would use — so nothing here has to know what a memo looks like. The design
 * sends these to a screen of their own; the owner chose to keep the reader in
 * the list instead, so the whole piece unfolds in place and the grid gives it
 * the full width to do it in.
 */
function OpenedPost({
  post,
  mod,
}: {
  post: PostRow
  mod: { title: string; accent: string; on_color: string } | undefined
}) {
  /*
   * Bài mở *bên trong* trang Ghi 01 cũng phải theo bố cục điện thoại.
   *
   * Năm nhánh dưới đây là chỗ gọi `PostRenderer` thứ tư của trang — dễ sót vì
   * nhánh `article` viết nhiều dòng nên `grep '<PostRenderer'` một dòng không
   * thấy nó. Thiếu `mobile` ở đây thì bài memo mở ra trên điện thoại vẫn vẽ
   * tiêu đề 78px thay vì 38: đúng thứ đo được trên bài "taste modality: sơn la"
   * ở bề ngang 390.
   */
  const mobile = useIsMobile()
  return draw(post, mod, mobile)
}

function draw(
  post: PostRow,
  mod: { title: string; accent: string; on_color: string } | undefined,
  mobile: boolean,
) {
  switch (post.template) {
    case 'bitesize':
      return <PostRenderer template="bitesize" post={toBitesizeData(post, { mod })} mobile={mobile} />
    case 'memo':
      return <PostRenderer template="memo" post={toMemoData(post, mod)} mobile={mobile} />
    case 'longform':
      return <PostRenderer template="longform" post={toLongformData(post, mod)} mobile={mobile} />
    case 'cards':
      return <PostRenderer template="cards" post={toCardsData(post, mod)} mobile={mobile} />
    case 'report':
      return <PostRenderer template="report" post={toReportData(post, mod)} mobile={mobile} />
    default:
      return (
        <PostRenderer
          template="article"
          post={toArticleData(post, mod?.title ?? post.module_id, [], -1, mod)}
          mobile={mobile}
        />
      )
  }
}

/**
 * Thẻ một bài trong lưới Ghi 01, lúc chưa mở.
 *
 * Bài viết trên template bitesize note vẽ bằng đúng thẻ của template ấy — vệt
 * sáng sau tiêu đề, gạch đầu thẻ nở ra, thân bài cắt hai dòng. Đó là dàn trang
 * chủ site chỉ đích danh là muốn giữ. Bài trên template khác vẫn là thẻ chung:
 * ảnh, một dòng nhãn, tiêu đề, mô tả.
 *
 * Trạng thái rê chuột nằm ở đây chứ không ở trang, vì nó chỉ nói về một thẻ.
 */
/** Bài bitesize có ảnh/clip đứng — xem chú thích ở chỗ dùng nó. */
function isPortraitNote(post: PostRow): boolean {
  return post.template === 'bitesize' && (post.body as { portrait?: boolean } | null)?.portrait === true
}

function Collapsed({
  post,
  num,
  aspect,
  mediaWidth,
  mob,
}: {
  post: PostRow
  num: string
  aspect: string
  mediaWidth: string
  mob: boolean
}) {
  const [hovered, setHovered] = useState(false)
  if (post.template === 'bitesize') {
    return (
      <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <BitesizeCard
          post={toBitesizeData(post, { num })}
          hovered={hovered}
          aspect={aspect}
          mediaWidth={mediaWidth}
          mobile={mob}
        />
      </div>
    )
  }
  return (
    <>
      {postThumbnail(post) && (
        <div
          style={{
            aspectRatio: aspect,
            width: mediaWidth,
            ...coverStyle(postThumbnail(post)!),
            marginBottom: 18,
          }}
        />
      )}
      <div style={{ ...label, marginBottom: 10 }}>
        {post.template} · {post.date_label}
      </div>
      <div style={{ fontFamily: serif, fontSize: 40, lineHeight: 1.06, letterSpacing: '-.035em' }}>{post.en}</div>
      <div
        style={{
          fontFamily: "'Be Vietnam Pro',sans-serif",
          fontWeight: 200,
          fontSize: 15,
          lineHeight: 1.62,
          color: '#4A4A42',
          marginTop: 12,
        }}
      >
        {postDescription(post)}
      </div>
    </>
  )
}

/**
 * Ô bên cạnh có được phép kê lên ngang tầm ô trước nó không.
 *
 * Luật chủ site: chỗ chồng lớp chỉ được rơi vào ẢNH của bài, không bao giờ
 * rơi vào CHỮ. Margin âm cố định không giữ nổi luật ấy — chiều cao một bài
 * thay đổi theo độ dài tiêu đề, và ô nào đứng liền trước ô nào thì phụ thuộc
 * module có bao nhiêu bài. Ghi 01 mới có một bài: F1 lẽ ra kê cạnh P2 thì
 * hoá ra kê cạnh P1, cả hai cùng dạt trái, 72% + 42% = 114% — ảnh chui thẳng
 * xuống dưới tiêu đề.
 *
 * Nên tính lúc dựng thay vì đặt cứng: chỉ kéo lên khi hai ô đứng KHÁC BÊN và
 * tổng bề rộng còn nằm trong một hàng. Không thoả thì rơi về khoảng cách
 * dương. Bằng cách ấy hai ô không bao giờ chồng lên nhau theo chiều ngang,
 * nên chữ không bao giờ có ảnh ở dưới — bất kể module có mấy bài.
 */
const pct = (w: string): number | null => {
  const m = /^(\d+(?:\.\d+)?)%$/.exec(w)
  return m ? Number(m[1]) : null
}

export function canTuck(
  prev: { w: string; side: 'left' | 'right' } | null,
  self: { w: string; side: 'left' | 'right' },
): boolean {
  if (!prev) return false
  if (prev.side === self.side) return false
  const a = pct(prev.w)
  const b = pct(self.w)
  if (a === null || b === null) return false
  return a + b <= 100
}

function FeatureCellView({
  f,
  dimmed,
  mob,
  prev,
}: {
  f: FeatureCell & { img?: string | null }
  dimmed: boolean
  mob: boolean
  prev: { w: string; side: 'left' | 'right' } | null
}) {
  const fm = featureMobile[f.n]
  const tuck = canTuck(prev, fm)
  /*
   * `zIndex: 1` ở đây và `2` ở bài — luật chủ site chốt: bài chính luôn nằm
   * TRÊN ảnh trang trí. Chỗ chồng lớp cũng chỉ được rơi vào ảnh của bài chứ
   * không rơi vào chữ, nên `mt` âm trong `featureMobile` tính theo chiều cao
   * ảnh của ô liền trước.
   */
  const style: CSSProperties = mob
    ? {
        width: fm.w === 'full' ? 'calc(100% + 40px)' : fm.w,
        alignSelf: fm.side === 'right' ? 'flex-end' : 'flex-start',
        marginTop: tuck ? fm.mt : fm.mtSafe,
        marginLeft: fm.w === 'full' || (fm.side === 'left' && fm.bleed) ? -20 : 0,
        marginRight: fm.side === 'right' && fm.bleed ? -20 : 0,
        position: 'relative',
        zIndex: 1,
        opacity: dimmed ? 0.18 : 1,
      }
    : { gridColumn: f.col, marginTop: f.mt, marginLeft: f.ml, position: 'relative', zIndex: 1, opacity: dimmed ? 0.18 : 1 }
  if (f.kind === 'quote') {
    return (
      <div style={style}>
        {/* Hẹp: bỏ vạch trên. Câu trích đã đứng riêng giữa hai khoảng trắng
            rộng rồi, thêm một vạch nữa là đóng khung một thứ vốn để mở. */}
        <div style={mob ? undefined : { borderTop: '1px solid #12120F', paddingTop: 20 }}>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: mob ? 29 : 36, lineHeight: 1.12, letterSpacing: '-.03em', color: '#12120F' }}>{f.t}</div>
        </div>
      </div>
    )
  }
  if (f.kind === 'count') {
    return (
      <div style={style}>
        <div style={mob ? undefined : { borderTop: '1px solid #12120F', paddingTop: 18 }}>
          <div style={{ fontFamily: serif, fontSize: mob ? 66 : 72, lineHeight: 0.82, letterSpacing: '-.05em' }}>{f.t}</div>
          <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9A9A90', marginTop: 12, lineHeight: 1.6 }}>
            ghi chép đang hiện
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={style}>
      <div
        style={{
          ...(f.img ? coverStyle(f.img) : { background: f.bg }),
          /*
           * Hẹp: tỉ lệ thay cho chiều cao cố định. `h` là 330/268/210px đo cho
           * một ô rộng `span 3` của lưới 12 cột; ô hẹp chỉ còn 26–46% bề ngang
           * mà vẫn cao 330 thì thành một cột màu dựng đứng.
           */
          ...(mob && fm.ar ? { aspectRatio: fm.ar } : { height: f.h }),
          display: 'flex',
          alignItems: 'flex-end',
          padding: mob ? 12 : 14,
          paddingLeft: mob ? 12 : f.pl,
        }}
      >
        {f.t ? (
          <div
            style={{
              fontFamily: "'Be Vietnam Pro',sans-serif",
              fontSize: 9.5,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              lineHeight: 1.5,
              color: f.img ? '#FDFBF2' : '#1F3A38',
              background: f.img ? 'rgba(24,22,17,.55)' : undefined,
              padding: f.img ? '3px 7px' : undefined,
            }}
          >
            {f.t}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * One of the two images that close Ghi 01. Ghi 01 is a page, not a card, so it
 * has no homepage photos — its `img1`/`img2` columns carry these instead, which
 * is why the CMS shows it a footer image group and no module image group. See
 * admin/moduleForm.ts.
 *
 * Without a photo the cell stays the tinted block the design draws; the caption
 * is optional and takes no room when empty.
 */
function FooterImage({
  col,
  height,
  tint,
  img,
  caption,
}: {
  col: string
  height: number
  tint: string
  img?: string | null
  caption?: string
}) {
  return (
    <div
      style={{
        gridColumn: col,
        height,
        ...(img ? coverStyle(img) : { background: tint }),
        display: 'flex',
        alignItems: 'flex-end',
        padding: 14,
      }}
    >
      {caption ? (
        <div
          style={{
            fontFamily: "'Be Vietnam Pro',sans-serif",
            fontSize: 9.5,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            lineHeight: 1.5,
            color: img ? '#FDFBF2' : '#1F3A38',
            background: img ? 'rgba(24,22,17,.55)' : undefined,
            padding: img ? '3px 7px' : undefined,
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Practice — 02 / bite-size. Loose notes, not attached to any module. Cards
 * drift toward the cursor even before you hover; hovering commits to one;
 * clicking expands it in place — text wraps the image, everything else steps
 * aside and dims.
 */
export function Notes() {
  const mob = useIsMobile()
  const { site } = useSiteCopy()
  // Ghi 01's own colours, so an unfolded post wears them the way it would on a
  // page of its own.
  const { data: allModules } = useModules()
  const ghi01 = allModules.find((m) => m.id === 'ghi01')
  // The design's cells, carrying whatever photos and words the CMS has set.
  const drawnCells = useMemo(
    () => withOverrides(featureCells, ghi01?.feature_cells as FeatureOverride[] | undefined),
    [ghi01?.feature_cells],
  )
  // Posts filed under Ghi 01 — the memo lives here, as a post like any other.
  const { data: filed, loading, error } = usePublishedPosts({ moduleId: 'ghi01' })
  const { tags } = useTags()
  // Tag là chữ chủ site tự đặt, nên không còn là bốn giá trị đóng nữa.
  const [noteFilter, setNoteFilter] = useState<string>('tất cả')
  const [openNote, setOpenNoteState] = useState<string | null>(null)

  // Phép lọc và phép đếm để riêng ở `lib/notesFilter` — xem chú thích ở đó.
  const bar = useMemo(() => noteFilterBar(filed, tags, noteFilter), [filed, tags, noteFilter])

  function setOpenNote(v: string | ((prev: string | null) => string | null)) {
    setOpenNoteState(v)
  }


  const noteFilters = bar.chips
  const shownPosts = bar.visiblePosts as typeof filed

  return (
    <div
      onClick={() => {
        setOpenNoteState(null)
      }}
      style={{ background: '#FCFCFA', color: '#12120F', minHeight: '100vh', padding: mob ? '26px 20px 40px' : '44px 72px 56px' }}
    >
      <Breadcrumbs color="#9A9A90" />

      {/* Hẹp: tiêu đề và đoạn dẫn xếp dọc thay vì đứng hai đầu một hàng. */}
      <div
        style={{
          display: 'flex',
          alignItems: mob ? 'stretch' : 'flex-end',
          flexDirection: mob ? 'column' : 'row',
          justifyContent: 'space-between',
          gap: mob ? 20 : 56,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontFamily: serif, fontSize: mob ? 56 : 118, lineHeight: 0.82, letterSpacing: '-.045em', margin: 0, fontWeight: 400 }}>
            {site.notesTitle}
            <span style={{ fontStyle: 'italic', color: '#F2A0A5' }}>.</span>
          </h1>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: mob ? 20 : 27, lineHeight: mob ? 1.2 : undefined, color: '#4A4A42', marginTop: 12 }}>
            {site.notesSubtitle}
          </div>
        </div>
        <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontWeight: 200, fontSize: 13.5, lineHeight: 1.6, color: '#5A5A50', maxWidth: mob ? undefined : 310, paddingBottom: mob ? 0 : 14 }}>
          <div style={prose}>{site.notesIntro}</div>
          <div style={{ marginTop: 10, fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#B0B0A6' }}>
            {site.notesHint}
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: '#FBE7E5',
            color: '#8E1E42',
            fontFamily: "'Be Vietnam Pro',sans-serif",
            fontSize: 12.5,
            padding: '10px 14px',
            marginTop: 20,
          }}
        >
          Không lưu được: {error}
        </div>
      )}

      {/* Năm mục lọc không nằm gọn một hàng ở cột 350px. */}
      <div style={{ display: 'flex', gap: mob ? '14px 22px' : 26, flexWrap: 'wrap', alignItems: mob ? 'baseline' : 'center', margin: mob ? '28px 0 14px' : '44px 0 14px', paddingBottom: mob ? 14 : 16, borderBottom: '1px solid #12120F' }}>
        {noteFilters.map((f) => (
          <Hover
            key={f.f}
            onClick={(e) => {
              e.stopPropagation()
              setNoteFilter(f.f)
            }}
            style={{ ...label, cursor: 'pointer', display: 'flex', gap: 7, alignItems: 'baseline', transition: 'color .3s ease' }}
            hoverStyle={{ color: '#B65A3C' }}
          >
            <div>{f.f}</div>
            <div style={{ fontFamily: serif, fontStyle: 'italic', letterSpacing: 0, fontSize: 12, opacity: 0.6 }}>{f.n}</div>
          </Hover>
        ))}
      </div>

      <div
        style={
          mob
            ? {
                // Lưới 12 cột thành một dòng chảy: mỗi ô tự mang bề rộng, bên
                // đứng và khoảng cách dọc của mình (`notePlacementMobile`,
                // `featureMobile`). Không có `gap` chung — nhịp nén/mở là thứ
                // giữ cho trang không đọc ra như một cột đều tăm tắp.
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                marginTop: 30,
              }
            : {
                display: 'grid',
                gridTemplateColumns: 'repeat(12,minmax(0,1fr))',
                gap: '64px 40px',
                marginTop: 44,
                gridAutoFlow: 'row dense',
                alignItems: 'start',
              }
        }
      >
          {/* A post filed under Ghi 01 unfolds where it sits, the way the
              statistics panel unfolds on Ghi 02 — the reader stays on the page
              they were reading. Open, it takes the full width of the grid and
              everything else steps back. */}
            {buildNotesGrid(shownPosts, drawnCells).map((cell, gi, cells) => {
              /*
               * Hình học hẹp của ô đứng LIỀN TRƯỚC. `FeatureCellView` cần nó để
               * biết có được kê lên ngang tầm ô ấy không — xem `canTuck`.
               * Ô nào đứng trước ô nào phụ thuộc module có mấy bài, nên chỉ ở
               * đây mới biết được, không đặt sẵn trong bảng được.
               */
              const before = gi > 0 ? cells[gi - 1] : null
              const prevGeom = !before
                ? null
                : before.kind === 'feature'
                  ? featureMobile[before.cell.n]
                  : notePlacementMobile[before.slot % notePlacementMobile.length]
              const prev = prevGeom ? { w: prevGeom.w, side: prevGeom.side } : null

              if (cell.kind === 'feature') {
                return (
                  <FeatureCellView key={`F${cell.cell.n}-${gi}`} f={cell.cell} dimmed={openNote !== null} mob={mob} prev={prev} />
                )
              }
              const p = cell.post
              const open = openNote === p.id
              const place = cell.place
              const pm = notePlacementMobile[cell.slot % notePlacementMobile.length]
            return (
              <Hover
                key={p.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenNote((prev) => (prev === p.id ? null : p.id))
                }}
                style={{
                  ...(mob
                    ? {
                        width: open ? '100%' : pm.w,
                        alignSelf: open || pm.side === 'left' ? 'flex-start' : 'flex-end',
                        marginTop: open ? '40px' : pm.mt,
                        // Bài luôn nằm trên ảnh trang trí — luật chủ site chốt.
                        position: 'relative',
                        zIndex: 2,
                      }
                    : {
                        /*
                         * Bài mở ra KHÔNG chiếm trọn bề ngang.
                         *
                         * Chủ site: "bề ngang của bài nó chiếm trọn bề ngang
                         * trang > trông rất lớn và cộc cằn (...) mục tiêu là
                         * tạo cảm giác là bài này pop up và là 1 phần của trang
                         * ghi, thay vì cảm giác như mở hẳn ra trang khác."
                         *
                         * Chín trên mười hai cột — ba phần tư — và thụt vào một
                         * cột ở mép trái. Lưới của trang vẫn nhìn thấy được hai
                         * bên, nên bài đọc ra là một khối nổi lên TRONG trang
                         * chứ không phải một trang mới đè lên.
                         */
                        /*
                         * Thẻ có ảnh đứng cần chỗ rộng hơn.
                         *
                         * Luật của bản design gốc: `col: n.portrait ? 'span 7'
                         * : p.col`. Ảnh đứng nằm CẠNH chữ chứ không nằm trên,
                         * nên ô 4 cột của chu kỳ dàn trang bị chia đôi và cả
                         * hai nửa đều quá hẹp.
                         */
                        gridColumn: open
                          ? '2 / span 9'
                          : isPortraitNote(p)
                            ? 'span 7'
                            : place.col,
                        marginTop: open ? '40px' : place.mt,
                      }),
                  cursor: 'pointer',
                  opacity: openNote !== null && !open ? 0.18 : 1,
                  transition: 'opacity .45s ease',
                }}
                hoverStyle={{ opacity: 1 }}
              >
                {open ? (
                  <OpenedPost post={p} mod={ghi01} />
                ) : (
                  <Collapsed
                    post={p}
                    num={String(shownPosts.length - shownPosts.indexOf(p)).padStart(2, '0')}
                    aspect={mob ? pm.ar : place.ar}
                    mediaWidth={mob ? '100%' : place.mw}
                    mob={mob}
                  />
                )}
              </Hover>
            )
          })}

        {!loading && shownPosts.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              fontFamily: "'Be Vietnam Pro',sans-serif",
              fontWeight: 200,
              fontSize: 15,
              color: '#8A8A80',
              padding: '60px 0',
            }}
          >
            Chưa có ghi chú nào.
          </div>
        )}

      </div>

      <div
        style={{
          marginTop: mob ? 80 : 130,
          borderTop: '1px solid #12120F',
          paddingTop: 26,
          display: 'grid',
          gridTemplateColumns: mob ? 'minmax(0,1fr)' : 'repeat(12,minmax(0,1fr))',
          gap: 30,
          alignItems: 'end',
        }}
      >
        <div style={{ gridColumn: '1 / span 5' }}>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 40, lineHeight: 1.08, letterSpacing: '-.03em' }}>
            {site.notesEnd}
          </div>
          <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontWeight: 200, fontSize: 13.5, lineHeight: 1.6, color: '#5A5A50', marginTop: 12, maxWidth: 330 }}>
            {site.notesEndNote}
          </div>
        </div>
        <FooterImage col="6 / span 3" height={150} tint="#AFC8BC" img={ghi01?.img1} caption={ghi01?.shot1} />
        <FooterImage col="9 / span 4" height={280} tint="#E9B79C" img={ghi01?.img2} caption={ghi01?.shot2} />
      </div>
    </div>
  )
}
