import { describe, expect, it } from 'vitest'
import { isBorrowed, pageCaption, pageImage, pageSlots } from './modulePageImages'

const base = {
  layout: 'band',
  img1: null, img2: null, img3: null,
  shot1: null, shot2: null, shot3: null,
  page_img1: null, page_img2: null, page_img3: null, page_img4: null,
  page_shot1: null, page_shot2: null, page_shot3: null, page_shot4: null,
}

describe('pageSlots', () => {
  it('gives each layout the number of photos its page actually draws', () => {
    // Measured on the pages themselves: one hero, three cells, a four-cell strip.
    expect(pageSlots('band')).toEqual([1])
    // Bốn: ô thứ tư từng là mảng màu đặc chứ không phải chỗ đặt ảnh.
    expect(pageSlots('specimen')).toEqual([1, 2, 3, 4])
    expect(pageSlots('sequence')).toEqual([1, 2, 3, 4])
  })
})

describe('pageImage', () => {
  it('borrows the homepage photo when the page has none of its own', () => {
    expect(pageImage({ ...base, img1: '/home.jpg' }, 1)).toBe('/home.jpg')
    expect(isBorrowed({ ...base, img1: '/home.jpg' }, 1)).toBe(true)
  })

  it('prefers the page\'s own photo once one is set', () => {
    const m = { ...base, img1: '/home.jpg', page_img1: '/page.jpg' }
    expect(pageImage(m, 1)).toBe('/page.jpg')
    expect(isBorrowed(m, 1)).toBe(false)
  })

  it('has nothing to borrow for the fourth slot — the homepage only ever had three', () => {
    expect(pageImage({ ...base, layout: 'sequence' }, 4)).toBeNull()
    expect(isBorrowed({ ...base, layout: 'sequence' }, 4)).toBe(false)
  })

  it('borrows the caption only when the photo is borrowed too', () => {
    // Borrowing both is one picture shown twice, which is fine.
    expect(pageCaption({ ...base, img2: '/home.jpg', shot2: 'từ trang chủ' }, 2)).toBe('từ trang chủ')
    // Its own photo with the homepage's words describes something not there.
    const own = { ...base, img2: '/home.jpg', shot2: 'từ trang chủ', page_img2: '/riêng.jpg' }
    expect(pageCaption(own, 2)).toBe('')
    expect(pageCaption({ ...own, page_shot2: 'riêng' }, 2)).toBe('riêng')
  })
})
