import { describe, expect, it } from 'vitest'
import { NAV } from './navItems'

describe('nav registry', () => {
  it('keeps Archive out of the sidebar without unlisting the page', () => {
    // Content management lists every post under five status filters and can
    // edit them; Archive shows a subset and can do nothing to them. It stays a
    // real page — the breadcrumbs and the CMS site map still name it — but it
    // is not a second door in the sidebar.
    const archive = NAV.find((n) => n.key === 'archive')
    expect(archive).toBeDefined()
    expect(archive?.hiddenFromSidebar).toBe(true)
    expect(archive?.label).toBe('Archive')
  })

  it('hides nothing else', () => {
    const hidden = NAV.filter((n) => n.hiddenFromSidebar).map((n) => n.key)
    expect(hidden).toEqual(['archive'])
  })
})
