import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { readFocus, stripFocus, withFocus, type Focus } from '../../lib/imageFocus'
import { ink, paper, sans, serif } from '../../design/tokens'
import { Button } from '../../design/Button'
import { radius } from '../../design/controls'

const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(18,16,12,.78)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 60,
  padding: 24,
}

const card: CSSProperties = {
  background: paper.cream,
  /*
   * `ink.border` chứ không phải `paper.rule`: `paper.rule` là gạch chia trong
   * một trang giấy, nhạt nhất trong bộ — đúng cái chủ site gọi là "nhạt nhạt".
   * Viền của mọi control khu quản trị dùng `ink.border`, và một hộp thoại là
   * một control chứ không phải một trang.
   */
  border: `1px solid ${ink.border}`,
  outline: 'none',
  borderRadius: radius,
  padding: 22,
  maxWidth: 680,
  width: '100%',
  maxHeight: '100%',
  overflowY: 'auto',
}

const title: CSSProperties = {
  fontFamily: serif,
  fontSize: 22,
  color: ink.base,
  marginBottom: 2,
}

const sub: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: ink.faint,
}

/**
 * Snap the frame to an edge of the photo, or to the middle of it.
 *
 * Dragging is for the in-between; most of the time what someone wants is the
 * top of a portrait or the left of a panorama, and hunting for the edge by hand
 * is worse than saying "that edge". Only the axis with something to choose is
 * offered — a photo the same shape as its frame has nothing to leave out.
 */
