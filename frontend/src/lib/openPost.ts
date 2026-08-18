import type { Nav } from './nav'

/**
 * Where a post row opens.
 *
 * Always the Article screen, whatever the template: it is the one renderer
 * that reads the post out of the database, and it already switches between
 * article / cards / report itself (see `screens/Article.tsx`).
 *
 * `screens/Cards.tsx` and `screens/Report.tsx` are a different thing — the
 * blank samples under Admin › Templates, carrying demo content. Routing a
 * real post at them showed the reader a made-up fruit tasting instead of the
 * post that was actually published.
 */
export function openPost(nav: Nav, post: { id: string }): void {
  nav.openArticle(post.id, 'module')
}
