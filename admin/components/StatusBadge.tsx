import type { PostStatus } from '../lib/apiClient'
import { garden, ink, paper, sans } from '../lib/theme'

// Vietnamese labels match the approved mockup's "01 Dashboard" status pills
// (Nháp / Đã đăng / Lưu trữ) plus a fourth state for the trash tab.
const LABEL: Record<PostStatus, string> = { draft: 'Nháp', published: 'Đã đăng', archived: 'Lưu trữ', deleted: 'Đã xoá' }

const STYLE: Record<PostStatus, { background: string; color: string }> = {
  draft: { background: paper.rule, color: ink.soft },
  published: { background: garden.leafTint, color: garden.moss },
  archived: { background: garden.honeyTint, color: garden.cinnamon },
  deleted: { background: garden.petalTint, color: '#8A3B41' },
}

export function StatusBadge({ status }: { status: PostStatus }) {
  const s = STYLE[status]
  return (
    <span
      data-testid="status-badge"
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
      {LABEL[status]}
    </span>
  )
}
