import { useEffect, useRef, useState } from 'react'
import { createPost } from '../lib/apiClient'
import { MetadataStep, type Metadata } from '../screens/MetadataStep'
import { IconButton } from '../../design/Button'
import { IconClose } from '../../design/icons'
import { radius } from '../../design/controls'
import { ink, paper, sans, serif } from '../../design/tokens'

/**
 * Bắt đầu một bài, ngay tại chỗ đang đứng.
 *
 * Trước đây đây là một trang riêng ở `/ad-post/create`: bấm "Bài mới" là rời
 * danh sách, và huỷ giữa chừng thì phải tự tìm đường quay lại. Sáu ô cần điền
 * không đủ để thành một trang — chúng là một câu hỏi chen ngang, nên hỏi ngay
 * trên danh sách rồi trả người ta về đúng chỗ cũ.
 */
export function NewPostDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  /** Bài đã có trong database; nơi gọi quyết định đi đâu tiếp. */
  onCreated: (id: string) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', escape)
    /*
     * Khoá cuộn của trang sau lưng. Không khoá thì lăn chuột trên hộp thoại
     * làm danh sách phía dưới trôi đi, và đóng hộp thoại ra là một màn hình
     * khác hẳn lúc mở.
     */
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', escape)
      document.body.style.overflow = scroll
    }
  }, [open, onClose])

  // Đưa tiêu điểm vào hộp thoại khi nó mở, để phím Tab đi tiếp bên trong chứ
  // không lạc xuống danh sách đang bị che.
  useEffect(() => {
    if (open) panel.current?.focus()
  }, [open])

  if (!open) return null

  async function start(m: Metadata) {
    setError(null)
    try {
      const { id } = await createPost(m)
      onCreated(id)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div
      /*
       * `mousedown` chứ không `click`: thả chuột bên ngoài sau khi bắt đầu kéo
       * chọn chữ bên trong form cũng là một `click` trên nền, và như vậy là
       * đóng mất form người ta đang điền.
       */
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(35, 33, 26, 0.38)',
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Bài mới"
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: 560,
          // Màn thấp hơn form thì cuộn trong hộp thoại, không cuộn cả trang.
          maxHeight: '100%',
          overflowY: 'auto',
          background: paper.white,
          border: `1px solid ${ink.border}`,
          borderRadius: radius,
          boxShadow: '0 18px 48px rgba(35, 33, 26, 0.22)',
          outline: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 20px',
            borderBottom: `1px solid ${paper.rule}`,
          }}
        >
          <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, margin: 0, color: ink.base }}>Bài mới</h2>
          <IconButton level="ghost" label="Đóng" onClick={onClose}>
            <IconClose size={16} />
          </IconButton>
        </div>

        <div style={{ padding: 20 }}>
          {error && (
            <p
              role="alert"
              style={{
                fontFamily: sans,
                fontSize: 12.5,
                color: ink.danger,
                border: `1px solid ${ink.dangerLine}`,
                borderRadius: radius,
                background: '#F7E3E6',
                padding: '9px 12px',
                margin: '0 0 14px',
              }}
            >
              {error}
            </p>
          )}
          <MetadataStep onContinue={(m) => void start(m)} />
        </div>
      </div>
    </div>
  )
}
