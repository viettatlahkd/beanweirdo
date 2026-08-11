import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  fillers,
  noteBlock,
  noteColor,
  noteKinds,
  notePlacement,
  notes,
  noteTitleSize,
  type Note,
} from '../content/notes'
import { serif } from '../design/tokens'
import { Hover } from '../lib/Hover'

const label: CSSProperties = {
  fontFamily: "'Be Vietnam Pro',sans-serif",
  fontSize: 9.5,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: '#5A5A50',
}

/** How far (px) the cursor's pull reaches before a card stops responding. */
const PROXIMITY_RADIUS = 620

type CardStyle = ReturnType<typeof cardStyle>

function cardStyle(
  n: Note,
  i: number,
  isHv: boolean,
  isOpen: boolean,
  openIdx: number,
  openNote: string | null,
  hoverNote: number | null,
  mx: number | null,
  my: number | null,
  el: HTMLDivElement | null,
) {
  const p = notePlacement[i % notePlacement.length]

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
    cueLabel: isOpen ? 'Bấm ra ngoài để thu lại' : 'Bấm để mở',
  }
}

function NoteCard({
  n,
  i,
  filtered,
  hoverNote,
  openNote,
  setHoverNote,
  setOpenNote,
  mx,
  my,
  setEl,
  el,
}: {
  n: Note
  i: number
  filtered: Note[]
  hoverNote: number | null
  openNote: string | null
  setHoverNote: (v: number | null) => void
  setOpenNote: (v: string | ((prev: string | null) => string | null)) => void
  mx: number | null
  my: number | null
  setEl: (el: HTMLDivElement | null) => void
  el: HTMLDivElement | null
}) {
  const isHv = hoverNote === i
  const isOpen = openNote === n.t
  const openIdx = filtered.findIndex((x) => x.t === openNote)
  const num = String(notes.length - notes.indexOf(n)).padStart(2, '0')
  const color = noteColor[n.k]
  const block = noteBlock[n.k]
  const s: CardStyle = cardStyle(n, i, isHv, isOpen, openIdx, openNote, hoverNote, mx, my, el)

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
          setOpenNote((prev) => (prev === n.t ? null : n.t))
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
              background: block,
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
            {s.mediaLabel}
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
                {n.t}
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

        <div
          style={{
            marginTop: 16,
            fontFamily: "'Be Vietnam Pro',sans-serif",
            fontSize: 10,
            letterSpacing: '.24em',
            textTransform: 'uppercase',
            color,
          }}
        >
          {s.cueLabel}
        </div>
      </div>
    </div>
  )
}

