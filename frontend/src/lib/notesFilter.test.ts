import { describe, expect, it } from 'vitest'
import { noteFilterBar, tagColor } from './notesFilter'

/*
 * Một bộ từ vựng, và giờ là một loại thứ, cho cả trang Ghi chép.
 *
 * Trước đây hai bên có hai danh sách: bốn dạng ghi viết cứng trong code cho ghi
 * chép, bốn tag khác trong bảng cho bài đăng. Cùng một trang mà hai thứ tiếng.
 * Bước một là cho cả hai đọc chung bảng `tags`; bước hai là bỏ hẳn bên ghi chép
 * — một ghi chép dưới Ghi 01 chính là một bài đăng dưới Ghi 01. Nên thanh này
 * chỉ còn đếm và lọc bài.
 */
const tags = [{ label: 'quan sát' }, { label: 'video' }, { label: 'essay' }, { label: 'log' }]
const posts = [{ kind: 'video' }, { kind: 'video' }, { kind: 'essay' }, { kind: 'quan sát' }]

describe('thanh lọc trang Ghi chép', () => {
  it('mỗi chip đếm số bài mang tag ấy', () => {
    const { chips } = noteFilterBar(posts, tags, 'tất cả')
    expect(chips.find((c) => c.f === 'video')?.n).toBe(2)
    expect(chips.find((c) => c.f === 'essay')?.n).toBe(1)
    expect(chips.find((c) => c.f === 'tất cả')?.n).toBe(4)
  })

  it('bấm một chip thì chỉ còn bài mang tag ấy', () => {
    const bar = noteFilterBar(posts, tags, 'video')
    expect(bar.visiblePosts).toEqual([{ kind: 'video' }, { kind: 'video' }])
  })

  it('chỉ bày tag đang có bài đeo nó', () => {
    // Bộ từ vựng dùng chung cho cả trang, nên nó chứa cả tag của bài không nằm
    // ở đây. Bày hết thì thanh lọc thành một hàng chip số không kéo dài.
    const { chips } = noteFilterBar(posts, tags, 'tất cả')
    expect(chips.map((c) => c.f)).toEqual(['tất cả', 'quan sát', 'video', 'essay'])
  })

  it('tag mới cũng có màu, và luôn là một màu', () => {
    // Bốn dạng ghi đầu có mực do bên design đặt; tag tự thêm lấy màu theo tên,
    // nên không đổi màu mỗi lần tải trang.
    expect(tagColor('quan sát')).toBe('#B65A3C')
    expect(tagColor('hạt')).toBe(tagColor('hạt'))
    expect(tagColor('hạt')).toMatch(/^#[0-9A-F]{6}$/i)
  })
})
