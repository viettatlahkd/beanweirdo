import { Article, type ArticleOverrides } from './Article'
import { Cards, type CardsOverrides } from './Cards'
import { Report, type ReportOverrides } from './Report'
import type { ArticlePostData, CardsPostData, ReportPostData } from './types'

export type PostRendererProps =
  | ({ template: 'article'; post: ArticlePostData } & ArticleOverrides)
  | ({ template: 'cards'; post: CardsPostData } & CardsOverrides)
  | ({ template: 'report'; post: ReportPostData } & ReportOverrides)

/**
 * Dispatches to the right template component for `posts.template`.
 *
 * Each template ('article' | 'cards' | 'report') is a structurally distinct
 * component — not a color-mix on one shared layout — so this is a thin
 * switch, not a shared render tree.
 */
export function PostRenderer(props: PostRendererProps) {
  if (props.template === 'cards') {
    const { template: _template, post, ...overrides } = props
    return <Cards post={post} {...overrides} />
  }
  if (props.template === 'report') {
    const { template: _template, post, ...overrides } = props
    return <Report post={post} {...overrides} />
  }
  const { template: _template, post, ...overrides } = props
  return <Article post={post} {...overrides} />
}
