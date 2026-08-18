import { Article, type ArticleOverrides } from './Article'
import { Cards, type CardsOverrides } from './Cards'
import { Longform } from './Longform'
import { Report, type ReportOverrides } from './Report'
import type { ArticlePostData, CardsPostData, LongformPostData, ReportPostData } from './types'

export type PostRendererProps =
  | ({ template: 'article'; post: ArticlePostData } & ArticleOverrides)
  | ({ template: 'cards'; post: CardsPostData } & CardsOverrides)
  | ({ template: 'report'; post: ReportPostData } & ReportOverrides)
  // Long-form takes no overrides: its content is a parsed export, not fields
  // an editor fills in, so there is nothing for the admin canvas to hook.
  | { template: 'longform'; post: LongformPostData }

/**
 * Dispatches to the right template component for `posts.template`.
 *
 * Each template is a structurally distinct
 * component — not a color-mix on one shared layout — so this is a thin
 * switch, not a shared render tree.
 */
export function PostRenderer(props: PostRendererProps) {
  if (props.template === 'cards') {
    const { template: _template, post, ...overrides } = props
    return <Cards post={post} {...overrides} />
  }
  if (props.template === 'longform') {
    return <Longform post={props.post} />
  }
  if (props.template === 'report') {
    const { template: _template, post, ...overrides } = props
    return <Report post={post} {...overrides} />
  }
  const { template: _template, post, ...overrides } = props
  return <Article post={post} {...overrides} />
}
