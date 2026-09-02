import { describe, expect, it } from 'vitest'
import { paletteFrom } from './palette'

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
