import { PostRenderer } from 'post-renderer'
import { useIsMobile } from '../lib/useIsMobile'
import { usePost } from '../data/usePost'
import { postTitle, readMinutes } from '../lib/postText'
import {
  toArticleData,
  toBitesizeData,
  toCardsData,
  toLongformData,
  toMemoData,
  toReportData,
} from '../lib/postToRenderer'
import { findPage, useModules, usePagePosts } from '../data/useModules'
import { ink, sans } from '../design/tokens'
import { useNav } from '../lib/nav'
import { usePostAuthors } from '../data/usePostAuthors'
import { AuthorCard } from '../components/Byline'
import { PostHead } from '../components/PostHead'
import { shownOn } from '../portfolio/blocks'
import { PostRail, type Homes } from './PostRail'

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
/**
 * A post, in whichever of the 3 real templates it's stored as. Data comes
 * from Supabase (`posts` + its module), the actual rendering
 * goes entirely through `post-renderer` for true WYSIWYG parity with the
 * admin app's preview.
 *
 * Beside it, a rail that leads back through the door the reader came in by
 * and lists the post's own headings (`PostRail`). `homes` names biz's and
 * bean's home pages for that way back.
 */
export function Article({ homes }: { homes?: Homes } = {}) {
  const mobile = useIsMobile()
  const nav = useNav()
  const { data: modules, tagsOf } = useModules()

  // The sidebar's static "sample post" link has no id to hand over — fall
  // back to the module's first published post. Looking one up by `posts.n`
  // used to work here, but that column is the authoring order, so a single
  // archive or reorder would have pointed this at nothing.
  const needsFallback = !nav.postId
  const fallback = usePagePosts(needsFallback ? 'biochem' : null)
  const fallbackId = fallback.data[0]?.id ?? null
  const effectivePostId = nav.postId ?? fallbackId

  const { data: post, loading, error } = usePost(effectivePostId)
  const authors = usePostAuthors(effectivePostId)

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

  const module_ = findPage(modules, post.module_id)
  const moduleTitle = module_?.title ?? post.module_id
  // Every template opens with the same head: cover, title, properties. The
  // renderer package knows nothing about the site, so the app hands it the
  // finished element and the template draws only the body under it.
  const head = (
    <PostHead
      title={postTitle(post)}
      lead={post.lead}
      cover={post.hero_image_url}
      authors={authors}
      topic={module_?.title}
      tags={tagsOf?.(post.id) ?? []}
      shownOn={shownOn(post)}
      publishedAt={post.status === 'published' ? post.published_at : null}
      minutes={readMinutes(post.body)}
      template={post.template}
    />
  )
  const footer = <AuthorCard authors={authors} />

  const body =
    post.template === 'bitesize' ? (
      <PostRenderer template="bitesize" post={toBitesizeData(post, { mod: module_, tag: tagsOf?.(post.id)[0]?.label })} head={head} footer={footer} mobile={mobile} />
    ) : post.template === 'memo' ? (
      <PostRenderer template="memo" post={toMemoData(post, module_)} head={head} footer={footer} mobile={mobile} />
    ) : post.template === 'longform' ? (
      <PostRenderer template="longform" post={toLongformData(post, module_)} head={head} footer={footer} mobile={mobile} />
    ) : post.template === 'cards' ? (
      <PostRenderer template="cards" post={toCardsData(post, module_)} head={head} footer={footer} mobile={mobile} />
    ) : post.template === 'report' ? (
      <PostRenderer template="report" post={toReportData(post, module_)} head={head} footer={footer} mobile={mobile} />
    ) : (
      <PostRenderer
        mobile={mobile}
        template="article"
        post={toArticleData(post, moduleTitle, [], -1, module_)}
        head={head}
        footer={footer}
      />
    )

  return (
    <PostRail key={post.id} from={nav.articleFrom ?? 'module'} module={module_} homes={homes} mobile={mobile}>
      {body}
    </PostRail>
  )
}
