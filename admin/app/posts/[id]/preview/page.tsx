'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PostRenderer, type Template } from 'post-renderer'
import { AuthGate } from '../../../../components/AuthGate'
import { getPost, listTemplates, type PostDetail } from '../../../../lib/apiClient'

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

  if (!post || !template) return <div style={{ padding: 32 }}>Đang tải...</div>

  return (
    <AuthGate>
      <PostRenderer template={template} post={{ title: post.en, heroImageUrl: post.heroImageUrl, sections: post.body }} />
    </AuthGate>
  )
}
