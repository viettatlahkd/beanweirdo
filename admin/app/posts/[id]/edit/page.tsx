'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AuthGate } from '../../../../components/AuthGate'
import { Stepper } from '../../../../components/Stepper'
import { getPost, listModules, transitionStatus, updatePost, uploadImage, type Module, type PostDetail } from '../../../../lib/apiClient'
import { ink } from '../../../../lib/theme'
import { resolveTemplate } from '../postData'
import { EditorCanvas, type EditPatch } from './EditorCanvas'

const TEMPLATE_LABEL: Record<string, string> = { article: 'Article', cards: 'Cards', report: 'Report' }

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
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

  // Optimistic local update + fire-and-forget remote save. Functional
  // setState keeps this safe against the stale-closure bug this screen used
  // to have around hero uploads (0afcded / 4321fbb): every callback below
  // reads the latest `post` via the updater function's `prev`, never via a
  // captured `post` from the render that created the closure.
  function applyPatch(patch: EditPatch) {
    setPost((prev) => (prev ? { ...prev, ...(patch as Partial<PostDetail>) } : prev))
    updatePost(id, patch as Parameters<typeof updatePost>[1])
  }

  return (
    <AuthGate>
      <div style={{ padding: '32px 40px' }}>
        <Stepper current="editor" />
        <div style={{ fontSize: 12, color: ink.muted, marginBottom: 14 }}>
          Template: <b style={{ color: ink.strong, fontWeight: 500 }}>{TEMPLATE_LABEL[template]}</b>
        </div>
        <EditorCanvas
          template={template}
          post={post}
          module={activeModule}
          onChange={applyPatch}
          onHeroDrop={async (file) => {
            const { url } = await uploadImage(file)
            setPost((prev) => (prev ? { ...prev, heroImageUrl: url } : prev))
            updatePost(id, { heroImageUrl: url })
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, maxWidth: 1320 }}>
          <span style={{ fontSize: 11, color: ink.muted }}>Tự lưu khi rời khỏi ô soạn · trạng thái hiện tại: {post.status}</span>
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
