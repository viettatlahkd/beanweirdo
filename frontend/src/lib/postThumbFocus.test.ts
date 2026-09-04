import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
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

  it('không chỗ nào vẽ ảnh bài bằng center/cover viết tay nữa', () => {
    for (const f of ['frontend/src/screens/ModuleScreen.tsx', 'frontend/src/screens/Notes.tsx']) {
      const src = readFileSync(f, 'utf8')
      const handwritten = src
        .split('\n')
        .filter((l) => /postThumbnail\(/.test(l) && /center\/cover/.test(l))
      expect(handwritten, `${f} còn vẽ ảnh bài bằng center/cover`).toEqual([])
    }
  })
})
