import { useEffect, useState } from 'react'
import { PostRenderer } from 'post-renderer'
import { PasswordGate } from '../PasswordGate'
import { getPost, listModules, type Module, type PostDetail } from '../lib/apiClient'
import { ink, paper } from '../../design/tokens'
import { resolveTemplate, toArticleData, toCardsData, toReportData } from '../lib/postData'

/**
 * Read-only preview: no render-prop overrides at all. This is the proof of
 * the WYSIWYG claim — the exact same PostRenderer/Article/Cards/Report
 * components the public site will render, given the post's real data,
 * un-doctored by any admin-only editing chrome.
 *
 * Port of the standalone admin app's app/posts/[id]/preview/page.tsx,
 * adapted to take `postId` as a prop instead of a next/navigation route
 * param. Reachable either via Editor's "Xem trước ↗" link (which opens
 * `/admin?preview=<id>` in a new tab — see AdminApp) or by direct in-app nav.
 */
export function Preview({ postId }: { postId: string }) {
  return (
    <PasswordGate>
      <PreviewContent postId={postId} />
    </PasswordGate>
  )
}

function PreviewContent({ postId }: { postId: string }) {
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
  const activeModule = modules.find((m) => m.id === post.moduleId)

  return (
    <div style={{ minHeight: '100vh', background: paper.cream, padding: '32px 24px' }}>
      <div style={{ fontSize: 12, color: ink.muted, marginBottom: 14, maxWidth: 1320, margin: '0 auto 14px' }}>
        Bài đang ở <b style={{ color: ink.strong, fontWeight: 500 }}>{post.status}</b>, chỉ bạn xem được link này — render bằng đúng component công khai, không có ô sửa nào.
      </div>
      <div style={{ maxWidth: 1320, margin: '0 auto', border: `1px solid ${paper.rule}`, overflow: 'hidden', background: paper.white }}>
        {template === 'cards' ? (
          <PostRenderer template="cards" post={toCardsData(post)} />
        ) : template === 'report' ? (
          <PostRenderer template="report" post={toReportData(post)} />
        ) : (
          <PostRenderer template="article" post={toArticleData(post, activeModule)} />
        )}
      </div>
    </div>
  )
}
