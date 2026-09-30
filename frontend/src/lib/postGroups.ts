import type { TreeRow } from './contentTree'
import { descendantIds } from './contentTree'

/**
 * Which posts belong to which module.
 *
 * This was written twice, character for character, in `Landing.tsx` and
 * `IndexScreen.tsx` — the two screens that lay out the table of contents. Two
 * copies of the same six lines is two places for the answer to drift, and the
 * pair of them is why a third level had nowhere to be added: the shape they
 * both return, `Map<moduleId, PostRow[]>`, is one key and one list, with no
 * room in it for a module that holds another module.
 */

/** The little this file needs to know about a post. */
type FiledPost = { module_id: string }

/**
 * Posts filed directly under each module, keeping the order they came in.
 *
 * Directly: a post under Roasting does not appear under bean weirdo here. The
 * surfaces that want the whole branch ask `postsUnder` instead, so each one
 * says which of the two it means rather than both reading the same map and
 * hoping.
 */
export function groupByModule<P extends FiledPost>(posts: readonly P[]): Map<string, P[]> {
  const map = new Map<string, P[]>()
  for (const p of posts) {
    const list = map.get(p.module_id)
    if (list) list.push(p)
    else map.set(p.module_id, [p])
  }
  return map
}

/**
 * Every post filed anywhere beneath `moduleId`, including in it.
 *
 * The question a flat table could not be asked. A branch page ("bean weirdo")
 * holds no posts of its own and would otherwise read as empty, while
 * everything written under it sits one level down.
 */
export function postsUnder<P extends FiledPost, T extends TreeRow>(
  posts: readonly P[],
  modules: readonly T[],
  moduleId: string,
): P[] {
  const under = new Set(descendantIds(modules, moduleId))
  return posts.filter((p) => under.has(p.module_id))
}

/**
 * How many posts to show beside a module's name.
 *
 * Counts the whole branch, because a heading that holds two sub-sections of
 * six posts each reads as empty if it only counts its own.
 */
export const countUnder = <P extends FiledPost, T extends TreeRow>(
  posts: readonly P[],
  modules: readonly T[],
  moduleId: string,
): number => postsUnder(posts, modules, moduleId).length
