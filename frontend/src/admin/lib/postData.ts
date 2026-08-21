/**
 * What is left of the admin's own post handling: reading the `body` column,
 * naming the template, and making blank blocks for the report editor.
 *
 * Turning a post into something a template can draw is no longer done here —
 * `lib/postToRenderer.ts` does it for the public journal and the admin alike,
 * so a preview cannot drift away from what ships.
 */
import type {
  ReportBlock,
  ReportChartPoint,
  ReportTable,
} from 'post-renderer'
import type { PostDetail, PostTemplate } from './apiClient'

/** `posts.template` can be null on old/incomplete rows; the site's real default is 'article'. */
export function resolveTemplate(post: Pick<PostDetail, 'template'>): PostTemplate {
  return post.template ?? 'article'
}

/** `body` is jsonb end to end — cast it to whatever shape this post's template actually holds. */
export function getBody<T>(post: Pick<PostDetail, 'body'>): T[] {
  return Array.isArray(post.body) ? (post.body as unknown as T[]) : []
}




/** A fresh, empty block of the given type — used by the Report editor's "+ thêm khối" insert menu. */
export function blankReportBlock(type: ReportBlock['type']): ReportBlock {
  switch (type) {
    case 'meta':
      return { type: 'meta', text: '' }
    case 'heading':
      return { type: 'heading', text: '' }
    case 'paragraph':
      return { type: 'paragraph', text: '' }
    case 'metrics':
      return { type: 'metrics', items: [{ label: '', value: '' }] }
    case 'chart':
      return { type: 'chart', points: blankChartPoints() }
    case 'table':
      return { type: 'table', table: blankTable() }
    case 'image':
      return { type: 'image', caption: '', imageUrl: null }
  }
}

function blankChartPoints(): ReportChartPoint[] {
  return [{ label: '', heightPct: 50 }]
}

function blankTable(): ReportTable {
  return { columns: ['Cột 1'], rows: [{ cells: [''] }] }
}
