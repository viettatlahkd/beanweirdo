import { describe, expect, it } from 'vitest'
import { postThumbnail } from './postThumb'

const thumb = (hero: string | null, stored: string | null | undefined) =>
  postThumbnail({ hero_image_url: hero, thumbnail_url: stored } as never)

/*
 * Phép chọn ảnh không đổi: bìa trước, rồi ảnh trong bài. Đổi ở chỗ **ai tính
 * nửa sau**. Trước đây hàm này tự lần vào `body`, và vì thế mọi danh sách phải
 * kéo cả thân bài của mọi bài về. Nay nửa sau là cột `posts.thumbnail_url`,
 * tính lúc ghi bài — phần lần vào thân bài có bài kiểm riêng ở
 * `backend/lib/posts.test.ts` → `describe('firstImageIn')`.
 */
describe('postThumbnail', () => {
  it('prefers the post’s own cover', () => {
    expect(thumb('/hero.png', '/inside.png')).toBe('/hero.png')
  })

  it('falls back to the picture stored from the body', () => {
    // Seven figures in the piece and no cover set — showing a blank swatch
    // would be a choice nobody made.
    expect(thumb(null, '/first.png')).toBe('/first.png')
  })

  it('returns null when the post genuinely has no picture', () => {
    // The lexicon is all text; the caller draws its tint instead.
    expect(thumb(null, null)).toBeNull()
  })

  it('returns null, not undefined, for a row fetched without the column', () => {
    // `null` là thứ chỗ gọi phân biệt "không có ảnh"; `undefined` lọt qua một
    // phép so sánh `=== null` và vẽ ra ô ảnh rỗng.
    expect(thumb(null, undefined)).toBeNull()
  })
})
