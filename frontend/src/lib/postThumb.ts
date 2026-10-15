import type { PostRow } from '../data/usePublishedPosts'
import { readFocus, withFocus } from './imageFocus'

/** Anything shaped enough to know what picture stands for it. */
type Thumbable = Pick<PostRow, 'hero_image_url' | 'thumbnail_url'>

/**
 * The picture that stands for a post in a listing.
 *
 * `hero_image_url` when the post has one, and otherwise the first image inside
 * its content — a piece with seven figures in it should not show a blank
 * swatch just because nobody set a separate cover. Null means there is genuinely
 * no picture, and the caller draws its tinted block instead.
 *
 * Nửa sau từng được tính ngay tại đây bằng cách lần vào `body`, và đó là lý do
 * mọi danh sách phải kéo cả thân bài về. Nay nó là cột `posts.thumbnail_url`,
 * tính lúc **ghi** bài — xem `backend/lib/posts.ts` → `firstImageIn`.
 */
export function postThumbnail(post: Thumbable): string | null {
  // `?? null` ở cuối: một hàng lấy về bằng `withBody` hay một hàng dựng trong
  // bài kiểm có thể không mang cột này, và chỗ gọi phân biệt "không có ảnh"
  // bằng `null` chứ không bằng `undefined`.
  const url = post.hero_image_url || post.thumbnail_url || null
  /*
   * A listing cell has its own shape, not the one the photo was cut for, so a
   * crop's zoom would leave it half empty. It keeps the crop's window as a
   * focal point instead and fills the cell.
   */
  return url && withFocus(url, readFocus(url))
}
