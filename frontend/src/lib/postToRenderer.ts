import { paletteFrom } from 'post-renderer'
import { toReportBlocks, toReportNotes } from './reportBlocks'
import type {
  ArticlePostData,
  CardsPostData,
  CardData,
  LongformBlock,
  LongformPostData,
  MemoPostData,
  ReportBlock,
  ReportPostData,
  SectionData,
} from 'post-renderer'
import { garden } from '../design/tokens'
import { displayNumber, postDescription, postTitle } from './postText'

/**
 * The one place a stored post becomes something a template can draw.
 *
 * There used to be two of these — one for the public journal, one for the
 * admin preview — because the two read the same post through different doors
 * and so met it under different field names. They drifted, as two copies of a
 * decision always do: the preview lost the module's colours, painted flavour
 * groups from the wrong palette, and took its opening line from another field
 * entirely, while a banner above it promised the reader was seeing exactly
 * what would ship.
 *
 * The API no longer renames columns on the way out, so both doors now open on
 * the same shape and neither side needs a bridge. This file is the only place
 * that decides how a stored post becomes something a template can draw.
 */

/** Stand-ins for pictures a post has not been given yet. */
const PLATE_FALLBACK = {
  hero: { tint: garden.blush, caption: 'ảnh mở đầu — chưa có ảnh' },
  primary: { tint: garden.leafTint, caption: 'ảnh chính — chưa có ảnh' },
  secondary: { tint: garden.honeyTint, caption: 'ảnh phụ — chưa có ảnh' },
  detail: { tint: garden.leafTint, caption: 'chi tiết — chưa có ảnh' },
} as const

/** What every template needs from a post, under the names the database uses. */
export type RenderablePost = {
  en: string
  vi: string
  lead: string | null
  kind: string
  date_label: string
  body: unknown
  hero_caption: string | null
  hero_image_url: string | null
  /** Màu riêng của bài; rỗng nghĩa là theo màu module — xem migration 0021. */
  theme_color?: string | null
  pull_quote: string | null
  further_reading: string[] | null
}

/** What every template needs from the module a post is filed under. */
export type RenderableModule = {
  title: string
  accent: string
  on_color: string
}

/**
 * The colour block at the head of a post — for every template, not just one.
 *
 * A post wears its module's colour; a post that was given a colour of its own
 * wears that instead. `on_color` only travels with the module's own colour: it
 * is the module's answer to "what reads on me", and it is the wrong answer for
 * some other colour. Left out, the renderer works one out.
 */
function bandOf(
  post: Pick<RenderablePost, 'theme_color'>,
  mod: RenderableModule | undefined,
): { bg: string; fg: string } | undefined {
  if (post.theme_color) return { bg: post.theme_color, fg: paletteFrom(post.theme_color).onAccent }
  return mod ? { bg: mod.accent, fg: mod.on_color } : undefined
}

const EMPTY_SECTIONS: SectionData[] = [
  { h: 'Chưa có nội dung', p: 'Bài viết này đang được biên soạn — quay lại sau nhé.' },
]

const EMPTY_REPORT_BLOCKS: ReportBlock[] = [
  { type: 'paragraph', text: 'Bài viết này đang được biên soạn — quay lại sau nhé.' },
]

/** "Chlorogenic Acids (CGA)" → title "Chlorogenic Acids ", italic "(CGA)" — same split the static version used. */
function splitTitle(en: string): { title: string; titleItalic?: string } {
  const match = en.match(/^(.*\S)\s+(\([^)]+\))$/)
  if (match) return { title: `${match[1]} `, titleItalic: match[2] }
  return { title: en }
}

