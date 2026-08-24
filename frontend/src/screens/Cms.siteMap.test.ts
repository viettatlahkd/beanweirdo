import { describe, expect, it } from 'vitest'
import { NAV } from '../content/navItems'

/*
 * The site map was assembled from two sources that disagreed: `navItems.ts`
 * carried a hand-typed name for Ghi 01 and Ghi 02, the database carried the
 * real one, and the map listed both — so each appeared twice, and Ghi 02, which
 * is private, appeared under Public as well as Practice.
 *
 * These guard the link that fixed it. The tree itself is built inside the CMS
 * screen; what is checked here is the declaration it reads.
 */
describe('nav entries that are modules', () => {
  it('names the module each such page is', () => {
    expect(NAV.find((n) => n.key === 'notes')?.moduleId).toBe('ghi01')
    expect(NAV.find((n) => n.key === 'hours')?.moduleId).toBe('ghi02')
  })

  it('claims each module at most once, so no page can be listed twice', () => {
    const claimed = NAV.map((n) => n.moduleId).filter(Boolean)
    expect(new Set(claimed).size).toBe(claimed.length)
  })

  it('keeps Ghi 02 in Practice — it is private and belongs behind the login', () => {
    expect(NAV.find((n) => n.key === 'hours')?.group).toBe('Practice')
  })

  it('leaves ordinary modules unclaimed, so they are listed from the database', () => {
    const claimed = new Set(NAV.map((n) => n.moduleId).filter(Boolean))
    expect(claimed.has('sensory')).toBe(false)
    expect(claimed.has('roasting')).toBe(false)
    expect(claimed.has('biochem')).toBe(false)
  })
})
