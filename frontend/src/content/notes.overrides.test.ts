import { describe, expect, it } from 'vitest'
import { featureCells, patchOverride, QUOTE_CELL, withOverrides } from './notes'

describe('withOverrides', () => {
  it('returns the design cells untouched when nothing is set', () => {
    const out = withOverrides(featureCells, [])
    expect(out).toHaveLength(featureCells.length)
    expect(out[0].t).toBe(featureCells[0].t)
    expect(out[0].img).toBeUndefined()
  })

  it('folds a photo and a caption into the cell it names', () => {
    const out = withOverrides(featureCells, [{ n: 3, img: '/a.jpg', t: 'ảnh mới' }])
    const f3 = out.find((c) => c.n === 3)!
    expect(f3.img).toBe('/a.jpg')
    expect(f3.t).toBe('ảnh mới')
    // Cells carry their own numbering, so F3 is the third cell, not the third
    // post — and setting F3 leaves every other cell exactly as designed.
    expect(out.find((c) => c.n === 1)!.img).toBeUndefined()
    expect(out.find((c) => c.n === 1)!.t).toBe(featureCells.find((c) => c.n === 1)!.t)
  })

  it('never moves a cell — geometry stays with the design', () => {
    const out = withOverrides(featureCells, [{ n: 5, img: '/b.jpg' }])
    const before = featureCells.find((c) => c.n === 5)!
    const after = out.find((c) => c.n === 5)!
    expect(after.col).toBe(before.col)
    expect(after.mt).toBe(before.mt)
    expect(after.afterPost).toBe(before.afterPost)
  })

  it('leaves the caption alone when only a photo is set', () => {
    const out = withOverrides(featureCells, [{ n: 1, img: '/c.jpg' }])
    expect(out.find((c) => c.n === 1)!.t).toBe(featureCells.find((c) => c.n === 1)!.t)
  })
})

describe('patchOverride', () => {
  it('replaces one cell and keeps the others, sorted by n', () => {
    const next = patchOverride([{ n: 3, img: 'a.jpg' }, { n: 1, t: 'x' }], QUOTE_CELL.n, { t: 'câu mới' })
    expect(next).toEqual([{ n: 1, t: 'x' }, { n: 2, t: 'câu mới' }, { n: 3, img: 'a.jpg' }])
  })
  it('keeps a photo already set on the cell it patches', () => {
    expect(patchOverride([{ n: 1, img: 'a.jpg', t: 'cũ' }], 1, { t: 'mới' })).toEqual([{ n: 1, img: 'a.jpg', t: 'mới' }])
  })
  it('names the quotation as the page quote', () => {
    expect(QUOTE_CELL.kind).toBe('quote')
  })
})
