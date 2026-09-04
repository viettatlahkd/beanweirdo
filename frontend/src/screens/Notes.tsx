import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { useSiteCopy } from '../data/useSiteCopy'
import { noteFilterBar } from '../lib/notesFilter'
import { useTags } from '../data/useTags'
import {
  featureCells,
  noteBlock,
  noteColor,
  notePlacement,
  noteTitleSize,
  withOverrides,
  type FeatureCell,
  type FeatureOverride,
  type Note,
} from '../content/notes'
import { useNotes } from '../data/useNotes'
import { usePublishedPosts, type PostRow } from '../data/usePublishedPosts'
import { postDescription } from '../lib/postText'
import { postThumbnail } from '../lib/postThumb'
import { buildNotesGrid } from '../lib/notesGrid'
import { featureMobile, notePlacementMobile } from '../content/notes'
import { useIsMobile } from '../lib/useIsMobile'
import { coverStyle } from '../lib/imageFocus'
import { useModules } from '../data/useModules'
import { PostRenderer } from 'post-renderer'
import {
  toArticleData,
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
  switch (post.template) {
    case 'memo':
      return <PostRenderer template="memo" post={toMemoData(post, mod)} />
    case 'longform':
      return <PostRenderer template="longform" post={toLongformData(post, mod)} />
    case 'cards':
      return <PostRenderer template="cards" post={toCardsData(post, mod)} />
    case 'report':
      return <PostRenderer template="report" post={toReportData(post, mod)} />
    default:
      return (
        <PostRenderer
          template="article"
          post={toArticleData(post, mod?.title ?? post.module_id, [], -1, mod)}
        />
      )
  }
}

/** How far (px) the cursor's pull reaches before a card stops responding. */
const PROXIMITY_RADIUS = 620

type CardStyle = ReturnType<typeof cardStyle>

function cardStyle(
  n: Note,
  i: number,
  /** Chỗ đứng trong chu kỳ 8 vị trí — khác `i`, vì bài đã xếp trước ghi chú. */
  slot: number,
  isHv: boolean,
  isOpen: boolean,
  openIdx: number,
  openNote: string | null,
  hoverNote: number | null,
  mx: number | null,
  my: number | null,
  el: HTMLDivElement | null,
) {
  const p = notePlacement[slot % notePlacement.length]

  let prox = 0
  if (openNote === null && mx !== null && my !== null && el) {
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const d = Math.hypot(mx - cx, my - cy)
    prox = Math.max(0, 1 - d / PROXIMITY_RADIUS)
  }
  const scale = 1 + prox * prox * 0.05
  const lift = -(prox * prox * 12)
  const other =
    (hoverNote !== null && hoverNote !== i && openNote === null) || (openNote !== null && !isOpen)

  return {
    col: isOpen ? '1 / -1' : n.portrait ? 'span 7' : p.col,
    mt: isOpen ? '40px' : p.mt,
    z: isOpen ? 6 : 3,
    ar: isOpen ? (n.portrait ? '9/16' : '4/3') : n.portrait ? '3/4' : p.ar,
    mediaW: isOpen ? (n.portrait ? '250px' : '300px') : n.portrait ? '40%' : p.mw,
    mediaLabel:
      n.len === 'media'
        ? n.portrait
          ? 'video dọc — clip quay dọc'
          : 'video ngang — clip ngắn không tiếng'
        : n.mediaHint || 'ảnh — cận cảnh chủ thể',
    size: isOpen ? '52px' : n.portrait ? '23px' : noteTitleSize(n.len),
    opacity: other
      ? '.18'
      : openNote === null && mx !== null
        ? String(0.62 + prox * 0.38)
        : '1',
    shift: isOpen
      ? 'none'
      : openNote !== null
        ? i < openIdx
          ? 'translateX(-30px) scale(.96)'
          : 'translateX(30px) scale(.96)'
        : `translateY(${lift.toFixed(1)}px) scale(${scale.toFixed(3)})`,
    ease:
      openNote !== null
        ? 'transform .7s cubic-bezier(.16,.84,.32,1)'
        : 'transform .42s cubic-bezier(.22,.8,.3,1)',
    washSize: isHv || isOpen ? '100% 100%' : '0% 100%',
    ruleW: isHv || isOpen ? '100%' : '34px',
    pop: isOpen ? '#FFFFFF' : 'transparent',
    popPad: isOpen ? '36px 40px 40px' : '0',
    popShadow: isOpen ? '0 40px 80px -50px rgba(18,18,15,.55), 0 2px 0 rgba(18,18,15,.06)' : 'none',
    bodyOpacity: isHv || isOpen ? 1 : 0.5,
    rowDisplay: isOpen ? 'block' : 'flex',
    mediaFloat: isOpen ? 'left' : 'none',
    mediaMr: isOpen ? '34px' : '0',
    mediaMb: isOpen ? '22px' : '0',
    dir: n.portrait ? 'row' : 'column',
    rowGap: isOpen || n.portrait ? '30px' : '20px',
    subSlot: n.portrait ? 'ảnh phụ — khung hình cắt ra từ clip' : 'ảnh phụ — chi tiết bổ trợ cho bài',
  }
}

