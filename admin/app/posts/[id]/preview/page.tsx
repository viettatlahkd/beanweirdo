'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PostRenderer, type Template } from 'post-renderer'
import { AuthGate } from '../../../../components/AuthGate'
import { getPost, listTemplates, type PostDetail } from '../../../../lib/apiClient'
import { ink, paper } from '../../../../lib/theme'

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)

  useEffect(() => {
    Promise.all([getPost(id), listTemplates()]).then(([p, templates]) => {
      setPost(p)
      setTemplate(templates.find((t) => t.id === p.templateId) ?? null)
    })
  }, [id])

  if (!post || !template) return <div style={{ padding: 32, color: ink.muted, fontSize: 13 }}>Đang tải...</div>

  return (
    <AuthGate>
      <div style={{ minHeight: '100vh', background: paper.cream, padding: '32px 24px' }}>
        <div style={{ fontSize: 12, color: ink.muted, marginBottom: 14, maxWidth: 880, margin: '0 auto 14px' }}>
          Bài đang ở <b style={{ color: ink.strong, fontWeight: 500 }}>{post.status}</b>, chỉ bạn xem được link này.
        </div>
        <div
          style={{
            maxWidth: 880,
            margin: '0 auto',
            border: `1px solid ${paper.rule}`,
            borderRadius: 10,
            overflow: 'hidden',
            background: paper.white,
          }}
        >
          <PostRenderer template={template} post={{ title: post.en, heroImageUrl: post.heroImageUrl, sections: post.body }} />
        </div>
      </div>
    </AuthGate>
  )
}
