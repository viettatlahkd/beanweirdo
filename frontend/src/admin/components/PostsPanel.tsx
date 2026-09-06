import { useCallback, useEffect, useState } from 'react'
import { PostCard } from './PostCard'
import {
  createPost,
  listPosts,
  updatePost,
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
 * Content management's first tab: everything written, in one list.
 *
 * Từng có hai loại ở đây. Ghi chép nằm bảng riêng, sửa ngay trên dòng, không có
 * nháp/đăng, không tag không template; bài đăng thì có đủ. Chủ site nhìn ô sửa
 * ghi chép và hỏi thẳng: "nó nên được cấu trúc giống bài đăng chứ nhỉ, chỉ là
 * loại bài khác nhau thôi ý." Đúng vậy — và nửa đường đã đi rồi: nút "+ Ghi
 * chú" bỏ từ trước, memo của Ghi 01 vốn là một bài đăng, lưới Ghi 01 vẽ bài
 * chứ không vẽ ghi chép. Nên ở đây bỏ nốt cửa còn lại. Ghi 01 giờ chỉ có một
 * cửa: bài đăng.
 *
 * Bảng `notes` vẫn nằm đó, không ai đọc và không ai ghi — xoá bảng là việc
 * phải mở SQL Editor, để chủ site quyết.
 */
export function PostsPanel({
  onChanged,
}: {
  /**
   * Called after anything here changes a post.
   *
   * The site map and Sửa nội dung read their own copy of the post list, so
   * publishing something on this tab left them showing the site as it was
   * before: a module could say "1 bài" with two of its posts live. One tab
   * changing the site has to tell the others.
   */
  onChanged?: () => void
}) {
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
      onChanged?.()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  /**
   * Ghim, ngay tại danh sách. Bài ghim dẫn đầu module của nó, nên đổi một bài
   * là đổi thứ tự cả module — nạp lại danh sách sau khi ghi.
   */
  async function handlePin(id: string, pinned: boolean) {
    try {
      await updatePost(id, { pinned })
      await load()
      onChanged?.()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  /**
   * Start a new draft from an existing post.
   *
   * The copy takes the content and opens in the editor, so the writer lands
   * where the work is rather than on a list wondering which of two identical
   * titles is the new one. Its name is marked so the two can be told apart
   * before anyone has renamed it.
   */
  async function handleCopy(id: string) {
    const src = posts.find((p) => p.id === id)
    if (!src) return
    try {
      const { id: created } = await createPost({
        module_id: src.module_id,
        kind: src.kind,
        en: `${src.en} (bản sao)`,
        vi: src.vi || 'Một dòng mô tả',
        fromPostId: id,
      })
      onChanged?.()
      nav.editPost(created)
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
          {/*
            "+ Ghi chú" wrote a row into `notes`, a second table Ghi 01 reads
            alongside its posts. It was a second way to start writing that
            skipped the tag, the template and the title — and a note filed under
            Ghi 01 is a post filed under Ghi 01, which the form below already
            does. The table stays; nothing new is written into it.
          */}
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
        <PostCard
          key={p.id}
          post={p}
          onAction={handleAction}
          onEdit={(id) => nav.editPost(id)}
          onCopy={handleCopy}
          onPin={handlePin}
        />
      ))}

      {posts.length === 0 && !error && (
        <div style={{ color: ink.faint, fontSize: 12.5, padding: '40px 0', textAlign: 'center' }}>
          Chưa có bài nào.
        </div>
      )}
    </div>
  )
}
