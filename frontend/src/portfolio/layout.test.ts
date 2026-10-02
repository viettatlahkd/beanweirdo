import { describe, expect, it } from 'vitest'
import { seriesLayout, storyLayout, type Placed } from './layout'
import { parsePath, toPath } from '../lib/routes'
import { DEFAULT_WORDS } from '../lib/routeWords'

const overlap = (a: Placed, b: Placed) =>
  !(a.col + a.size <= b.col || b.col + b.size <= a.col || a.row + a.size <= b.row || b.row + b.size <= a.row)

describe('06.6 khối series — khung 13 × 8', () => {
  it('cả 20 biến thể nằm trong khung và hai ảnh không chồng nhau', () => {
    for (let i = 0; i < 20; i++) {
      const [a, b] = seriesLayout(i)
      for (const p of [a, b]) {
        expect(p.col).toBeGreaterThanOrEqual(1)
        expect(p.row).toBeGreaterThanOrEqual(1)
        expect(p.col + p.size - 1).toBeLessThanOrEqual(13)
        expect(p.row + p.size - 1).toBeLessThanOrEqual(8)
      }
      expect(overlap(a, b)).toBe(false)
    }
  })

  it('hai khối liền nhau không cùng bố cục', () => {
    for (let i = 0; i < 19; i++) expect(seriesLayout(i)).not.toEqual(seriesLayout(i + 1))
  })
})

describe('06.7 khối kể chuyện — khung 8 × 13, trục giữa hàng 8 và 9', () => {
  it('ảnh to luôn trên trục, ảnh nhỏ luôn dưới trục', () => {
    for (let i = 0; i < 6; i++) {
      for (const left of [false, true]) {
        const [big, small] = storyLayout(i, left)
        expect(big.size).toBe(8)
        expect(big.row + big.size - 1).toBeLessThanOrEqual(8)
        expect(small.row).toBeGreaterThanOrEqual(9)
        expect(small.col + small.size - 1).toBeLessThanOrEqual(8)
      }
    }
  })

  it('ảnh nhỏ nghiêng về phía chữ', () => {
    for (let i = 0; i < 6; i++) {
      const [, right] = storyLayout(i, false) // ảnh bên phải → chữ bên trái
      const [, left] = storyLayout(i, true)
      expect(right.col + right.size / 2).toBeLessThan(5)
      expect(left.col + left.size / 2).toBeGreaterThan(5)
    }
  })
})

describe('địa chỉ Portfolio', () => {
  it('trang công khai đọc và viết khớp nhau', () => {
    const w = { area: 'public', screen: 'portfolioPage', slug: 'bibi' } as const
    expect(toPath(w, DEFAULT_WORDS)).toBe('/portfolio/bibi')
    expect(parsePath('/portfolio/bibi', '', DEFAULT_WORDS)).toEqual(w)
  })

  it('địa chỉ admin cũ của Portfolio rơi vào CMS', () => {
    // Port pages live in Quản lý trang, the port design in Cài đặt hiển thị.
    expect(parsePath('/ad-portfolio', '', DEFAULT_WORDS)).toEqual({ area: 'admin', screen: 'cms', tab: 'pages' })
    expect(parsePath('/ad-portfolio-design', '', DEFAULT_WORDS)).toEqual({ area: 'admin', screen: 'cms', tab: 'display' })
  })
})
