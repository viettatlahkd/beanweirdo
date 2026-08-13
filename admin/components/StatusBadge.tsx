import type { PostStatus } from '../lib/apiClient'

const LABEL: Record<PostStatus, string> = { draft: 'Draft', published: 'Published', archived: 'Archived', deleted: 'Deleted' }

export function StatusBadge({ status }: { status: PostStatus }) {
  return <span data-testid="status-badge">{LABEL[status]}</span>
}
