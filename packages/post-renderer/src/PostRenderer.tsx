import type { PostRenderData, Template } from './types'

export type PostRendererProps = {
  template: Template
  post: PostRenderData
}

export function PostRenderer({ template, post }: PostRendererProps) {
  if (template.layout === 'band') return <BandPost template={template} post={post} />
  // other layouts added in the next task
  return <BandPost template={template} post={post} />
}

function BandPost({ template, post }: PostRendererProps) {
  return (
    <article>
      <header
        data-testid="post-hero"
        style={{ background: template.accent, color: template.onColor, padding: '46px 56px' }}
      >
        <h1 style={{ fontSize: 56, margin: '0 0 12px' }}>{post.title}</h1>
        {post.lead && <p style={{ fontStyle: 'italic', fontSize: 20 }}>{post.lead}</p>}
      </header>
      <div style={{ padding: '40px 56px', maxWidth: 720 }}>
        {post.sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 32 }}>
            <h3>{s.h}</h3>
            <p>{s.p}</p>
          </section>
        ))}
      </div>
    </article>
  )
}
