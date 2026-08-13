'use client'
import { PostRenderer, type PostRenderData, type Template } from 'post-renderer'
import { ink, paper, sans, serif } from '../../../../lib/theme'

type Props = {
  template: Template
  post: Pick<PostRenderData, 'title' | 'sections' | 'heroImageUrl'>
  onTitleChange: (title: string) => void
  onSectionBodyChange: (index: number, p: string) => void
  onHeroDrop: (file: File) => void
}

export function EditorCanvas({ template, post, onTitleChange, onSectionBodyChange, onHeroDrop }: Props) {
  return (
    <div style={{ maxWidth: 640, border: `1px solid ${paper.rule}`, borderRadius: 10, overflow: 'hidden', background: paper.white }}>
      <PostRenderer
        template={template}
        post={post}
        renderTitle={(title) => (
          <input
            defaultValue={title}
            onChange={(e) => onTitleChange(e.target.value)}
            style={{
              fontFamily: serif,
              fontSize: 30,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: '1.5px dashed rgba(0,0,0,.25)',
              width: '100%',
              padding: '4px 0',
              color: 'inherit',
            }}
          />
        )}
        renderSectionBody={(p, i) => (
          <textarea
            defaultValue={p}
            onChange={(e) => onSectionBodyChange(i, e.target.value)}
            rows={3}
            style={{
              fontFamily: sans,
              fontWeight: 300,
              fontSize: 13.5,
              color: ink.soft,
              lineHeight: 1.6,
              width: '100%',
              border: 'none',
              background: 'transparent',
              resize: 'vertical',
              marginTop: 6,
            }}
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
            style={{
              height: 140,
              marginTop: 18,
              border: '2px dashed rgba(0,0,0,.3)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: sans,
              fontSize: 12,
              color: 'rgba(0,0,0,.55)',
              background: 'rgba(255,255,255,.25)',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            ⬇ kéo ảnh hero thả vào đây, hoặc bấm để chọn file
          </div>
        )}
      />
    </div>
  )
}
