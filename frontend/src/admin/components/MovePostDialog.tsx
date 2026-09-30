import { useEffect, useRef, useState } from 'react'
import { listModulesCached } from '../lib/lists'
import type { Module, PostSummary } from '../lib/apiClient'
import { Button, IconButton } from '../../design/Button'
import { IconClose } from '../../design/icons'
import { radius } from '../../design/controls'
import { ink, paper, sans, serif } from '../../design/tokens'

/**
 * Chuyển một bài sang module khác.
 *
 * Chủ site: *"bài ở module Ghi01 giờ tôi muốn move nó sang roastery chẳng hạn
 * thì đang không có nút nào giúp tôi làm điều đó cả. và tạo 1 cái là chỉ có
 * xoá đi và tạo bài mới rồi copy paste lại thôi thì hơi phiền"*.
 *
 * Nó là một câu hỏi chen ngang giữa lúc đang đọc danh sách, chứ không phải một
 * trang — nên nó là hộp thoại, cùng khuôn với `NewPostDialog`, và đóng lại là
 * về đúng chỗ cũ.
 *
 * **Một ô chọn và một nút Lưu**, không tự lưu lúc rời ô: đây là việc đổi địa
 * chỉ công khai của bài, không phải sửa một dòng chữ.
 */
export function MovePostDialog({
  post,
  onClose,
  onMoved,
}: {
  /** Bài đang chuyển; `null` là hộp thoại đóng. */
  post: PostSummary | null
  onClose: () => void
  /**
   * Ghi thật, ở nơi gọi. Hộp thoại **đợi** lời hứa này: ghi hỏng thì nó vẫn
   * mở với lựa chọn người ta vừa làm, chứ không đóng lại rồi để họ đoán.
   */
  onMoved: (moduleId: string) => void | Promise<unknown>
}) {
  const [modules, setModules] = useState<Module[]>([])
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const panel = useRef<HTMLDivElement>(null)

  const open = post !== null

  useEffect(() => {
    if (!open) return
    listModulesCached().then(setModules).catch(() => setModules([]))
  }, [open])

  // Mở ra là đang đứng ở module hiện tại, nên ô chọn nói đúng chỗ bài đang
  // nằm chứ không phải một module bất kỳ đầu danh sách.
  useEffect(() => {
    if (post) {
      setTarget(post.module_id)
      setBusy(false)
    }
  }, [post])

  useEffect(() => {
    if (!open) return
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', escape)
    // Khoá cuộn của danh sách sau lưng, cùng lý do với `NewPostDialog`.
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', escape)
      document.body.style.overflow = scroll
    }
  }, [open, onClose])

  useEffect(() => {
    if (open) panel.current?.focus()
  }, [open])

  if (!post) return null

  const from = modules.find((m) => m.id === post.module_id)
  const moved = target !== '' && target !== post.module_id

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
        aria-label="Chuyển sang module khác"
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: 460,
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
            Chuyển sang module khác
          </h2>
          <IconButton level="ghost" label="Đóng" onClick={onClose}>
            <IconClose size={16} />
          </IconButton>
        </div>

        <div style={{ padding: 20 }}>
          <p style={{ fontFamily: sans, fontSize: 12.5, color: ink.soft, margin: '0 0 14px', lineHeight: 1.55 }}>
            <b style={{ color: ink.base, fontWeight: 500 }}>{post.en}</b> đang nằm ở{' '}
            {from?.title ?? post.module_id}.
          </p>

          <label
            htmlFor="move-module"
            style={{
              display: 'block',
              fontFamily: sans,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '.14em',
              color: ink.faint,
              marginBottom: 6,
            }}
          >
            Chuyển tới
          </label>
          <select
            id="move-module"
            aria-label="Module đích"
            className="admin-field"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            {modules.length === 0 && <option value="">Đang tải module…</option>}
            {/* Cùng cách chia như màn bài mới: module đọc và ghi chép là hai
                loại chỗ khác nhau, dù bài nào cũng nằm được ở cả hai. */}
            <optgroup label="Module">
              {modules
                .filter((m) => m.kind !== 'special')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Ghi chép">
              {modules
                .filter((m) => m.kind === 'special')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
            </optgroup>
          </select>

          {/*
            Địa chỉ công khai của bài dựng từ `module_id` (`lib/postSlug.ts`,
            `uniqueSlug`), nên chuyển module là đổi đường dẫn — trừ bài đã tự
            gõ slug riêng. Nói trước, vì đường dẫn cũ ai đã lưu thì hỏng, mà
            trên màn hình không có gì báo điều đó.
          */}
          {moved && (
            <p
              style={{
                fontFamily: sans,
                fontSize: 12,
                color: ink.soft,
                lineHeight: 1.55,
                margin: '12px 0 0',
                padding: '9px 12px',
                border: `1px solid ${paper.rule}`,
                borderRadius: radius,
                background: paper.cream,
              }}
            >
              Đường dẫn của bài dựng theo module, nên chuyển xong địa chỉ cũ sẽ
              không còn mở được. Vị trí tự chọn trong module cũ cũng bỏ, bài về
              xếp theo ngày ở chỗ mới.
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
            <Button level="ghost" onClick={onClose}>
              Huỷ
            </Button>
            <Button
              level="primary"
              disabled={!moved || busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await onMoved(target)
                } catch {
                  /*
                   * Nuốt ở đây là cố ý: nơi gọi mới là chỗ ghi, và nó đã báo
                   * lỗi bằng toast. Để lời hứa hỏng thoát ra khỏi một trình
                   * xử lý sự kiện của React thì không ai bắt, và nó thành một
                   * unhandled rejection. Việc của hộp thoại chỉ là ở lại mở.
                   */
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy ? 'Đang chuyển…' : 'Chuyển'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
