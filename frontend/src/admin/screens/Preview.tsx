import { useEffect, useState } from 'react'
import { PostRenderer } from 'post-renderer'
import { getPost, listModules, type Module, type PostDetail } from '../lib/apiClient'
import { ink, paper } from '../../design/tokens'
import { Hover } from '../../lib/Hover'
import { useNav } from '../../lib/nav'
import { resolveTemplate } from '../lib/postData'
import {
  toArticleData,
  toCardsData,
  toLongformData,
  toMemoData,
  toReportData,
  toBitesizeData,
} from '../../lib/postToRenderer'

/**
 * Read-only preview: no render-prop overrides at all. This is the proof of
 * the WYSIWYG claim — the exact same PostRenderer/Article/Cards/Report
 * components the public site will render, given the post's real data,
 * un-doctored by any admin-only editing chrome.
 *
 * Port of the standalone admin app's app/posts/[id]/preview/page.tsx,
 * adapted to take `postId` as a prop instead of a next/navigation route
 * param. Reachable either via Editor's "Xem trước ↗" link (which opens
 * `/admin?preview=<id>` in a new tab — the Admin area reads that param on
 * mount, see App.tsx's `initialState`) or by direct in-app nav.
 */
export function Preview({ postId }: { postId: string }) {
  return (
      <PreviewContent postId={postId} />
  )
}

function PreviewContent({ postId }: { postId: string }) {
  const nav = useNav()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [modules, setModules] = useState<Module[]>([])

  useEffect(() => {
    Promise.all([getPost(postId), listModules()]).then(([p, mods]) => {
      setPost(p)
      setModules(mods)
    })
  }, [postId])

  if (!post) return <div style={{ padding: 32, color: ink.muted, fontSize: 13 }}>Đang tải...</div>

  const template = resolveTemplate(post)
  const mod = modules.find((m) => m.id === post.module_id)
  const source = post

  return (
    <div style={{ minHeight: '100vh', background: paper.cream, padding: '32px 24px' }}>
      {/*
        * Đường về bản nháp.
        *
        * Màn này mở ở TAB MỚI qua `/admin?preview=<id>`, nên trong tab ấy nó là
        * trang đầu tiên: nút back của trình duyệt không đưa về bản nháp mà đưa
        * về Content management. Chủ site gặp đúng chỗ đó. Điều hướng trong app
        * là trạng thái chứ không phải URL, nên đường về phải tự dựng ở đây.
        */}
      <div style={{ maxWidth: 1320, margin: '0 auto 14px', display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <Hover
          onClick={() => nav.editPost(postId)}
          style={{ fontSize: 12, color: ink.green, cursor: 'pointer', flex: 'none' }}
          hoverStyle={{ color: ink.strong }}
        >
          ← quay lại bản nháp
        </Hover>
        <div style={{ fontSize: 12, color: ink.muted }}>
          Bài đang ở <b style={{ color: ink.strong, fontWeight: 500 }}>{post.status}</b>, chỉ bạn xem được link này — render bằng đúng component công khai, không có ô sửa nào.
        </div>
      </div>
      <div style={{ maxWidth: 1320, margin: '0 auto', border: `1px solid ${paper.rule}`, overflow: 'hidden', background: paper.white }}>
        {/* Every template, through the same adapters the public journal uses.
            Two of the five used to fall through to `article` here, so a memo
            previewed as an essay. */}
        {template === 'cards' ? (
          <PostRenderer template="cards" post={toCardsData(source, mod)} />
        ) : template === 'report' ? (
          <PostRenderer template="report" post={toReportData(source, mod)} />
        ) : template === 'longform' ? (
          <PostRenderer template="longform" post={toLongformData(source, mod)} />
        ) : template === 'bitesize' ? (
          <PostRenderer template="bitesize" post={toBitesizeData(source, { mod })} />
        ) : template === 'memo' ? (
          <PostRenderer template="memo" post={toMemoData(source, mod)} />
        ) : (
          <PostRenderer
            template="article"
            post={toArticleData(source, mod?.title ?? post.module_id, [], -1, mod)}
          />
        )}
      </div>
    </div>
  )
}
