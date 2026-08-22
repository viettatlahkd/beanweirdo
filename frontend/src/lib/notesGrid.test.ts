import { describe, expect, it } from 'vitest'
import { buildNotesGrid, POSTS_PER_BATCH } from './notesGrid'
import type { PostRow } from '../data/usePublishedPosts'

const posts = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, en: `Bài ${i + 1}` }) as PostRow)

const shape = (n: number) =>
  buildNotesGrid(posts(n)).map((c) => (c.kind === 'post' ? c.post.en : `F${c.cell.n}`))

describe('lưới Ghi 01', () => {
  it('không bài nào thì không ô feature nào — không trang trí cái trống', () => {
    expect(shape(0)).toEqual([])
  })

  it('ba bài: hiện F1 và F2, chưa hiện F3', () => {
    // F1 cùng hàng với bài 1–2, F2 cùng hàng với bài 3. Hàng của F3 chưa có bài.
    const s = shape(3)
    expect(s).toContain('F1')
    expect(s).toContain('F2')
    expect(s).not.toContain('F3')
  })

  it('ô feature luôn đứng sau bài nó thuộc về, không dồn xuống cuối', () => {
    const s = shape(8)
    expect(s.indexOf('F1')).toBeGreaterThan(s.indexOf('Bài 2'))
    expect(s.indexOf('F1')).toBeLessThan(s.indexOf('Bài 3'))
  })

  it('đủ tám bài thì hiện cả bảy ô feature', () => {
    const s = shape(8)
    for (let n = 1; n <= 7; n++) expect(s).toContain(`F${n}`)
    expect(s.filter((x) => x.startsWith('Bài'))).toHaveLength(8)
  })

  it('bài thứ tám kéo theo cả F5 và F7 — hai ô cùng hàng với nó', () => {
    expect(shape(7)).not.toContain('F5')
    expect(shape(8)).toContain('F5')
    expect(shape(8)).toContain('F7')
  })

  it('quá tám bài thì mở batch mới, lặp lại nhịp cũ', () => {
    const s = shape(9)
    expect(s.filter((x) => x === 'F1')).toHaveLength(2)
    expect(s.indexOf('Bài 9')).toBeGreaterThan(s.lastIndexOf('Bài 8'))
  })

  it('một batch là tám bài', () => {
    expect(POSTS_PER_BATCH).toBe(8)
  })
})
