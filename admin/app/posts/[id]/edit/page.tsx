'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AuthGate } from '../../../../components/AuthGate'
import { Stepper } from '../../../../components/Stepper'
import { getPost, updatePost, uploadImage, transitionStatus, type PostDetail, type Template, listTemplates } from '../../../../lib/apiClient'
import { ink } from '../../../../lib/theme'
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

  if (!post || !template) return <div style={{ padding: 32, color: ink.muted, fontSize: 13 }}>Đang tải...</div>

  const sections = post.body.map((s) => ({ h: s.h, p: s.p }))

  return (
    <AuthGate>
      <div style={{ padding: '32px 40px' }}>
        <Stepper current="editor" />
        <div style={{ fontSize: 12, color: ink.muted, marginBottom: 14 }}>
          Template: <b style={{ color: ink.strong, fontWeight: 500 }}>{template.name}</b>
        </div>
        <EditorCanvas
          template={template}
          post={{ title: post.en, sections, heroImageUrl: post.heroImageUrl }}
          onTitleChange={(en) => updatePost(id, { en })}
          onSectionBodyChange={(index, p) => {
            const nextBody = post.body.map((s, i) => (i === index ? { ...s, p } : s))
            setPost({ ...post, body: nextBody })
            updatePost(id, { body: nextBody })
          }}
          onHeroDrop={async (file) => {
            const { url } = await uploadImage(file)
            setPost((prev) => (prev ? { ...prev, heroImageUrl: url } : prev))
            updatePost(id, { heroImageUrl: url })
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, maxWidth: 640 }}>
          <span style={{ fontSize: 11, color: ink.muted }}>Autosave mỗi vài giây · trạng thái hiện tại: {post.status}</span>
          <div>
            <a href={`/posts/${id}/preview`} target="_blank" rel="noreferrer" className="admin-btn-ghost" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Xem trước ↗
            </a>
            <button onClick={() => router.push('/posts')} className="admin-btn-ghost" style={{ marginLeft: 8 }}>
              Lưu nháp
            </button>
            <button
              onClick={async () => {
                await transitionStatus(id, 'publish')
                router.push('/posts')
              }}
              className="admin-btn"
              style={{ marginLeft: 8 }}
            >
              Publish
            </button>
          </div>
        </div>
      </div>
    </AuthGate>
  )
}
