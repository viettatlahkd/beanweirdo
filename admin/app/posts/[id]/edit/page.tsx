'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AuthGate } from '../../../../components/AuthGate'
import { getPost, updatePost, uploadImage, transitionStatus, type PostDetail, type Template, listTemplates } from '../../../../lib/apiClient'
import { EditorCanvas } from './EditorCanvas'

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)

  useEffect(() => {
    Promise.all([getPost(id), listTemplates()]).then(([p, templates]) => {
      setPost(p)
      setTemplate(templates.find((t) => t.id === p.templateId) ?? null)
    })
  }, [id])

  if (!post || !template) return <div style={{ padding: 32 }}>Đang tải...</div>

  const sections = post.body.map((s) => ({ h: s.h, p: s.p }))

  return (
    <AuthGate>
      <div style={{ padding: 32 }}>
        <a href={`/posts/${id}/preview`} target="_blank" rel="noreferrer">Xem trước ↗</a>
        <EditorCanvas
          template={template}
          post={{ title: post.en, sections }}
          onTitleChange={(en) => updatePost(id, { en })}
          onSectionBodyChange={(index, p) => {
            const nextBody = post.body.map((s, i) => (i === index ? { ...s, p } : s))
            setPost({ ...post, body: nextBody })
            updatePost(id, { body: nextBody })
          }}
          onHeroDrop={async (file) => {
            const { url } = await uploadImage(file)
            setPost({ ...post, heroImageUrl: url })
            updatePost(id, { heroImageUrl: url })
          }}
        />
        <div style={{ marginTop: 20 }}>
          <button onClick={() => router.push('/posts')}>Lưu nháp</button>
          <button onClick={async () => { await transitionStatus(id, 'publish'); router.push('/posts') }} style={{ marginLeft: 8 }}>
            Publish
          </button>
        </div>
      </div>
    </AuthGate>
  )
}
