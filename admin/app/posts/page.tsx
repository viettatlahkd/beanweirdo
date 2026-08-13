'use client'
import { useEffect, useState } from 'react'
import { AuthGate } from '../../components/AuthGate'
import { PostCard } from '../../components/PostCard'
import { listPosts, transitionStatus, type PostStatus, type PostSummary, type StatusAction } from '../../lib/apiClient'
import { ink } from '../../lib/theme'

const TABS: (PostStatus | 'all')[] = ['all', 'draft', 'published', 'archived', 'deleted']
// Distinct labels so tab buttons never collide with row-action names (e.g. "published" vs "Publish").
const TAB_LABELS: Record<PostStatus | 'all', string> = { all: 'Tất cả', draft: 'Nháp', published: 'Đã đăng', archived: 'Lưu trữ', deleted: 'Đã xoá' }

export default function PostsPage() {
  const [tab, setTab] = useState<PostStatus | 'all'>('all')
  const [posts, setPosts] = useState<PostSummary[]>([])

  async function load() {
    setPosts(await listPosts(tab))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function handleAction(id: string, action: StatusAction) {
    await transitionStatus(id, action)
    load()
  }

  return (
    <AuthGate>
      <div style={{ padding: '32px 40px', maxWidth: 880 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className="admin-tab">
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <a href="/posts/new" className="admin-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
            + Bài mới
          </a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onAction={handleAction} />
          ))}
          {posts.length === 0 && (
            <div style={{ color: ink.faint, fontSize: 12.5, padding: '24px 0', textAlign: 'center' }}>Chưa có bài nào.</div>
          )}
        </div>
      </div>
    </AuthGate>
  )
}