function AlignRow({
  axis,
  value,
  enabled,
  onPick,
}: {
  axis: 'x' | 'y'
  value: number
  enabled: boolean
  onPick: (v: number) => void
}) {
  /*
   * Each icon is a bar and an arrow flying at it. The three down the page are
   * exact vertical mirrors of one another, and the three across are the same
   * shapes rotated — so a glance reads them as one family rather than three
   * drawings that happen to be nearby.
   */
  const stops: { at: number; title: string; d: string }[] =
    axis === 'x'
      ? [
          { at: 0, title: 'Sát trái', d: 'M4 3v14M17 10H8M11.5 6.5L8 10l3.5 3.5' },
          { at: 50, title: 'Giữa ngang', d: 'M10 3v14M3 10h4M17 10h-4' },
          { at: 100, title: 'Sát phải', d: 'M16 3v14M3 10h9M8.5 6.5L12 10l-3.5 3.5' },
        ]
      : [
          { at: 0, title: 'Sát trên', d: 'M3 4h14M10 17V8M6.5 11.5L10 8l3.5 3.5' },
          { at: 50, title: 'Giữa dọc', d: 'M3 10h14M10 3v4M10 17v-4' },
          { at: 100, title: 'Sát dưới', d: 'M3 16h14M10 3v9M6.5 8.5L10 12l-3.5-3.5' },
        ]

  return (
    <div style={{ display: 'flex', gap: 4, opacity: enabled ? 1 : 0.3 }}>
      {stops.map((s) => {
        const on = enabled && Math.round(value) === s.at
        return (
          <button
            key={s.at}
            title={s.title}
            aria-label={s.title}
            aria-pressed={on}
            disabled={!enabled}
            onClick={() => onPick(s.at)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 28,
              padding: 0,
              borderRadius: radius,
              cursor: enabled ? 'pointer' : 'default',
              border: `1px solid ${on ? ink.base : ink.border}`,
              background: on ? paper.hover : 'transparent',
              color: on ? ink.base : ink.soft,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d={s.d} />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

/** Rule-of-thirds, drawn inside the frame. Two lines each way, hairline. */
function Thirds() {
  const line: CSSProperties = { position: 'absolute', background: 'rgba(255,255,255,.55)' }
  return (
    <>
      {[33.333, 66.667].map((p) => (
        <div key={`v${p}`} style={{ ...line, top: 0, bottom: 0, left: `${p}%`, width: 1 }} />
      ))}
      {[33.333, 66.667].map((p) => (
        <div key={`h${p}`} style={{ ...line, left: 0, right: 0, top: `${p}%`, height: 1 }} />
      ))}
    </>
  )
}

/**
 * Choose which part of a photo a fixed cell keeps.
 *
 * The old version of this showed the photo already cropped: the frame was the
 * whole picture you could see, and you dragged the photo behind it. That hides
 * the one thing the decision is about — what is being left out. So now the
 * *whole* photo is on screen, dimmed, and the bright rectangle over it is the
 * part the cell will keep. Drag the rectangle, or snap it to an edge.
 *
 * The rectangle can only travel along the axis the photo has spare, because a
 * cell is filled edge to edge: a photo wider than its cell slides sideways and
 * is pinned top and bottom, and there is nothing to decide on that axis.
 *
 * What comes out is a focal point, not a crop — one `#focus=x,y` on the URL,
 * which every frame the photo lands in reads the same way. That is why the
 * other frames are drawn alongside: a cover photo is cut 172×130 in one module
 * and 3:2 in another, and a point that works in one can behead the subject in
 * the other.
 *
 * Zoom is deliberately absent. A zoom would have to be stored per frame and
 * applied by every cell that draws the photo, and the cells draw it as a
 * background — `background-size: cover` cannot express "cover, then a bit
 * closer" without knowing each cell's shape. That is a bigger change than this
 * one and does not belong in the dialog that only places the photo.
 */
export function FocusPicker({
  url,
  ratio,
  name,
  previews,
  onCancel,
  onSave,
}: {
  url: string
  /** width ÷ height of the cell this photo fills. */
  ratio: number
  name: string
  /**
   * Những khung khác cùng tấm ảnh này sẽ rơi vào, bày cạnh khung chính.
   *
   * Ảnh bìa của một bài không chỉ hiện một chỗ: trang module dạng dải cắt nó
   * thành 172×130, dạng specimen cắt 3:2. Căn xong ở một khung mà chỗ kia mất
   * chủ thể thì việc căn coi như chưa xong — nên bày cả hai, cùng một điểm căn,
   * ngay lúc đang kéo.
   */
  previews?: { label: string; ratio: number }[]
  onCancel: () => void
  onSave: (url: string) => void
}) {
  const [focus, setFocus] = useState<Focus>(() => readFocus(url))
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; from: Focus } | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = stripFocus(url)
  }, [url])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCancel])

  /*
   * Khoá cuộn trang phía sau, và trả lại đúng giá trị cũ chứ không đặt về ''.
   * Màn sửa có thể đang tự khoá cuộn vì việc khác; ghi đè bằng '' là cướp mất
   * trạng thái của nó.
   */
  useEffect(() => {
    const was = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = was
    }
  }, [])

  // Bàn phím phải vào trong hộp, nếu không Esc và Tab vẫn nằm ở trang phía sau.
  useEffect(() => {
    box.current?.focus()
  }, [])

  /*
   * Until the photo has loaded its own shape is unknown, so assume it matches
   * the cell: the frame then covers everything and nothing moves, which is the
   * honest picture of "there is nothing to decide yet" rather than a guess that
   * jumps when the real number arrives.
   */
  const photoRatio = natural ? natural.w / natural.h : ratio
  const panX = photoRatio > ratio
  const panY = photoRatio < ratio
  const movable = panX || panY

  /*
   * The frame is the biggest rectangle of the cell's shape that fits inside the
   * photo, measured as a percentage of the photo so the numbers hold at any
   * size the dialog happens to be. The axis that comes out at 100% is the one
   * with no slack, and it is exactly the axis that cannot be panned.
   */
  const frameW = panX ? (ratio / photoRatio) * 100 : 100
  const frameH = panY ? (photoRatio / ratio) * 100 : 100
  const frameLeft = ((100 - frameW) * focus.x) / 100
  const frameTop = ((100 - frameH) * focus.y) / 100

  const move = useCallback(
    (clientX: number, clientY: number) => {
      const el = stage.current
      const start = drag.current
      if (!el || !start) return
      const box = el.getBoundingClientRect()

      /*
       * The frame walks across the photo's spare width as the focal point goes
       * 0 → 100, so a pixel of drag is worth `100 / spare` percent and the
       * frame keeps up with the pointer instead of racing ahead of it.
       */
      const spareX = Math.max(1, (box.width * (100 - frameW)) / 100)
      const spareY = Math.max(1, (box.height * (100 - frameH)) / 100)

      // The frame follows the pointer, so no sign flip: this is not the photo.
      const dx = panX ? ((clientX - start.x) / spareX) * 100 : 0
      const dy = panY ? ((clientY - start.y) / spareY) * 100 : 0
      setFocus({
        x: Math.max(0, Math.min(100, start.from.x + dx)),
        y: Math.max(0, Math.min(100, start.from.y + dy)),
      })
    },
    [panX, panY, frameW, frameH],
  )

  useEffect(() => {
    if (!drag.current) return
    const onMove = (e: PointerEvent) => move(e.clientX, e.clientY)
    const onUp = () => {
      drag.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  })

  function grab(e: { clientX: number; clientY: number }) {
    if (!movable) return
    drag.current = { x: e.clientX, y: e.clientY, from: focus }
    // A fresh object so the effect above re-runs and the listeners go on.
    setFocus({ ...focus })
  }

  return (
    <div style={backdrop} onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={name}
        tabIndex={-1}
        style={card}
        /*
         * `pointerdown` chứ không phải `click`: bôi đen chữ trong hộp rồi thả
         * chuột ra ngoài cũng đếm là một `click` trên nền, và như vậy là đóng
         * mất hộp đang dùng.
         */
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div style={sub}>{name}</div>
        <div style={title}>Chọn phần ảnh giữ lại</div>

        {/*
          The stage is the photo and nothing else: it takes the photo's own
          shape, so every pixel inside it is picture and the maths below can
          treat the box and the photo as the same rectangle.
        */}
        <div
          ref={stage}
          data-testid="focus-stage"
          onPointerDown={grab}
          style={{
            position: 'relative',
            margin: '16px auto 0',
            aspectRatio: String(photoRatio),
            maxWidth: '100%',
            maxHeight: '52vh',
            borderRadius: radius,
            overflow: 'hidden',
            backgroundColor: ink.base,
            backgroundImage: `url(${stripFocus(url)})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            touchAction: 'none',
            cursor: movable ? 'grab' : 'default',
          }}
        >
          <div
            data-testid="focus-frame"
            style={{
              position: 'absolute',
              left: `${frameLeft}%`,
              top: `${frameTop}%`,
              width: `${frameW}%`,
              height: `${frameH}%`,
              /*
                One enormous spreadless shadow dims everything outside the
                frame. Four dimming rectangles would leave hairline seams where
                they meet, and this cannot: it is one paint.
              */
              boxShadow: '0 0 0 9999px rgba(18,16,12,.66)',
              outline: '1px solid rgba(255,255,255,.9)',
              outlineOffset: -1,
            }}
          >
            <Thirds />
          </div>
        </div>

        {previews && previews.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            {previews.map((p) => (
              <div key={p.label} style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    aspectRatio: String(p.ratio),
                    border: `1px solid ${ink.border}`,
                    borderRadius: radius,
                    backgroundImage: `url(${stripFocus(url)})`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: `${focus.x}% ${focus.y}%`,
                  }}
                />
                <div style={{ ...sub, marginTop: 5, fontSize: 9 }}>{p.label}</div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginTop: 16,
          }}
        >
          <div style={{ ...sub, textTransform: 'none', letterSpacing: '.04em', fontSize: 11 }}>
            {natural
              ? `${natural.w}×${natural.h} · khung ${ratio.toFixed(2)}:1`
              : `khung ${ratio.toFixed(2)}:1`}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlignRow axis="x" value={focus.x} enabled={panX} onPick={(x) => setFocus({ ...focus, x })} />
            <AlignRow axis="y" value={focus.y} enabled={panY} onPick={(y) => setFocus({ ...focus, y })} />
            <Button level="ghost" size="sm" onClick={onCancel}>
              Huỷ
            </Button>
            <Button level="primary" size="sm" onClick={() => onSave(withFocus(url, focus))}>
              Xong
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
