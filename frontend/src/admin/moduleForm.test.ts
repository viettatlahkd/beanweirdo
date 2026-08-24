import { describe, expect, it } from 'vitest'
import { formShapeOf, imageCount } from './moduleForm'

const blank = {
  layout: 'band',
  shot1: null, shot2: null, shot3: null,
  img1: null, img2: null, img3: null,
  page_img1: null, page_img2: null, page_img3: null, page_img4: null,
  page_shot1: null, page_shot2: null, page_shot3: null, page_shot4: null,
}

const groups = (id: string, kind: 'normal' | 'special', layout?: string) =>
  formShapeOf({ id, kind, layout }).images

describe('formShapeOf', () => {
  it('gives a normal module the card copy and two image groups', () => {
    const shape = formShapeOf({ id: 'sensory', kind: 'normal', layout: 'band' })
    expect(shape.concept).toBe(true)
    expect(shape.blurb).toBe(true)
    expect(shape.layout).toBe(true)
    expect(shape.images.map((g) => g.columns)).toEqual(['homepage', 'module-page'])
  })

  it('always offers three homepage photos — design v4 draws no fourth', () => {
    for (const layout of ['band', 'specimen', 'sequence']) {
      const home = groups('x', 'normal', layout).find((g) => g.columns === 'homepage')!
      expect(home.slots).toEqual([1, 2, 3])
      expect(home.preview).toEqual(['homepage-band'])
    }
  })

  /*
   * The page's photo count belongs to its layout, not to a number picked once.
   * Offering three to every module left sensory with two slots it could not use
   * and roasting — whose roast strip has four cells — one short.
   */
  it('sizes the page group by what the layout actually draws', () => {
    const page = (layout: string) =>
      groups('x', 'normal', layout).find((g) => g.columns === 'module-page')!
    expect(page('band').slots).toEqual([1])
    expect(page('specimen').slots).toEqual([1, 2, 3])
    expect(page('sequence').slots).toEqual([1, 2, 3, 4])
  })

  it('names the roast strip cells the way the design names them', () => {
    const page = groups('roasting', 'normal', 'sequence').find((g) => g.columns === 'module-page')!
    expect(page.names).toEqual([
      '01 — nhân xanh',
      '02 — vàng',
      '03 — first crack',
      '04 — phát triển',
    ])
  })

  it('gives Ghi 01 footer images and none of the card copy', () => {
    const shape = formShapeOf({ id: 'ghi01', kind: 'special' })
    expect(shape.concept).toBe(false)
    expect(shape.blurb).toBe(false)
    expect(shape.longDesc).toBe(false)
    expect(shape.designNotes).toBe(false)
    expect(shape.images).toHaveLength(1)
    expect(shape.images[0].label).toBe('Ảnh chân trang')
    expect(shape.images[0].slots).toEqual([1, 2])
  })

  it('offers the feature cells to Ghi 01 and to nothing else', () => {
    expect(formShapeOf({ id: 'ghi01', kind: 'special' }).featureCells).toBe(true)
    expect(formShapeOf({ id: 'ghi02', kind: 'special' }).featureCells).toBe(false)
    expect(formShapeOf({ id: 'sensory', kind: 'normal' }).featureCells).toBe(false)
  })

  it('offers Ghi 02 no images, because Hours.tsx reads none', () => {
    expect(formShapeOf({ id: 'ghi02', kind: 'special' }).images).toEqual([])
  })
})

describe('imageCount', () => {
  const home = groups('sensory', 'normal', 'band').find((g) => g.columns === 'homepage')!
  const page = groups('roasting', 'normal', 'sequence').find((g) => g.columns === 'module-page')!

  it('counts only slots holding a photo', () => {
    expect(imageCount(blank, home)).toBe(0)
    expect(imageCount({ ...blank, img1: '/a.jpg' }, home)).toBe(1)
    expect(imageCount({ ...blank, img1: '/a.jpg', img3: '/c.jpg' }, home)).toBe(2)
  })

  it('counts each group against its own columns', () => {
    // A homepage photo is not a page photo, which is the whole point of D11.
    expect(imageCount({ ...blank, img1: '/a.jpg' }, page)).toBe(0)
    expect(imageCount({ ...blank, page_img4: '/d.jpg' }, page)).toBe(1)
  })

  it('does not count a caption without a photo — that cell is a colour box', () => {
    expect(imageCount({ ...blank, shot1: 'macro hương vị' }, home)).toBe(0)
  })
})
