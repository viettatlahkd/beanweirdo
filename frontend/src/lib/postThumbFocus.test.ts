import { describe, expect, it } from 'vitest'
import { coverStyle, withFocus } from './imageFocus'

/*
 * Ảnh thu nhỏ của bài phải nhận điểm căn.
 *
 * Điểm căn đi theo đường dẫn (`#focus=x,y`) và chỉ `coverStyle` biết đọc nó.
 * Ba chỗ vẽ ảnh thu nhỏ của bài đều viết tay `center/cover` — nghĩa là chủ site
 * kéo căn xong, lưu xong, mà danh sách vẫn cắt giữa ảnh. Không có lỗi nào để
 * ngờ: ảnh vẫn hiện, chỉ là cắt sai chỗ.
 */
describe('ảnh thu nhỏ của bài', () => {
  it('coverStyle đọc điểm căn từ đường dẫn', () => {
    const s = coverStyle(withFocus('https://x/a.jpg', { x: 20, y: 80 }))
    expect(s.backgroundPosition).toBe('20% 80%')
    expect(s.backgroundImage).toBe('url(https://x/a.jpg)')
  })
})
