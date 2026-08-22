import { describe, expect, it } from 'vitest'
import { featureCells } from './notes'

/**
 * Ghi 01 holds two kinds of cell and they must not be read as one list. A
 * feature cell belongs to the page's layout and is set up with the page; a
 * post is published into the module and set up where posts are written. They
 * share a grid, which is exactly why the numbering has to stay apart.
 */
describe('hai nhóm element ở Ghi 01', () => {
  it('ô feature có hệ đánh số riêng, liên tục F1…Fn', () => {
    expect(featureCells.map((f) => f.n)).toEqual(featureCells.map((_, i) => i + 1))
  })

  it('mỗi ô feature nói rõ nó đứng sau bài nào', () => {
    for (const f of featureCells) {
      expect(Number.isInteger(f.afterPost)).toBe(true)
      expect(f.afterPost).toBeGreaterThanOrEqual(0)
    }
  })

  it('số của ô feature độc lập với vị trí nó đứng', () => {
    // F4 đứng sau bài 5, F6 cũng vậy — số thứ tự riêng, chỗ đứng riêng.
    const dungCungCho = featureCells.filter((f) => f.afterPost === 5).map((f) => f.n)
    expect(dungCungCho.length).toBeGreaterThan(1)
    expect(new Set(dungCungCho).size).toBe(dungCungCho.length)
  })
})
