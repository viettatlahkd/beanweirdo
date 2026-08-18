import type { PostRow } from '../data/usePublishedPosts'

/** Anything shaped enough to look for a picture in. */
type Thumbable = Pick<PostRow, 'hero_image_url' | 'body'>

/** The first `src` anywhere in a block tree, however the template nests them. */
function findSrc(value: unknown, depth = 0): string | null {
  if (depth > 4 || value === null || typeof value !== 'object') return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findSrc(item, depth + 1)
      if (found) return found
    }
    return null
  }

  const obj = value as Record<string, unknown>
  // `src` is what long-form figures carry; the other templates nest theirs.
  if (typeof obj.src === 'string' && obj.src) return obj.src
  if (typeof obj.imageUrl === 'string' && obj.imageUrl) return obj.imageUrl

  for (const key of ['fig', 'items', 'sections', 'blocks', 'cards']) {
    const found = findSrc(obj[key], depth + 1)
    if (found) return found
  }
  return null
}

/**
 * The picture that stands for a post in a listing.
 *
 * `hero_image_url` when the post has one, and otherwise the first image inside
 * its content — a piece with seven figures in it should not show a blank
 * swatch just because nobody set a separate cover. Null means there is genuinely
 * no picture, and the caller draws its tinted block instead.
 */
export function postThumbnail(post: Thumbable): string | null {
  return post.hero_image_url || findSrc(post.body)
}