export function toArticleData(
  post: RenderablePost,
  moduleTitle: string,
  related: RenderablePost[],
  /** Place in the module's published list; -1 while that list is still loading. */
  position: number,
  mod: RenderableModule | undefined,
): ArticlePostData {
  const { title, titleItalic } = splitTitle(post.en)
  const sections = Array.isArray(post.body) && post.body.length > 0 ? (post.body as SectionData[]) : EMPTY_SECTIONS

  return {
    // No number rather than a wrong one: until the sibling list arrives there
    // is no way to know where this post sits in it.
    eyebrow:
      position >= 0
        ? `${displayNumber(position)} — ${post.kind} — ${post.date_label}`
        : `${post.kind} — ${post.date_label}`,
    moduleTitle,
    title,
    titleItalic,
    lead: postDescription(post),
    platePrimary: { ...PLATE_FALLBACK.primary, imageUrl: null },
    plateSecondary: { ...PLATE_FALLBACK.secondary, imageUrl: null },
    heroPlate: {
      tint: PLATE_FALLBACK.hero.tint,
      caption: post.hero_caption ?? PLATE_FALLBACK.hero.caption,
      imageUrl: post.hero_image_url ?? null,
    },
    sections,
    pull: post.pull_quote ?? post.vi,
    relatedHeading: 'Trong module này',
    related: related.map((r) => ({ label: r.en })),
    detailPlate: { ...PLATE_FALLBACK.detail, imageUrl: null },
    furtherReadingHeading: 'Đọc thêm',
    furtherReading: post.further_reading ?? [],
    band: bandOf(post, mod),
  }
}

/**
 * A post written on the memo template.
 *
 * Its structure lives in `body` like every other template's, so a memo is an
 * ordinary post distinguished only by which renderer reads it.
 */
export function toMemoData(post: RenderablePost, mod: RenderableModule | undefined): MemoPostData {
  const body = (post.body ?? {}) as Partial<MemoPostData>
  return {
    title: postTitle(post),
    subtitle: body.subtitle ?? postDescription(post),
    specs: body.specs,
    img: post.hero_image_url,
    imgCaption: post.hero_caption ?? undefined,
    /*
     * Both shapes travel. A memo written since the store exists keeps its body
     * as one flat run of `elements`; one written before keeps `sections`, and
     * the renderer converts it. Carrying only `sections` — which this did —
     * left a post that had been edited once rendering as a blank page, in the
     * editor and on the site alike: the content was all there, and nothing on
     * either screen could reach it.
     */
    elements: body.elements,
    sections: body.sections ?? [],
    band: bandOf(post, mod),
  }
}

/**
 * A post written on the long-form template.
 *
 * The blocks are a parsed export, stored as they came; only the title and the
 * line under it come from the post's own fields, so the piece can be retitled
 * without touching its content.
 */
export function toLongformData(post: RenderablePost, mod: RenderableModule | undefined): LongformPostData {
  return {
    title: postTitle(post),
    subtitle: postDescription(post),
    blocks: Array.isArray(post.body) ? (post.body as LongformBlock[]) : [],
    band: bandOf(post, mod),
  }
}

/**
 * A post written on the cards template.
 *
 * The colour block takes the module's accent, never the template's own — a
 * template is a blank, and filling it in under a module means wearing that
 * module's colours (System conventions, rule 09).
 */
export function toCardsData(post: RenderablePost, mod: RenderableModule | undefined): CardsPostData {
  const cards = Array.isArray(post.body) ? (post.body as CardData[]) : []
  // Groups the deck doesn't lead with still need a colour in the filter bar.
  const groupHues: Record<string, string> = {}
  for (const c of cards) if (c.groups?.[0] && c.hue) groupHues[c.groups[0]] = c.hue

  return {
    title: post.en,
    // The header's side lines are the deck's references, not the post's own
    // subtitle — that belongs to `lead`, which the listings read.
    intro:
      cards.length > 0
        ? (post.further_reading ?? [postDescription(post)])
        : [postDescription(post), 'Chưa có mục nào trong glossary này.'],
    cards,
    band: bandOf(post, mod),
    groupHues,
  }
}

/** No real "report" content is seeded yet — structurally wired so it can't crash. */
export function toReportData(post: RenderablePost, mod: RenderableModule | undefined): ReportPostData {
  // Templates store blocks with short keys; the renderer wants the long ones.
  // Nothing translated here before, so a post started from a template arrived
  // with every block unreadable — see lib/reportBlocks.ts.
  const stored = toReportBlocks(post.body)
  const blocks = stored.length > 0 ? stored : EMPTY_REPORT_BLOCKS
  return {
    title: post.en,
    blurb: post.vi,
    blocks,
    // Names the field-note column; the colour comes from the band above.
    template: 'report',
    notes: toReportNotes(post.body),
    band: bandOf(post, mod),
  }
}
