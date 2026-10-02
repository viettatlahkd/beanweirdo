import { describe, expect, it } from 'vitest'
import { buildPages, EMPTY, findPage, indexModules, landingModules, pagePosts, type Store } from './useModules'
import { toRule } from '../lib/listingRule'

const module = (id: string, title: string, extra = {}) => ({
  id,
  title,
  accent: '#111111',
  on_color: '#222222',
  tint: '',
  tint2: '',
  layout: 'band',
  sort_order: 1,
  kind: 'normal',
  visibility: 'public',
  ...extra,
})
const topic = (id: string, parent_id: string | null, sort_order: number, extra = {}) => ({
  id,
  parent_id,
  sort_order,
  title: id,
  intro: '',
  accent: null,
  on_color: null,
  tint: null,
  tint2: null,
  visibility: 'public',
  ...extra,
})
const post = (id: string, topic_id: string, module_id: string, template = 'longform', published_at = '2026-09-01') => ({
  id,
  topic_id,
  module_id,
  kind: 'note',
  template,
  published_at,
  date_label: '2026.09',
  pinned: false,
  sort_order: null,
})

const rules = new Map([
  ['tpl', toRule({ id: 'tpl', tier: 'topic', from_page: true })],
  ['ghi', toRule({ id: 'ghi', tier: 'all', templates: ['bitesize', 'memo'], sort: 'manual' })],
  ['bio', toRule({ id: 'bio', tier: 'topic', nodes: ['biochemistry'], sort: 'manual' })],
])

const store = {
  ...EMPTY,
  modules: [
    module('biochem', 'biochemistry 101', { layout: 'specimen' }),
    module('ghi01', 'ghi', { kind: 'special' }),
    module('ghi02', 'private', { kind: 'special', visibility: 'private' }),
  ],
  topics: [topic('bean', null, 1, { accent: '#9D9167' }), topic('biochemistry', 'bean', 1), topic('art', null, 2)],
  keywords: [{ id: 'heat', label: 'nhiệt' }],
  pages: [
    { id: 'tpl-subject', kind: 'template_subject', title: '', presentation: {}, blocks: ['tpl'], aliases: [], visibility: 'public' },
    { id: 'tpl-topic', kind: 'template_topic', title: '', presentation: {}, blocks: ['tpl'], aliases: [], visibility: 'public' },
    { id: 'ghi', kind: 'curated', title: 'ghi', presentation: { module: 'ghi01' }, blocks: ['ghi'], aliases: ['ghi01'], visibility: 'public' },
    {
      id: 'nav',
      kind: 'nav',
      title: '',
      presentation: { items: [{ ref: 'topic:biochemistry' }, { ref: 'page:ghi', home: false }, { ref: 'topic:art', sidebar: false, home: false }] },
      blocks: [],
      aliases: [],
      visibility: 'public',
    },
  ],
  overrides: [{ node_type: 'topic', node_id: 'biochemistry', rule_id: 'bio', presentation: { module: 'biochem' }, aliases: ['biochem'] }],
  rules,
  posts: [
    post('lipid', 'biochemistry', 'biochem'),
    post('film', 'art', 'ghi01', 'bitesize'),
    post('taste', 'bean', 'ghi01', 'memo', '2026-08-01'),
  ],
} as unknown as Store

describe('pages from the feature layer', () => {
  const pages = buildPages(store)

  it('draws a tier page as the module it took over, reachable by the module id', () => {
    const bio = findPage(pages, 'biochem')!
    expect(bio.id).toBe('biochemistry')
    expect([bio.title, bio.layout, bio.accent]).toEqual(['biochemistry 101', 'specimen', '#111111'])
  })

  it('gives a topic with no colour of its own its subject colour, and a template rule', () => {
    expect(findPage(pages, 'bean')!.accent).toBe('#9D9167')
    expect(pagePosts(findPage(pages, 'bean'), store).map((p) => p.id)).toEqual(['lipid', 'taste'])
  })

  it('lists posts by the page rule, not by the module they are filed under', () => {
    expect(pagePosts(findPage(pages, 'ghi01'), store).map((p) => p.id)).toEqual(['film', 'taste'])
    expect(findPage(pages, 'ghi01')!.screen).toBe('notes')
  })

  it('keeps a module no page took over as a page of its own', () => {
    expect(findPage(pages, 'ghi02')).toMatchObject({ source: 'module', title: 'private' })
    // Its journal screen belongs to Practice now; the leftover row opens nothing special.
    expect(findPage(pages, 'ghi02')?.screen).toBeUndefined()
  })

  it('lists the owner order first, then every subject not placed, honouring the flags', () => {
    expect(indexModules(pages).map((p) => p.id)).toEqual(['biochemistry', 'ghi', 'bean'])
    expect(landingModules(pages).map((p) => p.id)).toEqual(['biochemistry', 'bean'])
  })

  it('falls back to the modules exactly while no page is set up', () => {
    const before = buildPages({ ...store, pages: [], overrides: [] })
    expect(before.map((p) => p.id)).toEqual(['biochem', 'ghi01', 'ghi02'])
    // Journals after reading modules, whatever the CMS numbering.
    const numbered = buildPages({ ...store, pages: [], overrides: [], modules: [module('ghi01', 'ghi', { kind: 'special', sort_order: 1 }), module('biochem', 'b', { sort_order: 2 })] } as Store)
    expect(indexModules(numbered).map((p) => p.id)).toEqual(['biochem', 'ghi01'])
    expect(pagePosts(findPage(before, 'ghi01'), store).map((p) => p.id)).toEqual(['film', 'taste'])
  })
})
