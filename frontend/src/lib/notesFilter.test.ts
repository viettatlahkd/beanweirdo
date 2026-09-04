import { describe, expect, it } from 'vitest'
import { noteFilterBar, tagColor } from './notesFilter'

/*
 * Một bộ từ vựng cho cả trang Ghi chép.
 *
 * Trước đây hai bên có hai danh sách: bốn dạng ghi viết cứng trong code cho
 * ghi chép, bốn tag khác trong bảng cho bài đăng. Cùng một trang mà hai thứ
 * tiếng — "tất cả" nói một con số trong khi màn hình bày một con số khác, và
 * bấm một chip thì ghi chép biến mất còn bài vẫn nằm nguyên đó.
 */
const tags = [{ label: 'quan sát' }, { label: 'video' }, { label: 'essay' }, { label: 'log' }]
const notes = [{ k: 'quan sát' }, { k: 'video' }, { k: 'video' }]
const posts = [{ kind: 'video' }, { kind: 'essay' }]

describe('thanh lọc trang Ghi chép', () => {
  it('một chip đếm cả ghi chép lẫn bài mang tag ấy', () => {
    const { chips } = noteFilterBar(notes, posts, tags, 'tất cả')
    expect(chips.find((c) => c.f === 'video')?.n).toBe(3) // 2 ghi chép + 1 bài
    expect(chips.find((c) => c.f === 'essay')?.n).toBe(1) // chỉ bài
    expect(chips.find((c) => c.f === 'tất cả')?.n).toBe(5)
  })

  it('lọc thì lọc cả hai phía', () => {
    const bar = noteFilterBar(notes, posts, tags, 'video')
    expect(bar.visibleNotes).toHaveLength(2)
    expect(bar.visiblePosts).toEqual([{ kind: 'video' }])
  })

  it('chỉ bày tag đang có thứ đeo nó', () => {
    // Bộ từ vựng dùng chung cho cả trang, nên nó chứa cả tag của bài không nằm
    // ở đây. Bày hết thì thanh lọc thành một hàng chip số không kéo dài.
    const { chips } = noteFilterBar(notes, posts, tags, 'tất cả')
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