function NoteCard({
  n,
  i,
  slot,
  filtered,
  hoverNote,
  openNote,
  setHoverNote,
  setOpenNote,
  mx,
  my,
  setEl,
  el,
  total,
}: {
  n: Note
  i: number
  /** Vị trí trong chu kỳ dàn trang — ghi chú tiếp nối sau các bài đã xếp. */
  slot: number
  filtered: Note[]
  hoverNote: number | null
  openNote: string | null
  setHoverNote: (v: number | null) => void
  setOpenNote: (v: string | ((prev: string | null) => string | null)) => void
  mx: number | null
  my: number | null
  setEl: (el: HTMLDivElement | null) => void
  el: HTMLDivElement | null
  /** Signed in — the note is written straight into the page. */
  total: number
}) {
  const isHv = hoverNote === i
  // Keyed by id, not title: a note being written has no title yet, and two
  // could share one.
  const isOpen = openNote === n.id
  const openIdx = filtered.findIndex((x) => x.id === openNote)
  const num = String(total - i).padStart(2, '0')
  const color = noteColor[n.k]
  const block = noteBlock[n.k]
  const s: CardStyle = cardStyle(n, i, slot, isHv, isOpen, openIdx, openNote, hoverNote, mx, my, el)

  return (
    <div
      ref={setEl}
      onMouseEnter={() => setHoverNote(i)}
      onMouseLeave={() => setHoverNote(null)}
      style={{
        gridColumn: s.col,
        marginTop: s.mt,
        position: 'relative',
        zIndex: s.z,
        opacity: s.opacity,
        transform: s.shift,
        transition: `opacity .45s ease, ${s.ease}`,
      }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation()
          setOpenNote((prev) => (prev === n.id ? null : n.id))
        }}
        style={{
          display: 'flow-root',
          cursor: 'pointer',
          background: s.pop,
          padding: s.popPad,
          boxShadow: s.popShadow,
          transition: 'padding .5s cubic-bezier(.16,.84,.32,1), box-shadow .5s ease',
        }}
      >
        <div
          style={{
            height: 1,
            background: '#12120F',
            width: s.ruleW,
            transition: 'width .7s cubic-bezier(.16,.84,.32,1)',
            marginBottom: 14,
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 14,
            marginBottom: 16,
            fontFamily: "'Be Vietnam Pro',sans-serif",
          }}
        >
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 15, color }}>{num}</div>
          <div style={{ fontSize: 9.5, letterSpacing: '.26em', textTransform: 'uppercase', color }}>{n.k}</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 10, letterSpacing: '.16em', color: '#B0B0A6', fontVariantNumeric: 'tabular-nums' }}>
            {n.d}
          </div>
        </div>

        <div
          style={{
            display: s.rowDisplay as CSSProperties['display'],
            flexDirection: s.dir as CSSProperties['flexDirection'],
            gap: s.rowGap,
            alignItems: 'flex-start',
            marginBottom: 18,
          }}
        >
          <div
            style={{
              flex: 'none',
              float: s.mediaFloat as CSSProperties['float'],
              marginRight: s.mediaMr,
              marginBottom: s.mediaMb,
              aspectRatio: s.ar,
              width: s.mediaW,
              // A note with a photograph shows it; the tinted block with its
              // caption is what stands in until there is one.
              background: n.img ? `url(${n.img}) center/cover no-repeat` : block,
              display: 'flex',
              alignItems: 'flex-end',
              padding: 14,
              fontFamily: "'Be Vietnam Pro',sans-serif",
              fontWeight: 500,
              fontSize: 9.5,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: '#1F3A38',
              transition: 'aspect-ratio .6s cubic-bezier(.16,.84,.32,1)',
            }}
          >
            {n.img ? null : s.mediaLabel}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: serif, fontSize: s.size, lineHeight: 1.14, letterSpacing: '-.035em', marginBottom: 16 }}>
              <span
                style={{
                  display: 'inline',
                  boxDecorationBreak: 'clone',
                  WebkitBoxDecorationBreak: 'clone',
                  padding: '.04em .14em',
                  marginLeft: '-.14em',
                  color: '#12120F',
                  backgroundImage: `linear-gradient(${block}, ${block})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: s.washSize,
                  backgroundPosition: 'left center',
                  transition: 'background-size .6s cubic-bezier(.16,.84,.32,1)',
                }}
              >
                <span>{n.t}</span>
              </span>
            </div>

            {isOpen && (
              <div style={{ float: 'right', clear: 'left', width: 190, margin: '6px 0 18px 30px' }}>
                <div
                  style={{
                    aspectRatio: '4/5',
                    background: block,
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 12,
                    fontFamily: "'Be Vietnam Pro',sans-serif",
                    fontSize: 9,
                    letterSpacing: '.18em',
                    textTransform: 'uppercase',
                    color: '#1F3A38',
                    lineHeight: 1.5,
                  }}
                >
                  {s.subSlot}
                </div>
                <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontWeight: 200, fontSize: 11.5, lineHeight: 1.5, color: '#8A8A80', marginTop: 8 }}>
                  Ảnh phụ đi kèm — chi tiết nhỏ trong bài.
                </div>
              </div>
            )}

            <div
              style={{
                fontFamily: "'Be Vietnam Pro',sans-serif",
                fontWeight: 200,
                fontSize: isOpen ? '15.5px' : '14px',
                lineHeight: 1.62,
                color: '#4A4A42',
                opacity: s.bodyOpacity,
                transition: 'opacity .5s ease',
                display: isOpen ? 'block' : '-webkit-box',
                WebkitLineClamp: isOpen ? undefined : 2,
                WebkitBoxOrient: isOpen ? undefined : 'vertical',
                overflow: isOpen ? undefined : 'hidden',
              }}
            >
              {n.b}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCellView({
  f,
  dimmed,
  mob,
}: {
  f: FeatureCell & { img?: string | null }
  dimmed: boolean
  mob: boolean
}) {
  const fm = featureMobile[f.n]
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
        marginTop: fm.mt,
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
  const { notes, loading, error } = useNotes()
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
  const { data: filed } = usePublishedPosts({ moduleId: 'ghi01' })
  const { tags } = useTags()
  // Tag là chữ chủ site tự đặt, nên không còn là bốn giá trị đóng nữa.
  const [noteFilter, setNoteFilter] = useState<string>('tất cả')
  const [hoverNote, setHoverNote] = useState<number | null>(null)
  const [openNote, setOpenNoteState] = useState<string | null>(null)
  const [mx, setMx] = useState<number | null>(null)
  const [my, setMy] = useState<number | null>(null)

  const rafRef = useRef<number | null>(null)
  const elRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const filteredRef = useRef<Note[]>([])

  // Phép lọc và phép đếm để riêng ở `lib/notesFilter` — xem chú thích ở đó.
  const bar = useMemo(() => noteFilterBar(notes, filed, tags, noteFilter), [notes, filed, tags, noteFilter])
  const filtered = bar.visibleNotes as Note[]
  filteredRef.current = filtered

  function setOpenNote(v: string | ((prev: string | null) => string | null)) {
    setOpenNoteState(v)
  }

  useEffect(() => {
    if (!openNote) return
    const idx = filteredRef.current.findIndex((n) => n.id === openNote)
    const run = () => {
      const el = elRefs.current[idx]
      if (!el) return
      const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 110)
      const before = window.scrollY
      if (Math.abs(top - before) < 4) return
      try {
        window.scrollTo({ top, behavior: 'smooth' })
      } catch {
        window.scrollTo(0, top)
      }
      setTimeout(() => {
        if (Math.abs(window.scrollY - before) < 2) window.scrollTo(0, top)
      }, 80)
    }
    const t = setTimeout(run, 30)
    return () => clearTimeout(t)
  }, [openNote])

  function onGridMove(e: React.MouseEvent) {
    const x = e.clientX
    const y = e.clientY
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      setMx(x)
      setMy(y)
    })
  }

  const noteFilters = bar.chips
  const shownPosts = bar.visiblePosts as typeof filed

  return (
    <div
      onClick={() => {
        setOpenNoteState(null)
        setHoverNote(null)
      }}
      style={{ background: '#FCFCFA', color: '#12120F', minHeight: '100vh', padding: mob ? '26px 20px 40px' : '44px 72px 56px' }}
    >
      <Breadcrumbs color="#9A9A90" />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 56, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 118, lineHeight: 0.82, letterSpacing: '-.045em', margin: 0, fontWeight: 400 }}>
            {site.notesTitle}
            <span style={{ fontStyle: 'italic', color: '#F2A0A5' }}>.</span>
          </h1>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 27, color: '#4A4A42', marginTop: 12 }}>
            {site.notesSubtitle}
          </div>
        </div>
        <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontWeight: 200, fontSize: 13.5, lineHeight: 1.6, color: '#5A5A50', maxWidth: 310, paddingBottom: 14 }}>
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

      <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', alignItems: 'center', margin: '44px 0 14px', paddingBottom: 16, borderBottom: '1px solid #12120F' }}>
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
        onMouseMove={onGridMove}
        onMouseLeave={() => {
          setMx(null)
          setMy(null)
        }}
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
            {buildNotesGrid(shownPosts, drawnCells).map((cell, gi) => {
              if (cell.kind === 'feature') {
                return (
                  <FeatureCellView key={`F${cell.cell.n}-${gi}`} f={cell.cell} dimmed={openNote !== null} mob={mob} />
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
                        gridColumn: open ? '1 / -1' : place.col,
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
                  <>
                    {postThumbnail(p) && (
                      <div
                        style={{
                          aspectRatio: mob ? pm.ar : place.ar,
                          width: mob ? '100%' : place.mw,
                          ...coverStyle(postThumbnail(p)!),
                          marginBottom: 18,
                        }}
                      />
                    )}
                    <div style={{ ...label, marginBottom: 10 }}>
                      {p.template} · {p.date_label}
                    </div>
                    <div
                      style={{
                        fontFamily: serif,
                        fontSize: 40,
                        lineHeight: 1.06,
                        letterSpacing: '-.035em',
                      }}
                    >
                      {p.en}
                    </div>
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
                      {postDescription(p)}
                    </div>
                  </>
                )}
              </Hover>
            )
          })}

        {!loading && filtered.length === 0 && shownPosts.length === 0 && (
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

        {filtered.map((n, i) => {
          const cells = [
            <NoteCard
              key={n.id}
              n={n}
              i={i}
              slot={filed.length + i}
              filtered={filtered}
              hoverNote={hoverNote}
              openNote={openNote}
              setHoverNote={setHoverNote}
              setOpenNote={setOpenNote}
              mx={mx}
              my={my}
              el={elRefs.current[i] ?? null}
              total={notes.length}
              setEl={(el) => {
                elRefs.current[i] = el
              }}
            />,
          ]
          return cells
        })}
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
