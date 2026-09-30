import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { useSiteCopy } from '../data/useSiteCopy'
import { noteFilterBar } from '../lib/notesFilter'
import { useTags } from '../data/useTags'
import { useIsMobile } from '../lib/useIsMobile'
import { useNarrow } from '../lib/useNarrow'
import { BLOCK_SIZE, byTimeNewestFirst, placePosts } from '../lib/notesBlocks'
import {
  cellRatio,
  featureCells,
  withOverrides,
  type FeatureCell,
  type FeatureOverride,
} from '../content/notes'
import { usePublishedPosts, type PostRow } from '../data/usePublishedPosts'
import { postDescription } from '../lib/postText'
import { postThumbnail } from '../lib/postThumb'
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
  /*
   * Bài mở ra chỉ chiếm ba phần tư lưới, nên trên màn 905 nó còn 561 — hẹp hơn
   * ngưỡng 899 trong khi cửa sổ thì không. Hỏi cửa sổ ở đây là hỏi sai chỗ:
   * memo có cột thông số rộng cứng 300px, và ở 561 thì cột tiêu đề bên cạnh còn
   * 93px, tiêu đề xuống dòng từng chữ cái một. Nên đo chính khối này.
   */
  const box = useRef<HTMLDivElement>(null)
  const narrow = useNarrow(box)
  const tight = mobile || narrow
  return <div ref={box}>{draw(post, mod, tight)}</div>
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
 * Mọi bài trong lưới Ghi 01 đứng cùng một khung: cùng bề ngang cột, cùng tỉ lệ
 * ảnh. Chủ site 2026-09-24: "các bài viết phải cùng size với nhau bất kể
 * layout". Trước đó mỗi bài lấy một chỗ đặt riêng (span 4 hay 5, lệch trên tới
 * 150px, ảnh rộng 72–94%) nên thẻ to nhỏ lệch nhau và ảnh trang trí chen vào.
 */
const CARD_AR = '4/3'

/**
 * Ghi 01's block of eight slots, from the owner's sketch of 2026-09-24 and
 * their rule that followed it: "các row đều sẽ là 2 bài 1 deco" — four rows,
 * each two posts and one piece of decoration, placed loosely rather than in
 * line. Two sizes: big (five of twelve columns) for slots 0 and 5, small
 * (four) for the rest; decoration takes two or three. Within a row nothing
 * shares a column, so nothing can overlap whatever its height. Which post
 * goes in which slot is `placePosts`; row r holds slots 2r and 2r+1.
 *
 * Each row has a spare grid row under it for an opened post, so a post
 * unfolds right under its own row and the slots around it do not move. An
 * empty grid row has no height, so unused spare rows cost nothing.
 */
type Spot = { col: string; mt: number; big?: boolean }
const ROWS: { posts: [Spot, Spot]; deco: Spot }[] = [
  { posts: [{ col: '1 / span 5', mt: 60, big: true }, { col: '7 / span 4', mt: 0 }], deco: { col: '11 / span 2', mt: 150 } },
  { posts: [{ col: '5 / span 4', mt: 30 }, { col: '9 / span 4', mt: 160 }], deco: { col: '1 / span 3', mt: 110 } },
  { posts: [{ col: '2 / span 4', mt: 80 }, { col: '8 / span 5', mt: 0, big: true }], deco: { col: '6 / span 2', mt: 190 } },
  { posts: [{ col: '1 / span 4', mt: 100 }, { col: '6 / span 4', mt: 20 }], deco: { col: '11 / span 2', mt: 140 } },
]
const ROWS_PER_BLOCK = ROWS.length
/** Space above every row but a block's first, and above every block but the first. */
const ROW_GAP = 70
const BLOCK_GAP = 100

/** Where row `r` of `block` sits in the grid; the row after it is its spare. */
const gridLine = (block: number, r: number) => block * ROWS_PER_BLOCK * 2 + 2 * r + 1
const rowTop = (block: number, r: number) => (r > 0 ? ROW_GAP : block > 0 ? BLOCK_GAP : 0)

/*
 * One column on a phone, so the scatter lives in width and left margin
 * (percent of the column). Four steps, so two posts in a row never share
 * both — the owner found two same-width cards stacked edge to edge "too
 * straight". Big slots are wider than any small one.
 */
const MOB_POSTS: { w: number; ml: number }[] = [
  { w: 80, ml: 0 },
  { w: 70, ml: 28 },
  { w: 76, ml: 9 },
  { w: 66, ml: 22 },
]
const MOB_BIG = 92

/**
 * Thẻ một bài trong lưới Ghi 01, lúc chưa mở.
 *
 * Bài viết trên template bitesize note vẽ bằng đúng thẻ của template ấy — vệt
 * sáng sau tiêu đề, gạch đầu thẻ nở ra, thân bài cắt hai dòng. Bài trên
 * template khác là thẻ chung: ảnh, một dòng nhãn, tiêu đề, mô tả.
 *
 * Trạng thái rê chuột nằm ở đây chứ không ở trang, vì nó chỉ nói về một thẻ.
 */
