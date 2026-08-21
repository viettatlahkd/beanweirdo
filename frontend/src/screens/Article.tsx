import { PostRenderer } from 'post-renderer'
import type {
  ArticlePostData,
  CardData,
  CardsPostData,
  LongformBlock,
  LongformPostData,
  MemoPostData,
  ReportBlock,
  ReportPostData,
  SectionData,
} from 'post-renderer'
import { usePost } from '../data/usePost'
import { displayNumber, postDescription, postTitle } from '../lib/postText'
import type { ModuleRow } from '../data/useModules'
import type { PostRow } from '../data/usePublishedPosts'
import { usePublishedPosts } from '../data/usePublishedPosts'
import { useModules } from '../data/useModules'
import { garden, ink, sans } from '../design/tokens'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { useNav } from '../lib/nav'

const status = {
  fontFamily: sans,
  fontSize: 11,
  letterSpacing: '.1em',
  textTransform: 'uppercase' as const,
  color: ink.muted,
  padding: '140px 56px',
}

/**
 * The site's decorative "no real photo yet" swatches. `posts` only carries
 * one photo/caption pair (`hero_image_url` / `hero_caption`) — there's no DB
 * field for the article template's other three plates, so those fall back to
 * the same tints the static prototype used, with a generic caption instead
 * of the old hardcoded (CGA-specific) one.
 */
const PLATE_FALLBACK = {
  hero: { tint: garden.blush, caption: 'ảnh mở đầu — chưa có ảnh' },
  primary: { tint: garden.leafTint, caption: 'ảnh chính — chưa có ảnh' },
  secondary: { tint: garden.honeyTint, caption: 'ảnh phụ — chưa có ảnh' },
  detail: { tint: garden.leafTint, caption: 'chi tiết — chưa có ảnh' },
} as const

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

function toArticleData(
  post: PostRow,
  moduleTitle: string,
  related: PostRow[],
  /** Place in the module's published list; -1 while that list is still loading. */
  position: number,
  mod: ModuleRow | undefined,
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
    band: mod ? { bg: mod.accent, fg: mod.on_color } : undefined,
  }
}

/**
 * A post written on the memo template.
 *
 * Its structure lives in `body` like every other template's, so a memo is an
 * ordinary post distinguished only by which renderer reads it.
 */
function toMemoData(post: PostRow, mod: ModuleRow | undefined): MemoPostData {
  const body = (post.body ?? {}) as Partial<MemoPostData>
  return {
    title: postTitle(post),
    subtitle: body.subtitle ?? postDescription(post),
    specs: body.specs,
    img: post.hero_image_url,
    imgCaption: post.hero_caption ?? undefined,
    sections: body.sections ?? [],
    band: mod ? { bg: mod.accent, fg: mod.on_color } : undefined,
  }
}

/**
 * A post written on the long-form template.
 *
 * The blocks are a parsed export, stored as they came; only the title and the
 * line under it come from the post's own fields, so the piece can be retitled
 * without touching its content.
 */
function toLongformData(post: PostRow, mod: ModuleRow | undefined): LongformPostData {
  return {
    title: postTitle(post),
    subtitle: postDescription(post),
    blocks: Array.isArray(post.body) ? (post.body as LongformBlock[]) : [],
    band: mod ? { bg: mod.accent, fg: mod.on_color } : undefined,
  }
}

/**
 * A post written on the cards template.
 *
 * The colour block takes the module's accent, never the template's own — a
 * template is a blank, and filling it in under a module means wearing that
 * module's colours (System conventions, rule 09).
 */
function toCardsData(post: PostRow, mod: ModuleRow | undefined): CardsPostData {
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
    band: mod ? { bg: mod.accent, fg: mod.on_color } : undefined,
    groupHues,
  }
}

/** No real "report" content is seeded yet — structurally wired so it can't crash. */
function toReportData(post: PostRow, mod: ModuleRow | undefined): ReportPostData {
  const blocks = Array.isArray(post.body) && post.body.length > 0 ? (post.body as ReportBlock[]) : EMPTY_REPORT_BLOCKS
  return {
    title: post.en,
    blurb: post.vi,
    blocks,
    band: mod ? { bg: mod.accent, fg: mod.on_color } : undefined,
  }
}

/**
 * A post, in whichever of the 3 real templates it's stored as. Data comes
 * from Supabase (`posts` + its module + its siblings), the actual rendering
 * goes entirely through `post-renderer` for true WYSIWYG parity with the
 * admin app's preview.
 */
export function Article() {
  const nav = useNav()
  const { data: modules } = useModules()

  // The sidebar's static "sample post" link has no id to hand over — fall
  // back to the module's first published post. Looking one up by `posts.n`
  // used to work here, but that column is the authoring order, so a single
  // archive or reorder would have pointed this at nothing.
  const needsFallback = !nav.postId
  const fallback = usePublishedPosts({ moduleId: 'biochem', enabled: needsFallback })
  const fallbackId = fallback.data[0]?.id ?? null
  const effectivePostId = nav.postId ?? fallbackId

  const { data: post, loading, error } = usePost(effectivePostId)
  const siblings = usePublishedPosts({ moduleId: post?.module_id, enabled: Boolean(post?.module_id) })

  if (needsFallback && fallback.loading) {
    return <div style={status}>Đang tải…</div>
  }
  if (!effectivePostId) {
    return <div style={status}>Không tìm thấy bài viết.</div>
  }
  if (loading) {
    return <div style={status}>Đang tải…</div>
  }
  if (error) {
    return <div style={status}>Không tải được bài viết.</div>
  }
  if (!post) {
    return <div style={status}>Không tìm thấy bài viết.</div>
  }

  const module_ = modules.find((m) => m.id === post.module_id)
  // Every template gets the same trail back. The renderer package knows
  // nothing about routing, so the app hands it the finished element.
  const crumbs = (
    <Breadcrumbs style={{ opacity: 0.75 }} trailing={postTitle(post)} moduleId={post.module_id} />
  )
  const moduleTitle = module_?.title ?? post.module_id

  if (post.template === 'memo') {
    return <PostRenderer template="memo" post={toMemoData(post, module_)} breadcrumb={crumbs} />
  }
  if (post.template === 'longform') {
    return <PostRenderer template="longform" post={toLongformData(post, module_)} breadcrumb={crumbs} />
  }
  if (post.template === 'cards') {
    return <PostRenderer template="cards" post={toCardsData(post, module_)} breadcrumb={crumbs} />
  }
  if (post.template === 'report') {
    return <PostRenderer template="report" post={toReportData(post, module_)} breadcrumb={crumbs} />
  }

  const related = siblings.data.filter((p) => p.id !== post.id)
  const position = siblings.data.findIndex((p) => p.id === post.id)

  return (
    <PostRenderer
      template="article"
      post={toArticleData(post, moduleTitle, related, position, module_)}
      breadcrumb={crumbs}
      renderEyebrow={(eyebrowModuleTitle) => (
        <span onClick={() => nav.openModule(post.module_id)} style={{ cursor: 'pointer' }}>
          ← {eyebrowModuleTitle}
        </span>
      )}
      renderRelatedItem={(label, i) => {
        const sibling = related[i]
        return (
          <span
            onClick={sibling ? () => nav.openArticle(sibling.id) : undefined}
            style={{ cursor: sibling ? 'pointer' : 'default' }}
          >
            {label}
          </span>
        )
      }}
    />
  )
}
