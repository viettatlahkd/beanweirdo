import { useState } from 'react'
import type { PostStatus, PostSummary, PostTemplate, StatusAction } from '../lib/apiClient'
import { garden, ink, paper, sans, serif } from '../../design/tokens'
import { StatusBadge } from './StatusBadge'

// Real template names — the old band/specimen/sequence naming is gone along
// with the invented DB-shaped templates table.
const TEMPLATE_LABEL: Record<PostTemplate, string> = {
  article: 'Article',
  cards: 'Cards',
  report: 'Report',
  longform: 'Long-form',
  memo: 'Memo',
}

const ACTIONS_BY_STATUS: Record<PostStatus, { label: string; action: StatusAction }[]> = {
  draft: [
    { label: 'Đăng', action: 'publish' },
    { label: 'Lưu trữ', action: 'archive' },
    { label: 'Xoá', action: 'delete' },
  ],
  published: [
    { label: 'Bỏ đăng', action: 'unpublish' },
    { label: 'Lưu trữ', action: 'archive' },
    { label: 'Xoá', action: 'delete' },
  ],
  archived: [
    { label: 'Khôi phục', action: 'restore' },
    { label: 'Xoá', action: 'delete' },
  ],
  deleted: [
    { label: 'Khôi phục', action: 'restore-trash' },
    { label: 'Xoá vĩnh viễn', action: 'permanently-delete' },
  ],
}

// No color field on PostSummary — pick a stable garden tint per card from
// the post id so the thumbnail fallback reads like the mockup without a
// schema change. Used only when the post has no picture anywhere in it.
const THUMB_COLORS = [garden.blush, garden.petalTint2, garden.leafTint2, garden.apricot, garden.honeyTint2]
function thumbColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return THUMB_COLORS[hash % THUMB_COLORS.length]
}

export function PostCard({
  post,
  onAction,
  onEdit,
}: {
  post: PostSummary
  onAction: (id: string, action: StatusAction) => void
  onEdit: (id: string) => void
}) {
  const [hover, setHover] = useState(false)
  const actions = ACTIONS_BY_STATUS[post.status]

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '52px minmax(0,1fr) 84px 96px auto',
        alignItems: 'center',
        gap: 16,
        padding: '14px 40px',
        borderBottom: `1px solid ${paper.rule}`,
        borderLeft: `3px solid ${hover ? ink.green : 'transparent'}`,
        background: hover ? paper.hover : paper.white,
      }}
    >
      {post.thumbnailUrl ? (
        <img
          src={post.thumbnailUrl}
          alt=""
          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flex: 'none' }}
        />
      ) : (
        <div style={{ width: 44, height: 44, background: thumbColor(post.id), borderRadius: 6, flex: 'none' }} />
      )}

      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: serif, fontSize: 16, letterSpacing: '-0.01em', color: ink.base }}>{post.en}</div>
        <div style={{ fontFamily: sans, fontSize: 11, color: ink.muted, marginTop: 3 }}>
          {post.moduleId} · {post.kind} · {post.dateLabel}
        </div>
        <div style={{ fontFamily: sans, fontSize: 12.5, color: ink.soft, marginTop: 5, lineHeight: 1.5 }}>{post.vi}</div>
        <div style={{ fontSize: 11, marginTop: 8 }}>
          <button
            onClick={() => onEdit(post.id)}
            className="admin-link-action"
            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit' }}
          >
            Sửa
          </button>
          {actions.map((a) => (
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

      <div style={{ fontFamily: sans, fontSize: 10, color: ink.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {post.template ? TEMPLATE_LABEL[post.template] : '—'}
      </div>

      <StatusBadge status={post.status} />
    </div>
  )
}