function Collapsed({ post, num }: { post: PostRow; num: string }) {
  const [hovered, setHovered] = useState(false)
  if (post.template === 'bitesize') {
    return (
      <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <BitesizeCard
          post={toBitesizeData(post, { num })}
          hovered={hovered}
          aspect={CARD_AR}
          mediaWidth="100%"
          /*
           * Always the stacked layout. A portrait card otherwise sets its
           * photo beside the words, which makes it a different shape from its
           * neighbours — and in a narrow column its title spilled out of the
           * cell entirely.
           */
          mobile
        />
      </div>
    )
  }
  const thumb = postThumbnail(post)
  return (
    <>
      {/* A post without a photo still gets the frame, so every card in a row
          starts its words at the same height. */}
      <div
        style={{
          aspectRatio: CARD_AR,
          width: '100%',
          ...(thumb ? coverStyle(thumb) : { background: '#EFEDE4' }),
          marginBottom: 18,
        }}
      />
      <div style={{ ...label, marginBottom: 10 }}>
        {post.template} · {post.date_label}
      </div>
      <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1.08, letterSpacing: '-.03em' }}>{post.en}</div>
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
 * One piece of Ghi 01's decoration — a photo or the quotation — sitting small
 * in its own columns of a row (`ROWS`).
 *
 * A photo keeps its cell's old proportion (`cellRatio`) because the crop the
 * owner set in the CMS was cut to it; it is drawn at a fixed small height and
 * never wider than its three columns. A slot with no photo is a colour block
 * with the design's placeholder caption, which says nothing to a reader, so
 * it is left out (see `blockLayout`).
 */
function DecoItem({ cell, mob }: { cell: Cell; mob: boolean }) {
  if (cell.kind === 'quote') {
    return (
      <div
        style={{
          fontFamily: serif,
          fontStyle: 'italic',
          fontSize: mob ? 20 : 22,
          lineHeight: 1.2,
          letterSpacing: '-.02em',
          color: '#12120F',
          borderTop: '1px solid #12120F',
          paddingTop: 14,
        }}
      >
        {cell.t}
      </div>
    )
  }
  const h = mob ? 120 : 170
  return (
    <div
      style={{
        height: h,
        width: Math.round(h * cellRatio(cell)),
        maxWidth: '100%',
        ...coverStyle(cell.img!),
        display: 'flex',
        alignItems: 'flex-end',
        padding: 8,
        boxSizing: 'border-box',
      }}
    >
      {cell.t ? (
        <div
          style={{
            fontFamily: "'Be Vietnam Pro',sans-serif",
            fontSize: 8.5,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            lineHeight: 1.5,
            color: '#FDFBF2',
            background: 'rgba(24,22,17,.55)',
            padding: '2px 6px',
          }}
        >
          {cell.t}
        </div>
      ) : null}
    </div>
  )
}

type Cell = FeatureCell & { img?: string | null }

/** A cell the owner has filled in under Cấu hình: a photo, or the quotation's words. */
const configured = (c: Cell) => (c.kind === 'slot' ? !!c.img : !!c.t)

type LayoutItem =
  | { kind: 'post'; post: PostRow; i: number; block: number; slot: number }
  | { kind: 'deco'; cell: Cell; block: number; row: number }

/**
 * Posts in their slots, top block first, each row closed by its decoration —
 * the order a phone stacks them. A row with no post yet is left out whole,
 * decoration and all (the owner, 2026-09-24: "row nào mà chưa có bài này thì
 * ẩn đi"); posts fill a block from the bottom, so a young block shows only
 * its lower rows.
 *
 * The rows shown take the feature cells in F-order, one each: the first row
 * F1, the next F2, and so on. A cell the owner has not filled in under Cấu
 * hình leaves its row without decoration — the owner, 2026-09-24: "cái nào
 * đang chưa có config thì để trống". Rows past the last cell have none. An
 * earlier version skipped empty cells and cycled the photos, which drew the
 * one photo set on every row.
 */
