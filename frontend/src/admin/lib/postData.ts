/**
 * What is left of the admin's own post handling: reading the `body` column,
 * naming the template, and making blank blocks for the report editor.
 *
 * Turning a post into something a template can draw is no longer done here —
 * `lib/postToRenderer.ts` does it for the public journal and the admin alike,
 * so a preview cannot drift away from what ships.
 */
import { getElement, type ReportBlock } from 'post-renderer'
import type { PostDetail, PostTemplate } from './apiClient'

/** `posts.template` can be null on old/incomplete rows; the site's real default is 'article'. */
export function resolveTemplate(post: Pick<PostDetail, 'template'>): PostTemplate {
  return post.template ?? 'article'
}

/** `body` is jsonb end to end — cast it to whatever shape this post's template actually holds. */
export function getBody<T>(post: Pick<PostDetail, 'body'>): T[] {
  return Array.isArray(post.body) ? (post.body as unknown as T[]) : []
}




/**
 * A fresh, empty block of the given type — from the store, not from here.
 *
 * This used to be its own switch, which meant a new element had to be added in
 * two places and could disagree with itself. The store owns what a blank one
 * looks like now; this is the door the admin already knocks on.
 */
export function blankReportBlock(type: string): ReportBlock {
  const element = getElement(type)
  if (!element) throw new Error(`Không có element '${type}' trong kho`)
  return element.blank() as ReportBlock
}
