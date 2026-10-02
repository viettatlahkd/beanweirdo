import { describe, expect, it } from 'vitest'
import { blogFontHref, blogVars } from './blogDesign'
import { ink, serif } from './tokens'

describe('blog design system', () => {
  it('reads each token through a variable, falling back to the shipped value', () => {
    expect(ink.base).toBe('var(--bw-ink-base, #23211A)')
    expect(serif).toBe("var(--bw-font-serif, 'Playfair Display', serif)")
  })

  it('turns only well-formed changes into variables', () => {
    expect(
      blogVars({
        'ink.base': '#B4552E',
        'paper.cream': 'red; background: url(x)',
        'ink.nothing': '#000000',
        'font.serif': 'Fraunces',
        'font.sans': "Inter'; }",
        'garden.leaf': null,
      }),
    ).toEqual({ '--bw-ink-base': '#B4552E', '--bw-font-serif': "'Fraunces', 'Playfair Display', serif" })
  })

  it('loads a chosen family from Google Fonts, and nothing for the shipped ones', () => {
    expect(blogFontHref({})).toBeNull()
    expect(blogFontHref({ 'font.serif': 'Fraunces', 'font.sans': 'Work Sans' })).toContain('family=Fraunces:')
    expect(blogFontHref({ 'font.sans': 'Work Sans' })).toContain('family=Work+Sans:')
  })
})
