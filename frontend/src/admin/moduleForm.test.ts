import { describe, expect, it } from 'vitest'
import { formShapeOf, imageCount } from './moduleForm'

const blank = {
  layout: 'band',
  shot1: null,
  shot2: null,
  shot3: null,
  img1: null,
  img2: null,
  img3: null,
}

describe('formShapeOf', () => {
  it('gives a normal module the card copy and the three homepage photos', () => {
    const shape = formShapeOf({ id: 'sensory', kind: 'normal' })
    expect(shape.concept).toBe(true)
    expect(shape.blurb).toBe(true)
    expect(shape.layout).toBe(true)
    expect(shape.images?.slots).toEqual([1, 2, 3])
    expect(shape.images?.preview).toBe('homepage-band')
  })

  it('gives Ghi 01 footer images and none of the card copy', () => {
    const shape = formShapeOf({ id: 'ghi01', kind: 'special' })
    expect(shape.concept).toBe(false)
    expect(shape.blurb).toBe(false)
    expect(shape.longDesc).toBe(false)
    expect(shape.designNotes).toBe(false)
    // Ghi 01 is a page, never a card, so it has no module images at all.
    expect(shape.images?.label).toBe('Ảnh chân trang')
    expect(shape.images?.slots).toEqual([1, 2])
  })

  it('offers the feature cells to Ghi 01 and to nothing else', () => {
    expect(formShapeOf({ id: 'ghi01', kind: 'special' }).featureCells).toBe(true)
    expect(formShapeOf({ id: 'ghi02', kind: 'special' }).featureCells).toBe(false)
    expect(formShapeOf({ id: 'sensory', kind: 'normal' }).featureCells).toBe(false)
  })

  it('offers Ghi 02 no fields, because Hours.tsx reads none', () => {
    expect(formShapeOf({ id: 'ghi02', kind: 'special' }).images).toBeNull()
  })

  it('never offers a fourth image slot — design v4 draws only three', () => {
    const shape = formShapeOf({ id: 'roasting', kind: 'normal' })
    expect(shape.images?.slots.length).toBeLessThanOrEqual(3)
  })
})

describe('imageCount', () => {
  const group = formShapeOf({ id: 'sensory', kind: 'normal' }).images!

  it('counts only slots holding a photo', () => {
    expect(imageCount(blank, group)).toBe(0)
    expect(imageCount({ ...blank, img1: '/a.jpg' }, group)).toBe(1)
    expect(imageCount({ ...blank, img1: '/a.jpg', img3: '/c.jpg' }, group)).toBe(2)
  })

  it('does not count a caption without a photo — that cell is a colour box', () => {
    expect(imageCount({ ...blank, shot1: 'macro hương vị' }, group)).toBe(0)
  })
})
