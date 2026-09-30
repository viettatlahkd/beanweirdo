import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { readCrop, stripFocus, withCrop } from '../../lib/imageFocus'
import { ink, paper, sans, serif } from '../../design/tokens'
import { Button } from '../../design/Button'
import { radius } from '../../design/controls'

/** A rectangle on the photo, in percentages of the photo's width and height. */
type Rect = { x: number; y: number; w: number; h: number }

/**
 * Hình dạng khung đưa sẵn. `null` là tự do, `'photo'` là đúng hình tấm ảnh.
 *
 * Khối ảnh trong thân bài từng chỉ có một hình: dải ngang cao 250px. Chủ site
 * muốn tự cắt, nên hình dạng thành một lựa chọn — và "gốc" đứng đầu vì đa số
 * ảnh chụp đã đúng khuôn người chụp muốn.
 */
const SHAPES: { label: string; ratio: number | null | 'photo' }[] = [
  { label: 'Gốc', ratio: 'photo' },
  { label: 'Tự do', ratio: null },
  { label: '16:9', ratio: 16 / 9 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '1:1', ratio: 1 },
  { label: '4:5', ratio: 4 / 5 },
  { label: '2:3', ratio: 2 / 3 },
]

/** Hình dạng đúng bằng ô ảnh đang đứng trên trang. */
const FIT = 'Vừa ô'

/** Smallest side a crop can shrink to, so a slip cannot collapse it to nothing. */
const MIN = 8

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/**
 * The largest rectangle of `ratio` (on screen) that fits the photo, centred on
 * a point — what a shape button snaps to.
 *
 * `photo` is the photo's own width ÷ height. A rectangle `w`% wide and `h`%
 * tall on it is `(w * photo) / h` on screen, which is the conversion every
 * locked-ratio step below leans on.
 */
export function fitRect(ratio: number, photo: number, cx = 50, cy = 50): Rect {
  let w = 100
  let h = (w * photo) / ratio
  if (h > 100) {
    h = 100
    w = (h * ratio) / photo
  }
  return { w, h, x: clamp(cx - w / 2, 0, 100 - w), y: clamp(cy - h / 2, 0, 100 - h) }
}

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se'

/**
 * Resize from one corner, keeping the opposite corner where it is.
 *
 * With a locked shape the width leads and the height follows; when the height
 * would run off the photo the height leads instead, so the rectangle stops at
 * the edge rather than changing shape to fit.
 */
export function dragRect(from: Rect, handle: Handle, dx: number, dy: number, lock: number | null, photo: number): Rect {
  if (handle === 'move') {
    return { ...from, x: clamp(from.x + dx, 0, 100 - from.w), y: clamp(from.y + dy, 0, 100 - from.h) }
  }
  const west = handle === 'nw' || handle === 'sw'
  const north = handle === 'nw' || handle === 'ne'
  // The corner that stays put.
  const ax = west ? from.x + from.w : from.x
  const ay = north ? from.y + from.h : from.y
  const roomX = west ? ax : 100 - ax
  const roomY = north ? ay : 100 - ay

  let w = clamp(from.w + (west ? -dx : dx), MIN, roomX)
  let h = clamp(from.h + (north ? -dy : dy), MIN, roomY)
  if (lock) {
    h = (w * photo) / lock
    if (h > roomY) {
      h = roomY
      w = (h * lock) / photo
    }
    if (h < MIN) {
      h = MIN
      w = Math.min(roomX, (h * lock) / photo)
    }
  }
  return { w, h, x: west ? ax - w : ax, y: north ? ay - h : ay }
}

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
  border: `1px solid ${ink.border}`,
  outline: 'none',
  borderRadius: radius,
  padding: 22,
  maxWidth: 720,
  width: '100%',
  maxHeight: '100%',
  overflowY: 'auto',
}

const sub: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: ink.faint,
}

const corner = (h: Handle): CSSProperties => ({
  position: 'absolute',
  width: 14,
  height: 14,
  background: paper.white,
  border: `1px solid ${ink.base}`,
  borderRadius: 3,
  ...(h === 'nw' || h === 'sw' ? { left: -7 } : { right: -7 }),
  ...(h === 'nw' || h === 'ne' ? { top: -7 } : { bottom: -7 }),
  cursor: h === 'nw' || h === 'se' ? 'nwse-resize' : 'nesw-resize',
  touchAction: 'none',
})

/**
 * Cắt tay một tấm ảnh cho khối ảnh trong thân bài.
 *
 * Khác `FocusPicker`: ô ảnh cố định của khuôn bài có hình dạng do khuôn quyết,
 * nên ở đó chỉ chọn được phần nào nằm trong khung. Khối ảnh trong thân bài thì
 * không có hình dạng nào áp xuống, nên ở đây người dùng kéo chính cái khung —
 * dời, co, giãn từ bốn góc, hoặc khoá vào một tỉ lệ có sẵn — và trang vẽ ảnh
 * đúng bằng hình đã cắt.
 *
 * Kết quả ghi lên địa chỉ ảnh (`#crop=…`), cùng cách điểm căn đi theo địa chỉ,
 * nên không có cột nào phải thêm và ảnh vẫn đi qua markdown nguyên vẹn.
 */
