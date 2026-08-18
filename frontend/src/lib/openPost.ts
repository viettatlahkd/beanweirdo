import type { PostTemplate } from '../data/usePublishedPosts'
import type { Nav } from './nav'

/**
 * Where a post row opens.
 *
 * Each post is written against one of three templates, and each template is its
 * own screen. Every listing routes through here so the reader lands on the
 * right one — and so the destination knows it was reached from a module, not
 * from Admin › Templates (see `Origin`).
 */
export function openPost(nav: Nav, post: { id: string; template: PostTemplate }): void {
  if (post.template === 'cards') {
    nav.goCards('module')
    return
  }
  if (post.template === 'report') {
    nav.goReport('module')
    return
  }
  nav.openArticle(post.id, 'module')
}
