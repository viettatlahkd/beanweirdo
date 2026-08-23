import { describe, expect, it } from 'vitest'
import { CENTRE, coverStyle, readFocus, stripFocus, withFocus } from './imageFocus'

describe('imageFocus', () => {
  it('reads the centre from a plain URL', () => {
    expect(readFocus('/a.jpg')).toEqual(CENTRE)
    expect(readFocus(null)).toEqual(CENTRE)
  })

  it('round-trips a focal point', () => {
    const url = withFocus('/a.jpg', { x: 20, y: 80 })
    expect(url).toBe('/a.jpg#focus=20,80')
    expect(readFocus(url)).toEqual({ x: 20, y: 80 })
  })

  it('leaves the centre implicit, so an untouched photo keeps a clean URL', () => {
    expect(withFocus('/a.jpg', CENTRE)).toBe('/a.jpg')
    expect(withFocus('/a.jpg#focus=10,10', { x: 50, y: 50 })).toBe('/a.jpg')
  })

  it('replaces rather than stacks fragments', () => {
    expect(withFocus('/a.jpg#focus=10,10', { x: 90, y: 5 })).toBe('/a.jpg#focus=90,5')
  })

  it('keeps the fetched URL free of the fragment', () => {
    expect(stripFocus('/a.jpg#focus=20,80')).toBe('/a.jpg')
    expect(coverStyle('/a.jpg#focus=20,80').backgroundImage).toBe('url(/a.jpg)')
  })

  it('positions the photo the way background-position reads it', () => {
    expect(coverStyle('/a.jpg#focus=0,0').backgroundPosition).toBe('0% 0%')
    expect(coverStyle('/a.jpg').backgroundPosition).toBe('50% 50%')
  })

  it('clamps a value that would push the photo out of its frame', () => {
    expect(readFocus('/a.jpg#focus=-30,140')).toEqual({ x: 0, y: 100 })
  })

  it('ignores a fragment that is not a focal point', () => {
    expect(readFocus('/a.jpg#hash')).toEqual(CENTRE)
    expect(stripFocus('/a.jpg#hash')).toBe('/a.jpg#hash')
  })
})