export function CropPicker({
  url,
  name,
  cell,
  onCancel,
  onSave,
}: {
  url: string
  name: string
  /**
   * Hình dạng hiện tại của ô ảnh trên trang, khi ô ấy có một hình do khuôn
   * đặt. Có thì thêm lựa chọn "Vừa ô" đứng đầu và chọn sẵn: bấm Xong ngay là
   * ra đúng bố cục cũ, còn chọn hình khác thì ô đổi theo.
   */
  cell?: number
  onCancel: () => void
  onSave: (url: string) => void
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const saved = readCrop(url)
  const [rect, setRect] = useState<Rect>(saved ? { x: saved.x, y: saved.y, w: saved.w, h: saved.h } : { x: 0, y: 0, w: 100, h: 100 })
  const shapes = cell ? [{ label: FIT, ratio: cell }, ...SHAPES] : SHAPES
  const [shape, setShape] = useState<string>(saved ? 'Tự do' : cell ? FIT : 'Gốc')
  const stage = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ handle: Handle; x: number; y: number; from: Rect } | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight })
      // "Vừa ô" chỉ dựng được khung khi đã biết hình tấm ảnh.
      if (!saved && cell && img.naturalWidth > 0 && img.naturalHeight > 0) {
        setRect(fitRect(cell, img.naturalWidth / img.naturalHeight))
      }
    }
    img.src = stripFocus(url)
    // Chỉ theo tấm ảnh: `saved` và `cell` là giá trị lúc mở hộp, đổi chúng giữa chừng không được dựng lại khung người dùng đang kéo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCancel])

  // Trả lại đúng giá trị cũ: màn sửa có thể đang tự khoá cuộn vì việc khác.
  useEffect(() => {
    const was = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = was
    }
  }, [])

  useEffect(() => {
    box.current?.focus()
  }, [])

  const photo = natural ? natural.w / natural.h : 1.5
  const picked = shapes.find((s) => s.label === shape)
  const lock = picked?.ratio === 'photo' ? photo : picked?.ratio ?? null

  function choose(label: string) {
    const s = shapes.find((x) => x.label === label)
    setShape(label)
    if (!s || s.ratio === null) return
    if (s.ratio === 'photo') return setRect({ x: 0, y: 0, w: 100, h: 100 })
    setRect(fitRect(s.ratio, photo, rect.x + rect.w / 2, rect.y + rect.h / 2))
  }

  useEffect(() => {
    if (!drag.current) return
    const onMove = (e: PointerEvent) => {
      const d = drag.current
      const el = stage.current
      if (!d || !el) return
      const b = el.getBoundingClientRect()
      const dx = b.width > 0 ? ((e.clientX - d.x) / b.width) * 100 : 0
      const dy = b.height > 0 ? ((e.clientY - d.y) / b.height) * 100 : 0
      setRect(dragRect(d.from, d.handle, dx, dy, lock, photo))
    }
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

  function grab(handle: Handle) {
    return (e: { clientX: number; clientY: number; stopPropagation: () => void }) => {
      e.stopPropagation()
      drag.current = { handle, x: e.clientX, y: e.clientY, from: rect }
      // Một đối tượng mới để effect ở trên chạy lại và gắn listener.
      setRect({ ...rect })
    }
  }

  const pxW = natural ? Math.round((natural.w * rect.w) / 100) : null
  const pxH = natural ? Math.round((natural.h * rect.h) / 100) : null

  return (
    <div style={backdrop} onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={name}
        tabIndex={-1}
        style={card}
        // `pointerdown` chứ không phải `click`: bôi đen rồi thả chuột ra nền
        // cũng đếm là một `click` trên nền.
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div style={sub}>{name}</div>
        <div style={{ fontFamily: serif, fontSize: 22, color: ink.base, marginBottom: 10 }}>Cắt ảnh</div>

        <div role="radiogroup" aria-label="hình dạng khung" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {shapes.map((s) => {
            const on = s.label === shape
            return (
              <button
                key={s.label}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(s.label)}
                style={{
                  fontFamily: sans,
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: radius,
                  cursor: 'pointer',
                  border: `1px solid ${on ? ink.base : ink.border}`,
                  background: on ? paper.hover : 'transparent',
                  color: on ? ink.base : ink.soft,
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        <div
          ref={stage}
          data-testid="crop-stage"
          style={{
            position: 'relative',
            margin: '14px auto 0',
            aspectRatio: String(photo),
            maxWidth: '100%',
            maxHeight: '56vh',
            borderRadius: radius,
            backgroundColor: ink.base,
            backgroundImage: `url(${stripFocus(url)})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          {/* Cắt phần mờ bên ngoài ở khung sân khấu, không cắt tay nắm ở góc. */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: radius, pointerEvents: 'none' }}>
            <div
              style={{
                position: 'absolute',
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.w}%`,
                height: `${rect.h}%`,
                boxShadow: '0 0 0 9999px rgba(18,16,12,.66)',
              }}
            />
          </div>
          <div
            data-testid="crop-frame"
            onPointerDown={grab('move')}
            style={{
              position: 'absolute',
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.w}%`,
              height: `${rect.h}%`,
              outline: '1px solid rgba(255,255,255,.9)',
              outlineOffset: -1,
              cursor: 'move',
              touchAction: 'none',
            }}
          >
            {(['nw', 'ne', 'sw', 'se'] as const).map((h) => (
              <div key={h} data-testid={`crop-${h}`} aria-hidden onPointerDown={grab(h)} style={corner(h)} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 16 }}>
          <div style={{ ...sub, textTransform: 'none', letterSpacing: '.04em', fontSize: 11 }}>
            {pxW && pxH ? `giữ ${pxW}×${pxH}` : 'đang tải ảnh…'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button level="ghost" size="sm" onClick={onCancel}>
              Huỷ
            </Button>
            <Button
              level="primary"
              size="sm"
              // Chưa biết hình tấm ảnh thì chưa tính được tỉ lệ khung.
              disabled={!natural}
              onClick={() => onSave(withCrop(url, { ...rect, ratio: (rect.w * photo) / rect.h }))}
            >
              Xong
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
