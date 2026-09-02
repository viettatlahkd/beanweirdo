import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Longform } from './Longform'
import { Memo } from './Memo'
import { paletteFrom, shade } from './palette'

const hue = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

describe('deriving a set from one colour', () => {
  it('keeps the colour itself untouched', () => {
    expect(paletteFrom('#C25C7C').accent).toBe('#C25C7C')
  })

  it('holds the hue as it lightens and darkens', () => {
    const p = paletteFrom('#C25C7C')
    // pink stays pink: red above blue above green, at every weight
    for (const c of [p.ink, p.tint, p.edge]) {
      const [r, g, b] = hue(c)
      expect(r).toBeGreaterThan(g)
      expect(b).toBeGreaterThan(g)
    }
  })

  it('orders the weights from dark ink to pale tint', () => {
    const p = paletteFrom('#6FA8C0')
    const light = (c: string) => hue(c).reduce((a, b) => a + b, 0)
    expect(light(p.ink)).toBeLessThan(light(p.edge))
    expect(light(p.edge)).toBeLessThan(light(p.tint))
  })

  it('takes the module’s own answer for what reads on top', () => {
    expect(paletteFrom('#6FA8C0', '#0E2C38').onAccent).toBe('#0E2C38')
  })

  it('and picks a readable one when the module has none', () => {
    expect(paletteFrom('#F2E9C8').onAccent).not.toBe('#FFFFFF')
    expect(paletteFrom('#23211A').onAccent).toBe('#FFFFFF')
  })

  it('falls back rather than throwing on a colour it cannot read', () => {
    expect(() => paletteFrom('không phải màu')).not.toThrow()
    expect(paletteFrom('không phải màu').ink).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('reads the short form too', () => {
    expect(paletteFrom('#c57').accent).toBe('#c57')
    expect(paletteFrom('#c57').ink).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('a second text weight', () => {
  it('sits between the dark one and the colour itself', () => {
    const p = paletteFrom('#6FA8C0')
    const light = (c: string) => hue(c).reduce((a, b) => a + b, 0)
    expect(light(p.ink)).toBeLessThan(light(p.mid))
    expect(light(p.mid)).toBeLessThan(light(p.edge))
  })

  it('holds the hue, so two roles stay one family', () => {
    const [r, g, b] = hue(paletteFrom('#C25C7C').mid)
    expect(r).toBeGreaterThan(g)
    expect(b).toBeGreaterThan(g)
  })

  it('can be asked for any lightness by name', () => {
    const dark = shade('#C25C7C', 30)
    const pale = shade('#C25C7C', 70)
    const light = (c: string) => hue(c).reduce((a, b) => a + b, 0)
    expect(light(dark)).toBeLessThan(light(pale))
  })
})

describe('mọi template mặc màu của bài', () => {
  const pink = { bg: '#C25C7C', fg: '#FFFFFF' }
  const warm = ([r, g, b]: number[]) => r > g && b > g

  it('memo không còn mượn màu của module khác', () => {
    const { container } = render(
      <Memo
        post={{
          title: 'Nếm thử',
          band: pink,
          sections: [
            {
              h: 'Mở',
              phases: [
                { n: '1', label: 'rót', lines: [] },
                { n: '2', label: 'ngấm', lines: [] },
                { n: '3', label: 'rót tiếp', lines: [] },
              ],
            },
          ],
        }}
      />,
    )
    const marks = Array.from(container.querySelectorAll<HTMLElement>('div'))
      .map((d) => d.style.color)
      .filter((c) => c.startsWith('rgb'))
      .map((c) => c.match(/\d+/g)!.map(Number))
    // Ba mốc từng là hồng sensory, xanh biochemistry, hổ phách roasting; nay
    // cả ba đều cùng tông với bài.
    expect(marks.filter(warm).length).toBeGreaterThanOrEqual(3)
    expect(marks.some(([r, g, b]) => g > r && g > b)).toBe(false)
  })

  it('long-form cũng vậy', () => {
    const { container } = render(
      <Longform
        post={{
          title: 'Bản dịch',
          band: pink,
          blocks: [
            { k: 'note', runs: [{ t: 'một chú thích' }] },
            { k: 'li', lvl: 3, runs: [{ t: 'mục sâu nhất' }] },
          ],
        }}
      />,
    )
    const greens = Array.from(container.querySelectorAll<HTMLElement>('div'))
      .map((d) => `${d.style.color} ${d.style.background} ${d.style.borderLeft}`)
      .filter((v) => /rgb/.test(v))
      .flatMap((v) => (v.match(/rgb\([^)]+\)/g) ?? []).map((c) => c.match(/\d+/g)!.map(Number)))
      .filter(([r, g, b]) => g > r && g > b)
    expect(greens).toEqual([])
  })
})
