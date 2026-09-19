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
import { ink, paper, sans } from '../../design/tokens'
import { Button } from '../../design/Button'
import { IconPlus } from '../../design/icons'
import { useToast } from '../../design/Toaster'
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
  const toast = useToast()
  const [filter, setFilter] = useState<PostStatus | 'all'>('all')
  const [posts, setPosts] = useState<PostSummary[]>([])
  // Counts come from an unfiltered fetch so the stat row stays accurate no
  // matter which filter is active.
  const [allPosts, setAllPosts] = useState<PostSummary[]>([])
  /*
   * Only whether the last load failed, not the message. The message is a toast
   * now — an error drawn inside the list pushed the rows down, and a save that
   * worked said nothing at all. What the flag is still needed for is the empty
   * state below: "Chưa có bài nào" is a lie when the truth is that the fetch
   * never came back.
   */
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    try {
      setPosts(await listPosts(filter))
      setFailed(false)
    } catch (e) {
      setFailed(true)
      toast.fromError(e)
    }
  }, [filter, toast])

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
      toast.fromError(e)
    }
  }

  /**
   * Ghim, ngay tại danh sách. Bài ghim dẫn đầu module của nó ngoài site, và
   * dẫn đầu chính danh sách này trong quản trị — nên đổi một bài là đổi thứ
   * tự, nạp lại danh sách sau khi ghi.
   */
  async function handlePin(id: string, pinned: boolean) {
    try {
      await updatePost(id, { pinned })
      await load()
      onChanged?.()
    } catch (e) {
      toast.fromError(e)
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
      toast.fromError(e)
    }
  }

  /*
   * Ghim đưa bài lên đầu danh sách.
   *
   * Máy chủ trả về theo `updated_at` giảm dần và không biết gì về ghim: ghim
   * vốn chỉ nói về thứ tự trong module khi đọc ngoài site. Chủ site muốn nó
   * nói cả ở đây, nên xếp lại tại chỗ. `sort` của JavaScript ổn định, nên các
   * bài không ghim giữ nguyên thứ tự máy chủ đã chọn, chỉ nhóm ghim nhấc lên.
   */
  const ordered = [...posts].sort((a, b) => Number(b.pinned) - Number(a.pinned))

  const stats = [
    { n: allPosts.length, label: 'tổng' },
    { n: allPosts.filter((p) => p.status === 'draft').length, label: 'nháp' },
    { n: allPosts.filter((p) => p.status === 'published').length, label: 'đã đăng' },
  ]

  return (
    /*
     * Danh sách căn giữa, có trần bề rộng. Trước đây nó chạy hết bề ngang cửa
     * sổ, nên trên màn rộng tiêu đề và cụm nút cuối dòng cách nhau cả gang tay
     * và mắt phải đi hết chiều ngang mới nối được hai đầu của cùng một bài.
     */
    <div style={{ maxWidth: 940, margin: '0 auto' }}>
      {/*
        Counts, then the filter row with the one action that starts something.
        All three used to share a single wrapping flex row, so on a narrow
        window "+ Bài mới" wrapped down under the filters and read as a sixth
        filter.
      */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, paddingBottom: 14 }}>
        {stats.map((s) => (
          <div key={s.label}>
            <b style={{ fontSize: 19, display: 'block', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {s.n}
            </b>
            <span
              style={{
                fontFamily: sans,
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
      </div>

      {/*
        Sticky: the list runs well past one screen, and the filter you are on
        plus the one button that starts a post are exactly what you want while
        scrolling it.
      */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: paper.cream,
          borderBottom: `1px solid ${paper.rule}`,
          marginBottom: 4,
          flexWrap: 'wrap',
        }}
      >
        {/*
          Filters stay underlined text rather than becoming bordered buttons.
          The screen already has a row of pills above it for the three places
          you can stand; a second row of identical pills would say those two
          rows are the same kind of choice, and they are not.
        */}
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className="ab-filter"
              data-testid={`tab-${t}`}
              onClick={() => setFilter(t)}
              aria-pressed={filter === t}
              style={{
                fontFamily: sans,
                fontSize: 11.5,
                padding: '13px 4px',
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
        </div>

        {/*
          "+ Ghi chú" wrote a row into `notes`, a second table Ghi 01 reads
          alongside its posts. It was a second way to start writing that
          skipped the tag, the template and the title — and a note filed under
          Ghi 01 is a post filed under Ghi 01, which the form below already
          does. The table stays; nothing new is written into it.
        */}
        <div style={{ marginLeft: 'auto', paddingBottom: 8 }}>
          <Button level="primary" onClick={() => nav.newPost()} icon={<IconPlus size={16} />}>
            Bài mới
          </Button>
        </div>
      </div>

      {/*
        Thẻ rời nhau, không còn là các dòng dính liền ngăn bằng một nét kẻ.
        Khoảng hở là của danh sách chứ không phải của thẻ: thẻ tự đặt lề dưới
        thì thẻ cuối cùng luôn thừa ra một khoảng không ai cần.
      */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10 }}>
        {ordered.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onAction={handleAction}
            onEdit={(id) => nav.editPost(id)}
            onCopy={handleCopy}
            onPin={handlePin}
          />
        ))}
      </div>

      {ordered.length === 0 && (
        <div style={{ color: ink.faint, fontSize: 12.5, padding: '40px 0', textAlign: 'center' }}>
          {failed ? 'Không tải được danh sách bài.' : 'Chưa có bài nào.'}
        </div>
      )}
    </div>
  )
}
