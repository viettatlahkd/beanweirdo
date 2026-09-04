import { describe, expect, it } from 'vitest'
import { noteFilterBar } from './notesFilter'
import type { Note } from '../content/notes'

/*
 * Bài đăng dưới Ghi 01 từng đứng ngoài mọi bộ đếm: "tất cả — 12" trong khi
 * trang bày 12 ghi chép *và* một bài, và bấm một dạng ghi thì ghi chép biến mất
 * còn bài vẫn nằm nguyên đó.
 */
const notes = [{ k: 'video' }, { k: 'video' }, { k: 'quan sát' }] as { k: Note['k'] }[]

describe('thanh lọc trang Ghi chép', () => {
  it('"tất cả" đếm cả bài đăng, không chỉ ghi chép', () => {
    expect(noteFilterBar(notes, 2, 'tất cả').chips.find((c) => c.f === 'tất cả')?.n).toBe(5)
  })

  it('mỗi dạng ghi đếm đúng ghi chép của nó', () => {
    const { chips } = noteFilterBar(notes, 2, 'tất cả')
    expect(chips.find((c) => c.f === 'video')?.n).toBe(2)
    expect(chips.find((c) => c.f === 'cảm nhận')?.n).toBe(0)
  })

  it('lọc theo một dạng ghi thì bài đăng lùi ra cùng', () => {
    // Bài mang từ vựng khác, không xếp được vào ô nào — để lại trên màn thì
    // thanh lọc trông như không ăn.
    expect(noteFilterBar(notes, 2, 'video').showFiled).toBe(false)
    expect(noteFilterBar(notes, 2, 'tất cả').showFiled).toBe(true)
  })

  it('đánh dấu đúng chip đang chọn', () => {
    const { chips } = noteFilterBar(notes, 0, 'video')
    expect(chips.filter((c) => c.on).map((c) => c.f)).toEqual(['video'])
  })
})
