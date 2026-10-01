import { describe, expect, it } from 'vitest'
import { aboutSign, navLinks, resolveContent } from './content'
import { parsePath, toPath } from '../lib/routes'
import { DEFAULT_WORDS } from '../lib/routeWords'

const pages = [
  { id: 'a', slug: 'bibi', title: 'bibi', status: 'published' },
  { id: 'b', slug: 'bibe', title: 'bibe', status: 'published' },
  { id: 'c', slug: 'draft', title: 'draft', status: 'draft' },
]

describe('Header links', () => {
  it('lists the main page, every published page and about, in that order by default', () => {
    expect(navLinks(resolveContent({}), pages).map((l) => l.key)).toEqual(['home', 'page:a', 'page:b', 'about'])
  })

  it('keeps the owner order, labels and hidden links, and appends pages published later', () => {
    const content = resolveContent({ header: { links: [{ key: 'about', label: 'về tôi' }, { key: 'page:b', hidden: true }] } })
    const links = navLinks(content, pages)
    expect(links.map((l) => l.key)).toEqual(['about', 'page:b', 'home', 'page:a'])
    expect(links[0].label).toBe('về tôi')
    expect(links[1].hidden).toBe(true)
  })

  it('drops a link whose page is no longer published', () => {
    const content = resolveContent({ header: { links: [{ key: 'page:c', label: 'x' }] } })
    expect(navLinks(content, pages).some((l) => l.key === 'page:c')).toBe(false)
  })
})

describe('About signature', () => {
  it('shows the chosen signature, or the first when the choice is gone', () => {
    const about = resolveContent({ about: { signs: ['one', 'two'], signUse: 1 } }).about
    expect(aboutSign(about)).toBe('two')
    expect(aboutSign({ ...about, signUse: 5 })).toBe('one')
  })
})

describe('Portfolio addresses', () => {
  it('reads and writes the main page, about and a port page', () => {
    for (const [path, where] of [
      ['/portfolio', { area: 'public', screen: 'portfolioHome' }],
      ['/portfolio/about', { area: 'public', screen: 'portfolioAbout' }],
      ['/portfolio/bibi', { area: 'public', screen: 'portfolioPage', slug: 'bibi' }],
    ] as const) {
      expect(parsePath(path, '', DEFAULT_WORDS)).toEqual(where)
      expect(toPath(where, DEFAULT_WORDS)).toBe(path)
    }
  })
})
