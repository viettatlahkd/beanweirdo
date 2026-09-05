import type { ReactNode } from 'react'
import { Article, type ArticleOverrides } from './Article'
import { Cards, type CardsOverrides } from './Cards'
import { Longform, type LongformEdit } from './Longform'
import { Memo, type MemoOverrides } from './Memo'
import { Report, type ReportOverrides } from './Report'
import type {
  ArticlePostData,
  CardsPostData,
  LongformPostData,
  MemoPostData,
  ReportPostData,
} from './types'

/**
 * Supplied by the app and handed to whichever template renders — see below.
 *
 * `mobile` là **prop**, không phải thứ package tự đo.
 *
 * Package đọc bề ngang màn thì mọi chỗ vẽ khuôn bài đều bị kéo theo, kể cả
 * những chỗ không muốn — ô xem trước và khung sửa trong CMS nằm trong một khung
 * hẹp trong khi cửa sổ vẫn rộng. Chỗ gọi mới là chỗ duy nhất biết khung thật
 * rộng bao nhiêu, nên chỗ gọi quyết định.
 *
 * Mặc định `false`, và **khu admin cố ý không truyền gì**: chủ site chốt admin
 * không có bản điện thoại. Đúng hai chỗ truyền, cả hai đều là trang công khai —
 * `screens/Article.tsx` và `screens/Notes.tsx`.
 */
type Chrome = { breadcrumb?: ReactNode; mobile?: boolean }

export type PostRendererProps = Chrome &
  (
  | ({ template: 'article'; post: ArticlePostData } & ArticleOverrides)
  | ({ template: 'cards'; post: CardsPostData } & CardsOverrides)
  | ({ template: 'report'; post: ReportPostData } & ReportOverrides)
  // Long-form used to take no overrides, on the grounds that its content is a
  // parsed export rather than fields an editor fills in. The result was the
  // longest piece on the site being the one nobody could fix a typo in.
  | ({ template: 'longform'; post: LongformPostData } & LongformEdit)
  // Memo belongs to Ghi 01 rather than to a module, but it is a template like
  // the rest — and the admin edits it in place, so it takes overrides too.
  | ({ template: 'memo'; post: MemoPostData } & MemoOverrides)
  )

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
    // Liệt kê từng móc một là chỗ để quên: `wrapBlock` và `renderAfterBlocks`
    // thêm vào `LongformEdit` mà không được chuyển tiếp thì khung sửa im lặng
    // không có gì, và không có lỗi nào để lần ra.
    const { template: _template, post, ...rest } = props
    return <Longform post={post} {...rest} />
  }
  if (props.template === 'memo') {
    const { template: _template, post, ...overrides } = props
    return <Memo post={post} {...overrides} />
  }
  if (props.template === 'report') {
    const { template: _template, post, ...overrides } = props
    return <Report post={post} {...overrides} />
  }
  const { template: _template, post, ...overrides } = props
  return <Article post={post} {...overrides} />
}
