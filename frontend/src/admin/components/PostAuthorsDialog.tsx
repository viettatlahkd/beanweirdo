import { useEffect, useRef, useState } from 'react'
import type { AuthorRef } from 'api-contract'
import { getPost, type PostSummary } from '../lib/apiClient'
import { Button, IconButton } from '../../design/Button'
import { IconClose } from '../../design/icons'
import { radius } from '../../design/controls'
import { ink, paper, sans, serif } from '../../design/tokens'
import { AuthorPicker } from './AuthorPicker'

/**
 * Gán tác giả cho một bài ngay từ danh sách.
 *
 * Chủ site (2026-09-30): "trong cái dấu ba chấm ở cuối mỗi bài ấy cho gán tác
 * giả vào đi chứ cần gì làm trong trang tác giả". Bài viết trước khi có tác
 * giả đều trống dòng "Viết bởi", và mở từng bài vào màn sửa chỉ để chọn tên là
 * đường vòng.
 *
 * Cùng một ô chọn với màn sửa, nên cũng ghi ngay mỗi lần đổi; nút Xong chỉ
 * đóng hộp thoại.
 */
export function PostAuthorsDialog({ post, onClose }: { post: PostSummary | null; onClose: () => void }) {
  const [byline, setByline] = useState<AuthorRef[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const open = post !== null

  useEffect(() => {
    setByline(null)
    setError(null)
    if (!post) return
    let alive = true
    getPost(post.id)
      .then((p) => alive && setByline(p.authors))
      .catch((e) => alive && setError((e as Error).message))
    return () => {
      alive = false
    }
  }, [post])

  useEffect(() => {
    if (!open) return
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', escape)
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => {
      document.removeEventListener('keydown', escape)
      document.body.style.overflow = scroll
    }
  }, [open, onClose])

  if (!post) return null

  return (
    <div
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
        aria-label="Tác giả của bài"
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: 520,
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
          <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, margin: 0, color: ink.base }}>
            Tác giả của bài
          </h2>
          <IconButton level="ghost" label="Đóng" onClick={onClose}>
            <IconClose size={16} />
          </IconButton>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontFamily: sans, fontSize: 12.5, color: ink.soft, margin: 0, lineHeight: 1.55 }}>
            <b style={{ color: ink.base, fontWeight: 500 }}>{post.en}</b>. Mỗi lần đổi là lưu ngay, kể cả bài đã đăng.
          </p>
          {error && (
            <div role="alert" style={{ fontFamily: sans, fontSize: 12, color: ink.danger }}>
              Không tải được bài: {error}
            </div>
          )}
          {byline === null && !error && (
            <div style={{ fontFamily: sans, fontSize: 12.5, color: ink.faint }}>Đang tải…</div>
          )}
          {byline !== null && <AuthorPicker key={post.id} postId={post.id} initial={byline} />}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button level="primary" onClick={onClose}>
              Xong
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
