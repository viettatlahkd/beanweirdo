import type { PostStatus } from '../lib/apiClient'
import { garden, ink, paper, sans } from '../lib/theme'

const LABEL: Record<PostStatus, string> = { draft: 'Draft', published: 'Published', archived: 'Archived', deleted: 'Deleted' }

const STYLE: Record<PostStatus, { background: string; borderColor: string; color: string }> = {
  draft: { background: paper.rule, borderColor: paper.rule, color: ink.muted },
  published: { background: garden.leafTint, borderColor: garden.leaf, color: garden.moss },
  archived: { background: garden.honeyTint, borderColor: garden.apricot, color: garden.cinnamon },
  deleted: { background: paper.rule, borderColor: paper.rule, color: ink.muted },
}

export function StatusBadge({ status }: { status: PostStatus }) {
  const s = STYLE[status]
  return (
    <span
      data-testid="status-badge"
      style={{
        fontFamily: sans,
        fontSize: 10,
        fontWeight: 500,
        padding: '3px 10px',
        borderRadius: 999,
        border: `1px solid ${s.borderColor}`,
        background: s.background,
        color: s.color,
        flex: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {LABEL[status]}
    </span>
  )
}
