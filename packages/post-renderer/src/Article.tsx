import type { CSSProperties, ReactNode } from 'react'
import { garden, ink, layout, paper, sans, serif } from './tokens'
import type { ArticlePlateData, ArticlePostData, FigureData } from './types'

const label: CSSProperties = {
  fontFamily: sans,
  fontSize: 10,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
}

export type ArticleOverrides = {
  renderEyebrow?: (eyebrow: string) => ReactNode
  renderTitle?: (title: string, titleItalic: string | undefined) => ReactNode
  renderLead?: (lead: string) => ReactNode
  /** the four decorative tint plates: hero, opener-primary, opener-secondary, rail-detail */
  renderPlateCaption?: (plate: ArticlePlateData, slot: 'hero' | 'primary' | 'secondary' | 'detail') => ReactNode
  renderSectionHeading?: (h: string, index: number) => ReactNode
  renderSectionBody?: (p: string, index: number) => ReactNode
  renderFigure?: (fig: FigureData, index: number) => ReactNode
  renderPullQuote?: (pull: string) => ReactNode
  renderRelatedItem?: (label: string, index: number) => ReactNode
  renderFurtherReadingItem?: (item: string, index: number) => ReactNode
}

export type ArticleProps = ArticleOverrides & {
  post: ArticlePostData
}

/**
 * The "article" template — a single body column at a comfortable measure,
 * a color band up top with the title kept clear of the hero plate, and a
 * sticky rail (pull-quote / related / further-reading) that runs the length
 * of the piece. Ported from frontend/src/screens/Article.tsx, parameterized
 * over `post` instead of the static article/articleMeta content modules.
 */
