import type { PostStatus, PostSummary, StatusAction } from '../lib/apiClient'
import { garden, ink, paper, serif } from '../lib/theme'
import { StatusBadge } from './StatusBadge'

const ACTIONS_BY_STATUS: Record<PostStatus, { label: string; action: StatusAction }[]> = {
  draft: [{ label: 'Publish', action: 'publish' }, { label: 'Xoá', action: 'delete' }],
  published: [{ label: 'Archive', action: 'archive' }, { label: 'Xoá', action: 'delete' }],
  archived: [{ label: 'Restore', action: 'restore' }, { label: 'Xoá', action: 'delete' }],
  deleted: [{ label: 'Restore', action: 'restore-trash' }, { label: 'Xoá vĩnh viễn', action: 'permanently-delete' }],
}

// No color field on PostSummary — pick a stable garden tint per card from
// the post id so the dashboard reads like the mockup without a schema change.
const THUMB_COLORS = [garden.blush, garden.petalTint2, garden.leafTint2, garden.apricot, garden.honeyTint2]
function thumbColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return THUMB_COLORS[hash % THUMB_COLORS.length]
}

export function PostCard({ post, onAction }: { post: PostSummary; onAction: (id: string, action: StatusAction) => void }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: 12, border: `1px solid ${paper.rule}`, borderRadius: 10, background: paper.white }}>
      <div style={{ width: 68, height: 68, background: thumbColor(post.id), borderRadius: 8, flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: serif, fontSize: 15, color: ink.base }}>{post.en}</span>
          <StatusBadge status={post.status} />
        </div>
        <div style={{ fontSize: 11, color: ink.muted, marginTop: 3 }}>
          {post.moduleId} · {post.kind} · {post.updatedAt}
        </div>
        <div style={{ fontSize: 12.5, color: ink.soft, marginTop: 6, lineHeight: 1.5 }}>{post.vi}</div>
        <div style={{ fontSize: 11.5, marginTop: 8 }}>
          <a href={`/posts/${post.id}/edit`} className="admin-link-action">
            Sửa
          </a>
          {ACTIONS_BY_STATUS[post.status].map((a) => (
            <button
              key={a.action}
              onClick={() => onAction(post.id, a.action)}
              className="admin-link-action"
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit' }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
