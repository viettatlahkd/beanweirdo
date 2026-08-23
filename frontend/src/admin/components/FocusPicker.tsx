import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { CENTRE, readFocus, stripFocus, withFocus, type Focus } from '../../lib/imageFocus'
import { ink, paper, sans, serif } from '../../design/tokens'
import { Hover } from '../../lib/Hover'

const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(24,22,17,.62)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 60,
  padding: 24,
}

const card: CSSProperties = {
  background: paper.cream,
  border: `1px solid ${paper.rule}`,
  padding: 22,
  maxWidth: 640,
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

const button = (primary: boolean): CSSProperties => ({
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  padding: '9px 18px',
  cursor: 'pointer',
  border: primary ? `1px solid ${ink.base}` : `1px solid ${paper.rule}`,
  background: primary ? ink.base : 'transparent',
  color: primary ? paper.cream : ink.soft,
})

/**
 * Place a photo inside the frame it will fill.
 *
 * The frame is the cell's real shape, measured from the layout rather than
 * guessed, and the photo fills it the same way it will on the page. Dragging
 * moves the photo behind the frame, which is exactly what a focal point does —
 * so what the admin arranges here is what the page draws.
 *
 * Only an axis that actually overflows can move. A photo wider than its frame
 * pans sideways and stays put vertically, because there is nothing to reveal.
 */
export function FocusPicker({
  url,
  ratio,
  name,
  onCancel,
  onSave,
}: {
  url: string
  /** width ÷ height of the cell this photo fills. */
  ratio: number
  name: string
  onCancel: () => void
  onSave: (url: string) => void
}) {
  const [focus, setFocus] = useState<Focus>(() => readFocus(url))
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const frame = useRef<HTMLDivElement>(null)
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

  /**
   * How much of the photo hangs outside the frame, per axis, as a fraction of
   * the frame. Nothing hanging out means nothing to pan — a focal point on that
   * axis would move the photo not at all, so the axis is held still.
   */
  const photoRatio = natural ? natural.w / natural.h : ratio
  const panX = photoRatio > ratio
  const panY = photoRatio < ratio

  const move = useCallback(
    (clientX: number, clientY: number) => {
      const el = frame.current
      const start = drag.current
      if (!el || !start) return
      const box = el.getBoundingClientRect()

      /*
       * A photo filling its frame hangs over on one axis. Sliding the focal
       * point from 0% to 100% walks the photo across exactly that overhang, so
       * a pixel of drag is worth `100 / overhang` percent — which makes the
       * photo travel with the pointer instead of racing ahead of it.
       */
      const shownW = panY ? box.width : box.height * photoRatio
      const shownH = panX ? box.height : box.width / photoRatio
      const overX = Math.max(1, shownW - box.width)
      const overY = Math.max(1, shownH - box.height)

      // Dragging right should reveal what is off to the left, so the sign flips.
      const dx = panX ? ((start.x - clientX) / overX) * 100 : 0
      const dy = panY ? ((start.y - clientY) / overY) * 100 : 0
      setFocus({
        x: Math.max(0, Math.min(100, start.from.x + dx)),
        y: Math.max(0, Math.min(100, start.from.y + dy)),
      })
    },
    [panX, panY, photoRatio],
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

  const movable = panX || panY

  return (
    <div style={backdrop} onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={card} onPointerDown={(e) => e.stopPropagation()}>
        <div style={sub}>{name}</div>
        <div style={title}>Đặt ảnh vào khung</div>

        <div
          ref={frame}
          onPointerDown={(e) => {
            if (!movable) return
            drag.current = { x: e.clientX, y: e.clientY, from: focus }
            setFocus({ ...focus })
          }}
          style={{
            marginTop: 16,
            aspectRatio: String(ratio),
            width: '100%',
            border: `1px solid ${paper.rule}`,
            backgroundImage: `url(${stripFocus(url)})`,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: `${focus.x}% ${focus.y}%`,
            cursor: movable ? 'grab' : 'default',
            touchAction: 'none',
          }}
        />

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
          <div style={{ display: 'flex', gap: 10 }}>
            <Hover
              as="button"
              onClick={() => setFocus(CENTRE)}
              style={button(false)}
              hoverStyle={{ borderColor: ink.base, color: ink.base }}
            >
              Giữa
            </Hover>
            <Hover
              as="button"
              onClick={onCancel}
              style={button(false)}
              hoverStyle={{ borderColor: ink.base, color: ink.base }}
            >
              Huỷ
            </Hover>
            <Hover
              as="button"
              onClick={() => onSave(withFocus(url, focus))}
              style={button(true)}
              hoverStyle={{ background: ink.green, borderColor: ink.green }}
            >
              Xong
            </Hover>
          </div>
        </div>
      </div>
    </div>
  )
}
