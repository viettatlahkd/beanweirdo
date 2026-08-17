'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PostRenderer } from 'post-renderer'
import { AuthGate } from '../../../../components/AuthGate'
import { getPost, listModules, type Module, type PostDetail } from '../../../../lib/apiClient'
import { ink, paper } from '../../../../lib/theme'
import { resolveTemplate, toArticleData, toCardsData, toReportData } from '../postData'

/**
 * Read-only preview: no render-prop overrides at all. This is the proof of
 * the WYSIWYG claim — the exact same PostRenderer/Article/Cards/Report
 * components the public site will render, given the post's real data,
 * un-doctored by any admin-only editing chrome.
 */
export default function PreviewPage() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [modules, setModules] = useState<Module[]>([])

  useEffect(() => {
    Promise.all([getPost(id), listModules()]).then(([p, mods]) => {
      setPost(p)
      setModules(mods)
    })
  }, [id])

  if (!post) return <div style={{ padding: 32, color: ink.muted, fontSize: 13 }}>Đang tải...</div>

  const template = resolveTemplate(post)
  const activeModule = modules.find((m) => m.id === post.moduleId)

  return (
    <AuthGate>
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
    </AuthGate>
  )
}
