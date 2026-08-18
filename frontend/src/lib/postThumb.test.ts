import { describe, expect, it } from 'vitest'
import { postThumbnail } from './postThumb'

const thumb = (hero: string | null, body: unknown) =>
  postThumbnail({ hero_image_url: hero, body } as never)

describe('postThumbnail', () => {
  it('prefers the post’s own cover', () => {
    expect(thumb('/hero.png', [{ k: 'fig', src: '/inside.png' }])).toBe('/hero.png')
  })

  it('falls back to the first figure in a long-form body', () => {
    // Seven figures in the piece and no cover set — showing a blank swatch
    // would be a choice nobody made.
    expect(thumb(null, [{ k: 'p' }, { k: 'fig', src: '/first.png' }, { k: 'fig', src: '/second.png' }])).toBe(
      '/first.png',
    )
  })

  it('reaches into a nested block, e.g. an aside or an article section', () => {
    expect(thumb(null, [{ k: 'aside', items: [{ k: 'fig', src: '/nested.png' }] }])).toBe('/nested.png')
    expect(thumb(null, [{ h: 'Phần', fig: { imageUrl: '/plate.png' } }])).toBe('/plate.png')
  })

  it('returns null when the post genuinely has no picture', () => {
    // The lexicon is all text; the caller draws its tint instead.
    expect(thumb(null, [{ n: '01', title: 'Apple', parts: [] }])).toBeNull()
    expect(thumb(null, null)).toBeNull()
  })
})
