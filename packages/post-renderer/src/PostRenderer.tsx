import type { ReactNode } from 'react'
import type { FigureData, PostRenderData, Template } from './types'

export type PostRendererProps = {
  template: Template
  post: PostRenderData
  renderTitle?: (title: string) => ReactNode
  renderHero?: (heroImageUrl: string | null | undefined) => ReactNode
  renderSectionHeading?: (h: string, index: number) => ReactNode
  renderSectionBody?: (p: string, index: number) => ReactNode
  renderFigure?: (fig: FigureData, index: number) => ReactNode
}

export function PostRenderer(props: PostRendererProps) {
  if (props.template.layout === 'specimen') return <SpecimenPost {...props} />
  if (props.template.layout === 'sequence') return <SequencePost {...props} />
  return <BandPost {...props} />
}

function Title(
  { post, renderTitle, fontSize, lineHeight, margin }: Pick<PostRendererProps, 'post' | 'renderTitle'> & {
    fontSize: number
    lineHeight?: number
    margin?: string
  },
) {
  if (renderTitle) return <>{renderTitle(post.title)}</>
  return (
    <h1 style={{ fontSize, ...(lineHeight !== undefined ? { lineHeight } : {}), margin: margin ?? '0 0 12px' }}>
      {post.title}
    </h1>
  )
}

function Sections({ post, renderSectionHeading, renderSectionBody, renderFigure }: PostRendererProps) {
  return (
    <>
      {post.sections.map((s, i) => (
        <section key={i} style={{ marginBottom: 32 }}>
          {renderSectionHeading ? renderSectionHeading(s.h, i) : <h3>{s.h}</h3>}
          {renderSectionBody ? renderSectionBody(s.p, i) : <p>{s.p}</p>}
          {s.fig && (renderFigure ? renderFigure(s.fig, i) : <FigureBlock fig={s.fig} />)}
        </section>
      ))}
    </>
  )
}

function FigureBlock({ fig }: { fig: FigureData }) {
  return (
    <figure style={{ width: fig.w, margin: fig.margin }}>
      {fig.imageUrl && <img src={fig.imageUrl} alt={fig.caption} style={{ width: '100%' }} />}
      <figcaption>{fig.caption}</figcaption>
    </figure>
  )
}

function BandPost(props: PostRendererProps) {
  const { template, post } = props
  return (
    <article>
      <header data-testid="post-hero" style={{ background: template.accent, color: template.onColor, padding: '46px 56px' }}>
        <Title post={post} renderTitle={props.renderTitle} fontSize={56} margin="0 0 12px" />
        {post.lead && <p style={{ fontStyle: 'italic', fontSize: 20 }}>{post.lead}</p>}
        {props.renderHero && props.renderHero(post.heroImageUrl)}
      </header>
      <div style={{ padding: '40px 56px', maxWidth: 720 }}>
        <Sections {...props} />
      </div>
    </article>
  )
}

function SpecimenPost(props: PostRendererProps) {
  const { template, post } = props
  return (
    <article>
      <header data-testid="post-hero-specimen" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr' }}>
        <div style={{ background: template.accent, color: template.onColor, padding: '46px 40px' }}>
          <Title post={post} renderTitle={props.renderTitle} fontSize={48} margin="0 0 12px" />
          {post.lead && <p style={{ fontStyle: 'italic' }}>{post.lead}</p>}
        </div>
        <div style={{ background: template.tint }}>
          {props.renderHero && props.renderHero(post.heroImageUrl)}
        </div>
      </header>
      <div style={{ padding: '40px 56px', maxWidth: 720 }}>
        <Sections {...props} />
      </div>
    </article>
  )
}

function SequencePost(props: PostRendererProps) {
  const { template, post } = props
  return (
    <article>
      <header data-testid="post-hero-sequence" style={{ background: template.accent, color: template.onColor, padding: '52px 56px' }}>
        <Title post={post} renderTitle={props.renderTitle} fontSize={88} lineHeight={0.95} margin="0 0 16px" />
        {post.lead && <p style={{ fontStyle: 'italic', fontSize: 18 }}>{post.lead}</p>}
        {props.renderHero && props.renderHero(post.heroImageUrl)}
      </header>
      <div style={{ padding: '40px 56px', maxWidth: 720 }}>
        <Sections {...props} />
      </div>
    </article>
  )
}
