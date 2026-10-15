import { describe, expect, it } from 'vitest'
import { cellRatio, featureCells } from './notes'

/**
 * Ghi 01 holds two kinds of cell and they must not be read as one list. A
 * feature cell belongs to the page's layout and is set up with the page; a
 * post is published into the module and set up where posts are written. The
 * posts fill the blocks of eight slots; the feature cells sit small in places
 * of their own inside them.
 */
describe('hai nhóm element ở Ghi 01', () => {
  it('ô feature có hệ đánh số riêng, không trùng, tăng dần', () => {
    // Không cần liền nhau: số được lưu cùng ảnh trong `modules.feature_cells`,
    // nên bỏ một ô (F4, ô đếm bài) thì các ô sau giữ nguyên số của mình.
    const ns = featureCells.map((f) => f.n)
    expect(ns).toEqual([...new Set(ns)].sort((a, b) => a - b))
  })

  it('mỗi ô ảnh có tỉ lệ khung để cắt ảnh và vẽ trên trang', () => {
    for (const f of featureCells.filter((c) => c.kind === 'slot')) {
      const r = cellRatio(f)
      expect(Number.isFinite(r)).toBe(true)
      expect(r).toBeGreaterThan(0)
    }
  })
})
