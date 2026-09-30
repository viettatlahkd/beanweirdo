import type { ModuleRow } from '../data/useModules'
import type { PostRow } from '../data/usePublishedPosts'
import { childrenOf } from './contentTree'
import { postDescription } from './postText'
import { postThumbnail } from './postThumb'

/**
 * What a module's table of contents holds.
 *
 * It used to hold posts and nothing else. That is the last place the site was
 * still two levels deep: `parent_id` exists, the sidebar and the trail already
 * walk it, but opening bean weirdo ran a query for posts filed directly under
 * it — none — and drew an empty page over the branch holding everything.
 *
 * A row is a module or a post, and the two are the same shape on screen: a
 * thumbnail, a name, a line under it, three small facts. `ModuleScreen` writes
 * that row three times over, once per layout, so the difference between the
 * two kinds is decided here instead of six times there.
 */
type Entry =
  | { type: 'module'; id: string; module: ModuleRow }
  | { type: 'post'; id: string; post: PostRow }

/** A row reduced to what every layout draws, so none of them reads a row's kind. */
export type EntryView = {
  id: string
  type: 'module' | 'post'
  title: string
  description: string
  /** Middle of the meta line: what this row is. */
  label: string
  /** End of the meta line: a post's date, a branch's subject. */
  trailing: string
  /** Thumbnail image, or null to fall back to `tint`. */
  image: string | null
  /** Thumbnail colour when there is no image. */
  tint: string
}

/**
 * The rows of a module's page: the modules filed inside it, then its own posts.
 *
 * Branches first because they are sections and the posts are loose pages —
 * the same order the sidebar draws, and the order the owner's sketch shows.
 *
 * `modules` is expected already filtered and sorted the way the screen wants
 * (`indexModules` does both), for the same reason `childrenOf` keeps input
 * order: a private module must not reappear here just because something is
 * filed under it.
 */
export function entriesOf(
  moduleId: string,
  modules: readonly ModuleRow[],
  posts: readonly PostRow[],
): Entry[] {
  const branches: Entry[] = childrenOf(modules, moduleId).map((module) => ({
    type: 'module',
    id: module.id,
    module,
  }))
  const filed: Entry[] = posts.map((post) => ({ type: 'post', id: post.id, post }))
  return [...branches, ...filed]
}

/**
 * How a row reads, and what colour it carries when it has no picture.
 *
 * A branch takes its own accent rather than a tint from the module above it.
 * Rule 01 makes a module's colour the thing it is recognised by before its
 * name is read, so a row that opens bean weirdo has to look like bean weirdo,
 * not like a page of the module it happens to be sitting in.
 */
export function entryViews(entries: readonly Entry[], m: ModuleRow): EntryView[] {
  // Posts alternate the module's two tints so consecutive blank thumbnails
  // differ; branches are not in that run, and counting them into it would put
  // two identical tints side by side further down.
  let filed = 0
  return entries.map((e) => {
    if (e.type === 'module') {
      return {
        id: e.id,
        type: 'module',
        title: e.module.title,
        description: e.module.blurb,
        label: 'mục lục',
        trailing: e.module.concept,
        image: e.module.img1,
        tint: e.module.accent,
      }
    }
    const tint = filed++ % 2 === 0 ? m.tint : m.tint2
    return {
      id: e.id,
      type: 'post',
      title: e.post.en,
      description: postDescription(e.post),
      label: e.post.kind,
      trailing: e.post.date_label,
      image: postThumbnail(e.post),
      tint,
    }
  })
}