function blockLayout(posts: readonly PostRow[], cells: readonly Cell[]): LayoutItem[] {
  const placed = placePosts(posts.length)
  const blocks = Math.ceil(posts.length / BLOCK_SIZE)
  const out: LayoutItem[] = []
  let shown = 0
  for (let block = 0; block < blocks; block++) {
    for (let row = 0; row < ROWS_PER_BLOCK; row++) {
      const here = placed.filter((p) => p.block === block && Math.floor(p.slot / 2) === row)
      if (!here.length) continue
      for (const at of here.sort((a, b) => a.slot - b.slot)) out.push({ kind: 'post', post: posts[at.i], ...at })
      const cell = cells[shown++]
      if (cell && configured(cell)) out.push({ kind: 'deco', cell, block, row })
    }
  }
  return out
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
  // `withBody` bật ở đúng màn này: bài filed dưới Ghi 01 mở ra **ngay tại chỗ**
  // (xem `OpenedPost`), nên danh sách phải cầm sẵn nội dung. Mọi màn khác dẫn
  // sang trang riêng của bài, và trang ấy tự đọc bằng `usePost`.
  const { data: filed, loading, error } = usePublishedPosts({ moduleId: 'ghi01', withBody: true })
  const { tags } = useTags()
  // Tag là chữ chủ site tự đặt, nên không còn là bốn giá trị đóng nữa.
  const [noteFilter, setNoteFilter] = useState<string>('tất cả')
  const [openNote, setOpenNoteState] = useState<string | null>(null)

  // Phép lọc và phép đếm để riêng ở `lib/notesFilter` — xem chú thích ở đó.
  const bar = useMemo(() => noteFilterBar(filed, tags, noteFilter), [filed, tags, noteFilter])

  function setOpenNote(v: string | ((prev: string | null) => string | null)) {
    setOpenNoteState(v)
  }

  /*
   * Bring the unfolded post to the reader.
   *
   * Opening one reflows the grid: the post widens to nine columns and the
   * dense flow packs the cells around it somewhere else, so from the second
   * post on it tended to land below the fold — the reader clicked and saw the
   * page merely dim. Scroll it to the top of the view once it has been laid
   * out. `scrollIntoView` rather than `window.scrollTo` because the scroll may
   * belong to a container, not the window.
   */
  useEffect(() => {
    if (!openNote) return
    const frame = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-note="${CSS.escape(openNote)}"]`)
      if (!el) return
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [openNote])


  const noteFilters = bar.chips
  // Ordered by time alone, so a post keeps its slot — see `byTimeNewestFirst`.
  const shownPosts = useMemo(() => byTimeNewestFirst(bar.visiblePosts as typeof filed), [bar.visiblePosts])
  const layout = useMemo(() => blockLayout(shownPosts, drawnCells), [shownPosts, drawnCells])

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
            ? { display: 'flex', flexDirection: 'column', gap: 36, marginTop: 30 }
            : {
                // Twelve columns, so each slot can sit where `ROWS` says and
                // an opened post can take `2 / span 9` on a row of its own.
                display: 'grid',
                gridTemplateColumns: 'repeat(12,minmax(0,1fr))',
                columnGap: 40,
                rowGap: 0,
                marginTop: 44,
                alignItems: 'start',
              }
        }
      >
        {/* A post filed under Ghi 01 unfolds where it sits, the way the
            statistics panel unfolds on Ghi 02 — the reader stays on the page
            they were reading. Open, it widens on the line under its row and
            everything else steps back. */}
        {layout.map((item, n) => {
          if (item.kind === 'deco') {
            const spot = ROWS[item.row].deco
            return (
              <div
                key={`deco-${item.block}-${item.row}`}
                style={{
                  ...(mob
                    ? {
                        width: item.cell.kind === 'quote' ? '80%' : '52%',
                        alignSelf: item.cell.kind === 'quote' ? 'flex-start' : 'flex-end',
                      }
                    : {
                        gridColumn: spot.col,
                        gridRow: gridLine(item.block, item.row),
                        marginTop: spot.mt + rowTop(item.block, item.row),
                      }),
                  opacity: openNote !== null ? 0.18 : 1,
                  transition: 'opacity .45s ease',
                }}
              >
                <DecoItem cell={item.cell} mob={mob} />
              </div>
            )
          }
          const { post: p, block, slot, i } = item
          const open = openNote === p.id
          const r = Math.floor(slot / 2)
          const spot = ROWS[r].posts[slot % 2]
          const m = MOB_POSTS[n % MOB_POSTS.length]
          return (
            <Hover
              key={p.id}
              data-note={p.id}
              data-slot={slot}
              onClick={(e) => {
                e.stopPropagation()
                setOpenNote((prev) => (prev === p.id ? null : p.id))
              }}
              style={{
                ...(mob
                  ? {
                      width: open ? '100%' : `${spot.big ? MOB_BIG : m.w}%`,
                      marginLeft: open || spot.big ? 0 : `${m.ml}%`,
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
                       * Chín trên mười hai cột, thụt vào một cột ở mép trái,
                       * trên hàng trống ngay dưới hàng của nó.
                       */
                      gridColumn: open ? '2 / span 9' : spot.col,
                      gridRow: gridLine(block, r) + (open ? 1 : 0),
                      marginTop: open ? 64 : spot.mt + rowTop(block, r),
                    }),
                cursor: 'pointer',
                // Room above the post once it is scrolled to — see the effect on `openNote`.
                scrollMarginTop: mob ? 16 : 32,
                opacity: openNote !== null && !open ? 0.18 : 1,
                transition: 'opacity .45s ease',
              }}
              hoverStyle={{ opacity: 1 }}
            >
              {open ? (
                <OpenedPost post={p} mod={ghi01} />
              ) : (
                <Collapsed post={p} num={String(shownPosts.length - i).padStart(2, '0')} />
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
