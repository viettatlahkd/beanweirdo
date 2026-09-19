import { describe, expect, it } from 'vitest'
import { plateImage, toArticleData } from './postToRenderer'
import type { RenderablePost } from './postToRenderer'

/*
 * Ba ô ảnh cố định của article — cặp ô mở đầu và ô vuông ở cột phải — trước
 * lượt này nhận thẳng `imageUrl: null` ngay trong `toArticleData`. Nghĩa là
 * chúng vẽ mảng màu mang chữ "chưa có ảnh" mãi mãi, dù chủ site có đặt ảnh
 * bằng đường nào đi nữa: không có cột nào để đặt vào.
 *
 * `plate_images` (migration 0027) là chỗ cất của chúng, đánh theo tên ô mà
 * chính khuôn bài đặt. Ảnh hero vẫn ở `hero_image_url` như cũ — nó đã có cột
 * riêng, và dọn nó vào đây là cho một cột hai nguồn.
 */
const post = (over: Partial<RenderablePost> = {}): RenderablePost => ({
  en: 'AI twin, viết hộ hay',
  vi: 'mô tả ngắn',
  lead: null,
  kind: 'essay',
  date_label: '2026.09.19',
  body: null,
  hero_caption: null,
  hero_image_url: null,
  pull_quote: null,
  further_reading: null,
  ...over,
})

const IMAGES = {
  primary: 'https://kho/anh-chinh.jpg',
  secondary: 'https://kho/anh-phu.jpg',
  detail: 'https://kho/chi-tiet.jpg',
}

describe('ảnh của các ô ảnh cố định', () => {
  it('ba ô của article lấy ảnh từ plate_images', () => {
    const d = toArticleData(post({ plate_images: IMAGES }), 'biochem', [], 0, undefined)
    expect(d.platePrimary.imageUrl).toBe(IMAGES.primary)
    expect(d.plateSecondary.imageUrl).toBe(IMAGES.secondary)
    expect(d.detailPlate.imageUrl).toBe(IMAGES.detail)
  })

  it('ô chưa có ảnh vẫn giữ nguyên mảng màu và chữ chờ', () => {
    const d = toArticleData(post({ plate_images: { primary: IMAGES.primary } }), 'biochem', [], 0, undefined)
    expect(d.platePrimary.imageUrl).toBe(IMAGES.primary)
    expect(d.plateSecondary.imageUrl).toBeNull()
    expect(d.plateSecondary.caption).toBe('ảnh phụ — chưa có ảnh')
  })

  /*
   * Database chưa chạy 0027 trả lời mà không có cột này, và danh sách bài công
   * khai cố ý không chọn nó. Cả hai trường hợp phải mở được bài, chỉ là chưa
   * ô nào có ảnh.
   */
  it('vắng cột thì đọc như chưa ô nào có ảnh', () => {
    const d = toArticleData(post(), 'biochem', [], 0, undefined)
    expect(d.platePrimary.imageUrl).toBeNull()
    expect(d.detailPlate.imageUrl).toBeNull()
  })

  it('hero vẫn ở cột riêng của nó, không lẫn vào plate_images', () => {
    const d = toArticleData(
      post({ hero_image_url: 'https://kho/bia.jpg', plate_images: { hero: 'https://kho/nham.jpg' } }),
      'biochem',
      [],
      0,
      undefined,
    )
    expect(d.heroPlate.imageUrl).toBe('https://kho/bia.jpg')
  })

  /* Gỡ ảnh ra ghi chuỗi rỗng; đọc ra phải là "chưa có ảnh", không phải "". */
  it('chuỗi rỗng đọc ra là chưa có ảnh', () => {
    expect(plateImage({ plate_images: { primary: '' } }, 'primary')).toBeNull()
    expect(plateImage({ plate_images: null }, 'primary')).toBeNull()
  })
})
