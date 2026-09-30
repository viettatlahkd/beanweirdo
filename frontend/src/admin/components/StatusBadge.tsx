import type { PostStatus } from '../lib/apiClient'
import { garden, ink, paper, sans } from '../../design/tokens'

// Vietnamese labels match the approved mockup's "01 Dashboard" status pills
// (Nháp / Đã đăng / Lưu trữ) plus a fourth state for the trash tab.
const LABEL: Record<PostStatus, string> = { draft: 'Nháp', published: 'Đã đăng', archived: 'Lưu trữ', deleted: 'Đã xoá' }

const STYLE: Record<PostStatus, { background: string; color: string }> = {
  draft: { background: paper.rule, color: ink.soft },
  published: { background: garden.leafTint, color: garden.moss },
  archived: { background: garden.honeyTint, color: garden.cinnamon },
  deleted: { background: garden.petalTint, color: '#8A3B41' },
}

/*
 * A published post with edits still waiting for "Đăng thay đổi". Without it
 * the list says "Đã đăng" for a post whose page no longer matches what the
 * owner last typed, and nothing tells them to go back and publish.
 */
const PENDING = { label: 'Có sửa chưa đăng', background: garden.honeyTint, color: garden.cinnamon }

export function StatusBadge({ status, pending = false }: { status: PostStatus; pending?: boolean }) {
  const s = status === 'published' && pending ? PENDING : { ...STYLE[status], label: LABEL[status] }
  return (
    <span
      data-testid="status-badge"
      title={s === PENDING ? 'Bản trên trang vẫn là bản cũ — mở bài và bấm "Đăng thay đổi"' : undefined}
      style={{
        fontFamily: sans,
        fontSize: 9.5,
        fontWeight: 500,
        padding: '4px 10px',
        borderRadius: 999,
        background: s.background,
        color: s.color,
        flex: 'none',
        width: 'fit-content',
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  )
}