export function Article({ post, ...overrides }: ArticleProps) {
  return (
    <div>
      <div
        style={{
          background: garden.leaf,
          color: '#1F3323',
          padding: '46px 56px 124px',
          position: 'relative',
        }}
      >
        <div style={{ ...label, opacity: 0.7, marginBottom: 24 }}>
          {overrides.renderEyebrow ? overrides.renderEyebrow(post.moduleTitle) : `← ${post.moduleTitle}`}
        </div>
        <div style={{ ...label, opacity: 0.7, marginBottom: 12 }}>{post.eyebrow}</div>
        <h1
          data-testid="article-title"
          style={{
            fontFamily: serif,
            fontSize: 76,
            lineHeight: 0.94,
            letterSpacing: '-.04em',
            margin: '0 0 12px',
            maxWidth: 'min(660px, 100% - 300px)',
          }}
        >
          {overrides.renderTitle ? (
            overrides.renderTitle(post.title, post.titleItalic)
          ) : (
            <>
              {post.title}
              {post.titleItalic && <span style={{ fontStyle: 'italic' }}>{post.titleItalic}</span>}
            </>
          )}
        </h1>
        <div
          style={{
            fontFamily: serif,
            fontStyle: 'italic',
            fontSize: 24,
            lineHeight: 1.4,
            maxWidth: 'min(520px, 100% - 300px)',
          }}
        >
          {overrides.renderLead ? overrides.renderLead(post.lead) : post.lead}
        </div>

        <div
          data-testid="article-hero-plate"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 300,
            background: post.heroPlate.imageUrl ? undefined : post.heroPlate.tint,
            backgroundImage: post.heroPlate.imageUrl ? `url(${post.heroPlate.imageUrl})` : undefined,
            backgroundSize: 'cover',
            display: 'flex',
            alignItems: 'flex-end',
            padding: 14,
          }}
        >
          <div style={{ fontFamily: sans, fontSize: 9.5, color: '#3B2A2B' }}>
            {overrides.renderPlateCaption
              ? overrides.renderPlateCaption(post.heroPlate, 'hero')
              : post.heroPlate.caption}
          </div>
        </div>
      </div>

      <div style={{ padding: '56px 56px 140px', maxWidth: layout.measure }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `minmax(0,1fr) minmax(${layout.railMin}px,${layout.railMax}px)`,
            gap: 48,
            alignItems: 'start',
          }}
        >
          <div>
            {/* two plates of unequal height, bottom-aligned to a common edge */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,2.1fr) minmax(0,1fr)',
                gap: 10,
                margin: '0 0 46px',
              }}
            >
              <div
                style={{
                  height: 280,
                  background: post.platePrimary.imageUrl ? undefined : post.platePrimary.tint,
                  backgroundImage: post.platePrimary.imageUrl ? `url(${post.platePrimary.imageUrl})` : undefined,
                  backgroundSize: 'cover',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 14,
                }}
              >
                <div style={{ fontFamily: sans, fontSize: 10, color: ink.strong, lineHeight: 1.3 }}>
                  {overrides.renderPlateCaption
                    ? overrides.renderPlateCaption(post.platePrimary, 'primary')
                    : post.platePrimary.caption}
                </div>
              </div>
              <div
                style={{
                  height: 180,
                  alignSelf: 'end',
                  background: post.plateSecondary.imageUrl ? undefined : post.plateSecondary.tint,
                  backgroundImage: post.plateSecondary.imageUrl ? `url(${post.plateSecondary.imageUrl})` : undefined,
                  backgroundSize: 'cover',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 12,
                }}
              >
                <div style={{ fontFamily: sans, fontSize: 9.5, color: '#6B6555', lineHeight: 1.2 }}>
                  {overrides.renderPlateCaption
                    ? overrides.renderPlateCaption(post.plateSecondary, 'secondary')
                    : post.plateSecondary.caption}
                </div>
              </div>
            </div>

            {post.sections.map((s, i) => (
              <div key={i} style={{ marginBottom: 34 }}>
                <h3
                  style={{
                    fontFamily: sans,
                    fontWeight: 400,
                    fontSize: 11,
                    letterSpacing: '.16em',
                    textTransform: 'uppercase',
                    color: ink.green,
                    margin: '0 0 12px',
                  }}
                >
                  {overrides.renderSectionHeading ? overrides.renderSectionHeading(s.h, i) : s.h}
                </h3>
                <div style={{ fontSize: 16, lineHeight: 1.2, color: ink.body }}>
                  {overrides.renderSectionBody ? overrides.renderSectionBody(s.p, i) : s.p}
                </div>

                {s.fig &&
                  (overrides.renderFigure ? (
                    overrides.renderFigure(s.fig, i)
                  ) : (
                    // the plate sits off to one side; its marginal note takes the
                    // space that would otherwise be a gap in the reading column
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', margin: s.fig.margin }}>
                      <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
                        <div
                          style={{
                            fontFamily: sans,
                            fontSize: 9.5,
                            letterSpacing: '.12em',
                            textTransform: 'uppercase',
                            color: ink.green,
                            marginBottom: 8,
                          }}
                        >
                          {s.fig.label}
                        </div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: ink.soft }}>{s.fig.note}</div>
                      </div>
                      <div style={{ width: s.fig.w, flex: 'none' }}>
                        <div
                          style={{
                            height: s.fig.h,
                            background: s.fig.imageUrl ? undefined : s.fig.tint,
                            backgroundImage: s.fig.imageUrl ? `url(${s.fig.imageUrl})` : undefined,
                            backgroundSize: 'cover',
                            display: 'flex',
                            alignItems: 'flex-end',
                            padding: 12,
                          }}
                        >
                          <div style={{ fontFamily: sans, fontSize: 9.5, color: ink.strong, lineHeight: 1.3 }}>
                            {s.fig.caption}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>

          <div style={{ position: 'sticky', top: 44, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                background: ink.moss,
                color: '#F4F2E4',
                padding: '22px 20px',
                fontFamily: serif,
                fontStyle: 'italic',
                fontSize: 18,
                lineHeight: 1.2,
              }}
            >
              {overrides.renderPullQuote ? overrides.renderPullQuote(post.pull) : post.pull}
            </div>

            <div style={{ borderTop: `2px solid ${ink.base}`, paddingTop: 14 }}>
              <div style={{ ...label, color: ink.muted, marginBottom: 8 }}>{post.relatedHeading}</div>
              {post.related.map((r, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 13,
                    lineHeight: 1.4,
                    padding: '9px 0',
                    borderBottom: `1px solid ${paper.rule}`,
                    cursor: 'pointer',
                    color: ink.soft,
                  }}
                >
                  {overrides.renderRelatedItem ? overrides.renderRelatedItem(r.label, i) : r.label}
                </div>
              ))}
            </div>

            <div
              style={{
                aspectRatio: '1',
                background: post.detailPlate.imageUrl ? undefined : post.detailPlate.tint,
                backgroundImage: post.detailPlate.imageUrl ? `url(${post.detailPlate.imageUrl})` : undefined,
                backgroundSize: 'cover',
                display: 'flex',
                alignItems: 'flex-end',
                padding: 12,
              }}
            >
              <div style={{ fontFamily: sans, fontSize: 9.5, color: '#6B6555' }}>
                {overrides.renderPlateCaption
                  ? overrides.renderPlateCaption(post.detailPlate, 'detail')
                  : post.detailPlate.caption}
              </div>
            </div>

            <div style={{ fontFamily: sans, fontSize: 10, color: ink.muted, lineHeight: 1.6 }}>
              <div style={{ ...label, color: ink.green, marginBottom: 6 }}>{post.furtherReadingHeading}</div>
              {post.furtherReading.map((r, i) => (
                <div key={i}>
                  {overrides.renderFurtherReadingItem ? overrides.renderFurtherReadingItem(r, i) : r}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
