import type { PostRenderData, Template } from './types'

export type PostRendererProps = {
  template: Template
  post: PostRenderData
}

export function PostRenderer({ template, post }: PostRendererProps) {
  if (template.layout === 'specimen') return <SpecimenPost template={template} post={post} />
  if (template.layout === 'sequence') return <SequencePost template={template} post={post} />
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

function SpecimenPost({ template, post }: PostRendererProps) {
  return (
    <article>
      <header
        data-testid="post-hero-specimen"
        style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr' }}
      >
        <div style={{ background: template.accent, color: template.onColor, padding: '46px 40px' }}>
          <h1 style={{ fontSize: 48, margin: '0 0 12px' }}>{post.title}</h1>
          {post.lead && <p style={{ fontStyle: 'italic' }}>{post.lead}</p>}
        </div>
        <div style={{ background: template.tint }} />
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

function SequencePost({ template, post }: PostRendererProps) {
  return (
    <article>
      <header
        data-testid="post-hero-sequence"
        style={{ background: template.accent, color: template.onColor, padding: '52px 56px' }}
      >
        <h1 style={{ fontSize: 88, lineHeight: 0.95, margin: '0 0 16px' }}>{post.title}</h1>
        {post.lead && <p style={{ fontStyle: 'italic', fontSize: 18 }}>{post.lead}</p>}
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
