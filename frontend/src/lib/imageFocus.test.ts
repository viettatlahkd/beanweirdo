import { describe, expect, it } from 'vitest'
import { CENTRE, coverStyle, cropStyle, readCrop, readFocus, stripFocus, withCrop, withFocus } from './imageFocus'
import { fillStyle } from 'post-renderer'

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

/*
 * The picker offers six alignments — three across, three down — and each is a
 * focal point at an edge or the middle. Dragging is for the in-between; asking
 * for "the top" by hand meant hunting for 0 with a mouse.
 */
describe('alignment stops', () => {
  it('names an edge as the focal point that shows it', () => {
    expect(withFocus('/a.jpg', { x: 0, y: 50 })).toBe('/a.jpg#focus=0,50')
    expect(withFocus('/a.jpg', { x: 100, y: 50 })).toBe('/a.jpg#focus=100,50')
    expect(withFocus('/a.jpg', { x: 50, y: 0 })).toBe('/a.jpg#focus=50,0')
    expect(withFocus('/a.jpg', { x: 50, y: 100 })).toBe('/a.jpg#focus=50,100')
  })

  it('reads an edge back as the same edge', () => {
    expect(readFocus('/a.jpg#focus=0,100')).toEqual({ x: 0, y: 100 })
  })

  it('puts the photo where background-position puts it', () => {
    expect(coverStyle('/a.jpg#focus=100,0').backgroundPosition).toBe('100% 0%')
  })
})

/*
 * Cắt tay cho khối ảnh trong thân bài: hình chữ nhật giữ lại cộng hình dạng
 * của nó trên trang, ghi lên địa chỉ ảnh như điểm căn.
 */
describe('crop', () => {
  it('round-trips a crop and keeps the fetched URL clean', () => {
    const url = withCrop('/a.jpg', { x: 10, y: 20, w: 50, h: 40, ratio: 1.875 })
    expect(url).toBe('/a.jpg#crop=10,20,50,40,1.875')
    expect(readCrop(url)).toEqual({ x: 10, y: 20, w: 50, h: 40, ratio: 1.875 })
    expect(stripFocus(url)).toBe('/a.jpg')
  })

  it('replaces a focal point instead of stacking on it', () => {
    expect(withCrop('/a.jpg#focus=10,10', { x: 0, y: 0, w: 100, h: 100, ratio: 1.5 })).toBe('/a.jpg#crop=0,0,100,100,1.5')
  })

  it('scales the photo so exactly the kept rectangle fills the cell', () => {
    const s = cropStyle('/a.jpg#crop=25,0,50,100,1')!
    expect(s.aspectRatio).toBe('1')
    expect(s.backgroundImage).toBe('url(/a.jpg)')
    expect(s.backgroundSize).toBe('200% auto')
    // 25 of the 50 spare points: halfway.
    expect(s.backgroundPosition).toBe('50% 0%')
  })

  it('a template cell takes the shape the photo was cut to', () => {
    const s = fillStyle('/a.jpg#crop=0,0,100,100,1.7778', '#eee')
    expect(s.aspectRatio).toBe('1.7778')
    // Cells spread this after their own fixed height, so it must undo it.
    expect(s.height).toBe('auto')
    expect(fillStyle('/a.jpg', '#eee').aspectRatio).toBeUndefined()
  })

  it('draws nothing special for a photo that was never cropped', () => {
    expect(cropStyle('/a.jpg')).toBeNull()
    expect(cropStyle('/a.jpg#focus=20,80')).toBeNull()
    expect(cropStyle(null)).toBeNull()
  })

  it('a cropped photo in a fixed cell keeps roughly the part that was kept', () => {
    expect(readFocus('/a.jpg#crop=50,0,50,100,1')).toEqual({ x: 100, y: 50 })
    expect(coverStyle('/a.jpg#crop=0,0,50,100,1').backgroundImage).toBe('url(/a.jpg)')
  })
})
