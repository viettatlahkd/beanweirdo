/**
 * Adapters between the admin-api's flat `PostDetail` shape and each
 * post-renderer template's rich, template-specific data shape.
 *
 * The DB only tracks a handful of fields shared by every template (en,
 * lead, pullQuote, furtherReading, heroImageUrl, heroCaption) plus an
 * arbitrary `body` jsonb column whose real shape depends on `posts.template`
 * (SectionData[] for article, CardData[] for cards, ReportBlock[] for
 * report) — even though apiClient's TS type narrows `body` to
 * `SectionData[] | null` purely for convenience (see backend/admin-api/lib/posts.ts,
 * where the column is `unknown` end to end). These adapters bridge that gap
 * so the editor/preview can hand the real post-renderer components data
 * shaped exactly the way they expect.
 *
 * Fields the post-renderer types need but the API doesn't track per-post
 * (decorative plate captions, "related" links, the eyebrow micro-label) get
 * sensible, clearly-non-fabricated defaults — empty strings/arrays, or a
 * value derived from a real field (e.g. `dateLabel` as the eyebrow). None of
 * that is presented as editable content that doesn't actually round-trip to
 * the API.
 */
import type {
  ArticlePlateData,
  ArticlePostData,
  CardData,
  CardsPostData,
  ReportBlock,
  ReportChartPoint,
  ReportPostData,
  ReportTable,
  SectionData,
} from 'post-renderer'
import type { Module, PostDetail, PostTemplate } from '../../../lib/apiClient'

/** `posts.template` can be null on old/incomplete rows; the site's real default is 'article'. */
export function resolveTemplate(post: Pick<PostDetail, 'template'>): PostTemplate {
  return post.template ?? 'article'
}

/** `body` is jsonb end to end — cast it to whatever shape this post's template actually holds. */
export function getBody<T>(post: Pick<PostDetail, 'body'>): T[] {
  return Array.isArray(post.body) ? (post.body as unknown as T[]) : []
}

export function toArticleData(post: PostDetail, mod: Module | undefined): ArticlePostData {
  const tint = mod?.tint ?? '#F3DCAE'
  const tint2 = mod?.tint2 ?? tint
  const plate = (caption: string, imageUrl: string | null | undefined, t: string): ArticlePlateData => ({
    caption,
    tint: t,
    imageUrl: imageUrl ?? null,
  })

  return {
    eyebrow: post.dateLabel,
    moduleTitle: mod?.title ?? post.moduleId,
    title: post.en,
    lead: post.lead ?? '',
    platePrimary: plate(post.heroCaption ?? '', post.heroImageUrl, tint),
    plateSecondary: plate('', null, tint2),
    heroPlate: plate(post.heroCaption ?? '', post.heroImageUrl, tint),
    sections: getBody<SectionData>(post),
    pull: post.pullQuote ?? '',
    relatedHeading: 'Liên quan',
    related: [],
    detailPlate: plate('', null, tint2),
    furtherReadingHeading: 'Đọc thêm',
    furtherReading: post.furtherReading ?? [],
  }
}

export function toCardsData(post: PostDetail): CardsPostData {
  return {
    title: post.en,
    intro: post.lead ? [post.lead] : [],
    cards: getBody<CardData>(post),
  }
}

export function toReportData(post: PostDetail): ReportPostData {
  return {
    title: post.en,
    blurb: post.lead ?? undefined,
    blocks: getBody<ReportBlock>(post),
  }
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