function FillerCell({ f, dimmed }: { f: (typeof fillers)[number]; dimmed: boolean }) {
  const style: CSSProperties = { gridColumn: f.col, marginTop: f.mt, marginLeft: f.ml, position: 'relative', zIndex: 1, opacity: dimmed ? 0.18 : 1 }
  if (f.kind === 'quote') {
    return (
      <div style={style}>
        <div style={{ borderTop: '1px solid #12120F', paddingTop: 20 }}>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 36, lineHeight: 1.12, letterSpacing: '-.03em', color: '#12120F' }}>{f.t}</div>
        </div>
      </div>
    )
  }
  if (f.kind === 'count') {
    return (
      <div style={style}>
        <div style={{ borderTop: '1px solid #12120F', paddingTop: 18 }}>
          <div style={{ fontFamily: serif, fontSize: 72, lineHeight: 0.82, letterSpacing: '-.05em' }}>{f.t}</div>
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
          background: f.bg,
          height: f.h,
          display: 'flex',
          alignItems: 'flex-end',
          padding: 14,
          paddingLeft: f.pl,
          fontFamily: "'Be Vietnam Pro',sans-serif",
          fontSize: 9.5,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: '#1F3A38',
          lineHeight: 1.5,
        }}
      >
        {f.t}
      </div>
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
  const [noteFilter, setNoteFilter] = useState<'tất cả' | Note['k']>('tất cả')
  const [hoverNote, setHoverNote] = useState<number | null>(null)
  const [openNote, setOpenNoteState] = useState<string | null>(null)
  const [mx, setMx] = useState<number | null>(null)
  const [my, setMy] = useState<number | null>(null)

  const rafRef = useRef<number | null>(null)
  const elRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const filteredRef = useRef<Note[]>(notes)

  const filtered = useMemo(
    () => notes.filter((n) => noteFilter === 'tất cả' || n.k === noteFilter),
    [noteFilter],
  )
  filteredRef.current = filtered

  function setOpenNote(v: string | ((prev: string | null) => string | null)) {
    setOpenNoteState(v)
  }

  useEffect(() => {
    if (!openNote) return
    const idx = filteredRef.current.findIndex((n) => n.t === openNote)
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

  const noteFilters = (['tất cả', ...noteKinds] as ('tất cả' | Note['k'])[])
    .map((f) => ({
      f,
      on: f === noteFilter,
      n: f === 'tất cả' ? notes.length : notes.filter((x) => x.k === f).length,
    }))

  return (
    <div
      onClick={() => {
        setOpenNoteState(null)
        setHoverNote(null)
      }}
      style={{ background: '#FCFCFA', color: '#12120F', minHeight: '100vh', padding: '56px 72px 56px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 56, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: 9.5, letterSpacing: '.34em', textTransform: 'uppercase', color: '#9A9A90', marginBottom: 20 }}>
            beӕn weirdo — 02
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 118, lineHeight: 0.82, letterSpacing: '-.045em', margin: 0, fontWeight: 400 }}>
            Notes<span style={{ fontStyle: 'italic', color: '#F2A0A5' }}>.</span>
          </h1>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 27, color: '#4A4A42', marginTop: 12 }}>
            ghi chép rời — không thuộc module nào
          </div>
        </div>
        <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontWeight: 200, fontSize: 13.5, lineHeight: 1.6, color: '#5A5A50', maxWidth: 310, paddingBottom: 14 }}>
          Một quan sát vật lý trong bếp, một đoạn video không tiếng, một ý nghĩ bắc cầu giữa hai lĩnh vực.
          <div style={{ marginTop: 10, fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#B0B0A6' }}>
            Bấm vào bài để xổ toàn bộ nội dung · bấm ra ngoài để thu lại
          </div>
        </div>
      </div>

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
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12,minmax(0,1fr))',
          gap: '64px 40px',
          marginTop: 44,
          gridAutoFlow: 'row dense',
          alignItems: 'start',
        }}
      >
        {filtered.map((n, i) => {
          const cells = [
            <NoteCard
              key={n.t}
              n={n}
              i={i}
              filtered={filtered}
              hoverNote={hoverNote}
              openNote={openNote}
              setHoverNote={setHoverNote}
              setOpenNote={setOpenNote}
              mx={mx}
              my={my}
              el={elRefs.current[i] ?? null}
              setEl={(el) => {
                elRefs.current[i] = el
              }}
            />,
          ]
          fillers
            .filter((f) => f.after === i)
            .forEach((f, fi) =>
              cells.push(<FillerCell key={`filler-${i}-${fi}`} f={f} dimmed={openNote !== null} />),
            )
          return cells
        })}
      </div>

      <div
        style={{
          marginTop: 130,
          borderTop: '1px solid #12120F',
          paddingTop: 26,
          display: 'grid',
          gridTemplateColumns: 'repeat(12,minmax(0,1fr))',
          gap: 30,
          alignItems: 'end',
        }}
      >
        <div style={{ gridColumn: '1 / span 5' }}>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 40, lineHeight: 1.08, letterSpacing: '-.03em' }}>
            Hết phần đã ghi.
          </div>
          <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontWeight: 200, fontSize: 13.5, lineHeight: 1.6, color: '#5A5A50', marginTop: 12, maxWidth: 330 }}>
            Ghi chép mới sẽ chèn lên đầu trang.
          </div>
        </div>
        <div
          style={{
            gridColumn: '6 / span 3',
            height: 150,
            background: '#AFC8BC',
            display: 'flex',
            alignItems: 'flex-end',
            padding: 14,
            fontFamily: "'Be Vietnam Pro',sans-serif",
            fontSize: 9.5,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: '#1F3A38',
            lineHeight: 1.5,
          }}
        >
          ảnh nhỏ — chi tiết lặp lại của theme
        </div>
        <div
          style={{
            gridColumn: '9 / span 4',
            height: 280,
            background: '#E9B79C',
            display: 'flex',
            alignItems: 'flex-end',
            padding: 14,
            fontFamily: "'Be Vietnam Pro',sans-serif",
            fontSize: 9.5,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: '#1F3A38',
            lineHeight: 1.5,
          }}
        >
          ảnh ngang — quang cảnh rộng, kết thúc mạch đọc
        </div>
      </div>
    </div>
  )
}
