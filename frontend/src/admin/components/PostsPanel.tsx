import { useCallback, useEffect, useState } from 'react'
import { PostCard } from './PostCard'
import {
  listPosts,
  transitionStatus,
  type PostStatus,
  type PostSummary,
  type StatusAction,
} from '../lib/apiClient'
import { ink, paper } from '../../design/tokens'
import { useNav } from '../../lib/nav'

const TABS: (PostStatus | 'all')[] = ['all', 'draft', 'published', 'archived', 'deleted']
// Distinct labels so filter buttons never collide with row-action names
// (e.g. the "published" filter vs the "Đăng" action).
const TAB_LABELS: Record<PostStatus | 'all', string> = {
  all: 'Tất cả',
  draft: 'Nháp',
  published: 'Đã đăng',
  archived: 'Lưu trữ',
  deleted: 'Thùng rác',
}

/**
 * Content management's first tab: write, edit and publish posts.
 *
 * This was its own screen at /admin before the three areas were split out.
 * Publishing a post is content management, so it belongs beside the site map
 * and the copy editor rather than behind a second, differently-shaped door.
 */
export function PostsPanel() {
  const nav = useNav()
  const [filter, setFilter] = useState<PostStatus | 'all'>('all')
  const [posts, setPosts] = useState<PostSummary[]>([])
  // Counts come from an unfiltered fetch so the stat row stays accurate no
  // matter which filter is active.
  const [allPosts, setAllPosts] = useState<PostSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setPosts(await listPosts(filter))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [filter])

  const loadCounts = useCallback(async () => {
    try {
      setAllPosts(await listPosts('all'))
    } catch {
      /* the stat row is decoration; the list's own error is enough */
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void loadCounts()
  }, [loadCounts])

  async function handleAction(id: string, action: StatusAction) {
    try {
      await transitionStatus(id, action)
      await Promise.all([load(), loadCounts()])
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const stats = [
    { n: allPosts.length, label: 'tổng' },
    { n: allPosts.filter((p) => p.status === 'draft').length, label: 'nháp' },
    { n: allPosts.filter((p) => p.status === 'published').length, label: 'đã đăng' },
  ]

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${paper.rule}`,
          marginBottom: 4,
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            data-testid={`tab-${t}`}
            onClick={() => setFilter(t)}
            aria-pressed={filter === t}
            style={{
              fontSize: 11.5,
              padding: '14px 4px',
              marginRight: 26,
              color: filter === t ? ink.base : ink.muted,
              fontWeight: filter === t ? 500 : 400,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${filter === t ? ink.green : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 22 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ textAlign: 'right' }}>
              <b style={{ fontSize: 15, display: 'block', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {s.n}
              </b>
              <span
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '.14em',
                  color: ink.faint,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
          <button
            onClick={() => nav.newPost()}
            style={{
              fontSize: 11.5,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              background: ink.green,
              color: '#fff',
              padding: '9px 16px',
              borderRadius: 4,
            }}
          >
            + Bài mới
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: '#8E1E42', fontSize: 12.5, padding: '10px 0' }}>{error}</div>
      )}

      {posts.map((p) => (
        <PostCard key={p.id} post={p} onAction={handleAction} onEdit={(id) => nav.editPost(id)} />
      ))}
      {posts.length === 0 && !error && (
        <div style={{ color: ink.faint, fontSize: 12.5, padding: '40px 0', textAlign: 'center' }}>
          Chưa có bài nào.
        </div>
      )}
    </div>
  )
}
