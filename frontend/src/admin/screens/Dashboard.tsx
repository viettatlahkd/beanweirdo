import { useEffect, useState } from 'react'
import { PasswordGate } from '../PasswordGate'
import { PostCard } from '../components/PostCard'
import { listPosts, transitionStatus, type PostStatus, type PostSummary, type StatusAction } from '../lib/apiClient'
import { useAdminNav } from '../lib/nav'
import { ink, paper, serif } from '../../design/tokens'

const TABS: (PostStatus | 'all')[] = ['all', 'draft', 'published', 'archived', 'deleted']
// Distinct labels so tab buttons never collide with row-action names (e.g. "published" vs "Đăng").
const TAB_LABELS: Record<PostStatus | 'all', string> = {
  all: 'Tất cả',
  draft: 'Nháp',
  published: 'Đã đăng',
  archived: 'Lưu trữ',
  deleted: 'Thùng rác',
}

export function Dashboard() {
  return (
    <PasswordGate>
      <DashboardContent />
    </PasswordGate>
  )
}

function DashboardContent() {
  const nav = useAdminNav()
  const [tab, setTab] = useState<PostStatus | 'all'>('all')
  const [posts, setPosts] = useState<PostSummary[]>([])
  // Global counts for the dark header's stat row — fetched independently of
  // the tab filter so "tổng / nháp / đã đăng" stay accurate no matter which
  // tab is active (mirrors the mockup's always-on-all-tab stats).
  const [allPosts, setAllPosts] = useState<PostSummary[]>([])

  async function load() {
    setPosts(await listPosts(tab))
  }

  async function loadCounts() {
    setAllPosts(await listPosts('all'))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(() => {
    loadCounts()
  }, [])

  async function handleAction(id: string, action: StatusAction) {
    await transitionStatus(id, action)
    load()
    loadCounts()
  }

  const total = allPosts.length
  const draftCount = allPosts.filter((p) => p.status === 'draft').length
  const publishedCount = allPosts.filter((p) => p.status === 'published').length

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', background: paper.white, border: `1px solid ${paper.rule}`, overflow: 'hidden' }}>
      {/* Dark header — ports the mockup's "01 Dashboard" block header. */}
      <div style={{ background: ink.base, color: paper.cream, padding: '34px 40px 26px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            opacity: 0.7,
            marginBottom: 20,
          }}
        >
          <span style={{ opacity: 0.6 }}>←</span>
          <span>bean weirdo</span>
          <span style={{ opacity: 0.4 }}>›</span>
          <span>admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 30, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: serif, color: paper.cream, fontSize: 44, lineHeight: 0.95, letterSpacing: '-0.03em', fontWeight: 600, margin: 0 }}>
            Bài viết
          </h1>
          <div style={{ display: 'flex', gap: 26 }}>
            <div>
              <b style={{ fontFamily: serif, fontSize: 26, display: 'block', lineHeight: 1 }}>{total}</b>
              <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.14em', opacity: 0.65 }}>tổng</span>
            </div>
            <div>
              <b style={{ fontFamily: serif, fontSize: 26, display: 'block', lineHeight: 1 }}>{draftCount}</b>
              <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.14em', opacity: 0.65 }}>nháp</span>
            </div>
            <div>
              <b style={{ fontFamily: serif, fontSize: 26, display: 'block', lineHeight: 1 }}>{publishedCount}</b>
              <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.14em', opacity: 0.65 }}>đã đăng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab row — underline-active tabs like the mockup's dash-tabs. */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 40px', borderBottom: `1px solid ${paper.rule}`, background: paper.white }}>
        {TABS.map((t) => (
          <button
            key={t}
            data-testid={`tab-${t}`}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            style={{
              fontSize: 11.5,
              padding: '14px 4px',
              marginRight: 26,
              color: tab === t ? ink.base : ink.muted,
              fontWeight: tab === t ? 500 : 400,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === t ? ink.green : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
        <button
          onClick={() => nav.goNew()}
          style={{
            marginLeft: 'auto',
            fontSize: 11.5,
            letterSpacing: '0.08em',
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

      <div>
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onAction={handleAction} onEdit={(id) => nav.goEdit(id)} />
        ))}
        {posts.length === 0 && (
          <div style={{ color: ink.faint, fontSize: 12.5, padding: '40px 0', textAlign: 'center' }}>Chưa có bài nào.</div>
        )}
      </div>
    </div>
  )
}
