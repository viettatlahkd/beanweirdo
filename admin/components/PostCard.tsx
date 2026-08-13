import type { PostStatus, PostSummary, StatusAction } from '../lib/apiClient'
import { StatusBadge } from './StatusBadge'

const ACTIONS_BY_STATUS: Record<PostStatus, { label: string; action: StatusAction }[]> = {
  draft: [{ label: 'Publish', action: 'publish' }, { label: 'Xoá', action: 'delete' }],
  published: [{ label: 'Archive', action: 'archive' }, { label: 'Xoá', action: 'delete' }],
  archived: [{ label: 'Restore', action: 'restore' }, { label: 'Xoá', action: 'delete' }],
  deleted: [{ label: 'Restore', action: 'restore-trash' }, { label: 'Xoá vĩnh viễn', action: 'permanently-delete' }],
}

export function PostCard({ post, onAction }: { post: PostSummary; onAction: (id: string, action: StatusAction) => void }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: 12, border: '1px solid #EBE5D3', borderRadius: 10 }}>
      <div style={{ width: 68, height: 68, background: '#F2A0A5', borderRadius: 8, flex: 'none' }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{post.en}</span>
          <StatusBadge status={post.status} />
        </div>
        <div style={{ fontSize: 11, opacity: 0.6 }}>{post.moduleId} · {post.kind} · {post.updatedAt}</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>{post.vi}</div>
        <div style={{ marginTop: 8 }}>
          <a href={`/posts/${post.id}/edit`}>Sửa</a>
          {ACTIONS_BY_STATUS[post.status].map((a) => (
            <button key={a.action} onClick={() => onAction(post.id, a.action)} style={{ marginLeft: 10 }}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
