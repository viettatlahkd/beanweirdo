'use client'
import { PostRenderer, type PostRenderData, type Template } from 'post-renderer'

type Props = {
  template: Template
  post: Pick<PostRenderData, 'title' | 'sections' | 'heroImageUrl'>
  onTitleChange: (title: string) => void
  onSectionBodyChange: (index: number, p: string) => void
  onHeroDrop: (file: File) => void
}

export function EditorCanvas({ template, post, onTitleChange, onSectionBodyChange, onHeroDrop }: Props) {
  return (
    <PostRenderer
      template={template}
      post={post}
      renderTitle={(title) => (
        <input
          defaultValue={title}
          onChange={(e) => onTitleChange(e.target.value)}
          style={{ font: 'inherit', background: 'transparent', border: 'none', borderBottom: '1px dashed currentColor', width: '100%' }}
        />
      )}
      renderSectionBody={(p, i) => (
        <textarea
          defaultValue={p}
          onChange={(e) => onSectionBodyChange(i, e.target.value)}
          style={{ font: 'inherit', width: '100%', border: 'none', background: 'transparent' }}
        />
      )}
      renderHero={() => (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) onHeroDrop(file)
          }}
          style={{ height: 140, border: '2px dashed currentColor', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          kéo ảnh hero thả vào đây, hoặc bấm để chọn file
        </div>
      )}
    />
  )
}
