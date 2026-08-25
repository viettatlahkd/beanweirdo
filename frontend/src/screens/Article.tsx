import { PostRenderer } from 'post-renderer'
import { usePost } from '../data/usePost'
import { postTitle } from '../lib/postText'
import {
  toArticleData,
  toCardsData,
  toLongformData,
  toMemoData,
  toReportData,
} from '../lib/postToRenderer'
import { usePublishedPosts } from '../data/usePublishedPosts'
import { useModules } from '../data/useModules'
import { ink, sans } from '../design/tokens'
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
            onClick={sibling ? () => nav.openArticle(sibling.id, nav.articleFrom) : undefined}
            style={{ cursor: sibling ? 'pointer' : 'default' }}
          >
            {label}
          </span>
        )
      }}
    />
  )
}
