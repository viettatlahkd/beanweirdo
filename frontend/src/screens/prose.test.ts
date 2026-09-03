import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { prose } from '../design/tokens'

/*
 * Chữ chủ site gõ trong ô nhiều dòng phải giữ chỗ xuống dòng.
 *
 * Ô soạn là `<textarea>` nên Enter tạo ra một dòng mới thật trong dữ liệu,
 * nhưng HTML mặc định gộp mọi khoảng trắng — chủ site gõ xuống dòng rồi mở
 * trang ra thấy hai đoạn dán liền nhau.
 *
 * `prose` đã có từ lâu và đã được áp ở vài chỗ. Bốn chỗ vẽ `long_desc` thì
 * không chỗ nào có — cùng một luật đúng ở nơi này, chưa ai mang sang nơi kia.
 * Đây là lần thứ tư kiểu lỗi ấy xuất hiện, nên kiểm cả họ thay vì kiểm từng
 * chỗ: mỗi lần vẽ chữ dài của chủ site đều phải mang `prose`.
 *
 * Đọc thẳng mã nguồn vì dựng đủ bốn màn hình trong test cần cả context điều
 * hướng lẫn dữ liệu module, mà thứ dễ rơi chỉ là một dòng trong `style`.
 */
const SCREENS = ['ModuleScreen', 'Landing', 'IndexScreen', 'DesignSystem'] as const

/** Chữ dài do chủ site gõ — không tính tiêu đề, tiêu đề là ô một dòng. */
const LONG_TEXT = /\{(?:m\.long_desc|m\.blurb|site\.blurb|site\.blurbShort|site\.artIntro)\}/g

describe('chữ chủ site gõ giữ được chỗ xuống dòng', () => {
  it('prose là pre-line', () => {
    expect(prose.whiteSpace).toBe('pre-line')
  })

  for (const name of SCREENS) {
    it(`${name}: mọi chỗ vẽ chữ dài đều mang prose`, () => {
      const src = readFileSync(`frontend/src/screens/${name}.tsx`, 'utf8')
      const spots = [...src.matchAll(LONG_TEXT)]
      expect(spots.length).toBeGreaterThan(0)
      for (const spot of spots) {
        // `style` của khối chứa nó nằm ngay phía trên chỗ vẽ chữ.
        const before = src.slice(Math.max(0, spot.index - 400), spot.index)
        const style = before.lastIndexOf('style=')
        expect(style, `${name}: ${spot[0]} không nằm trong khối có style`).toBeGreaterThan(-1)
        expect(before.slice(style), `${name}: ${spot[0]} thiếu prose`).toContain('...prose')
      }
    })
  }
})
