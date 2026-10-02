import { describe, expect, it } from 'vitest'
import { resolveRule, toRule, treeOrder, type RulePost, type RuleTopic } from './listingRule'

const topics: RuleTopic[] = [
  { id: 'bean', parent_id: null, sort_order: 2, title: 'bean weirdo' },
  { id: 'biz', parent_id: null, sort_order: 1, title: 'business' },
  { id: 'roasting', parent_id: 'bean', sort_order: 2, title: 'roasting' },
  { id: 'sensory', parent_id: 'bean', sort_order: 1, title: 'sensory' },
  { id: 'ops', parent_id: 'biz', sort_order: 1, title: 'strat&ops' },
]

const post = (id: string, topic_id: string | null, published_at: string, extra: Partial<RulePost> = {}): RulePost => ({
  id,
  topic_id,
  kind: 'note',
  template: 'longform',
  published_at,
  date_label: published_at.slice(0, 7).replace('-', '.'),
  ...extra,
})

const posts = [
  post('a', 'roasting', '2026-06-01'),
  post('b', 'sensory', '2026-08-01', { template: 'memo' }),
  post('c', 'bean', '2026-05-01', { kind: 'ref' }),
  post('d', 'ops', '2026-09-01', { template: 'bitesize' }),
  post('e', null, '2026-07-01'),
]
const keywords: Record<string, string[]> = { a: ['heat'], b: ['heat', 'asia'], d: ['asia'] }
const ctx = { topics, keywordsOf: (id: string) => keywords[id] ?? [] }
const ids = (r: { posts: RulePost[] }) => r.posts.map((p) => p.id)

describe('listing rule — what it pulls', () => {
  it('pulls a subject with its topics, or only the subject when told', () => {
    expect(ids(resolveRule(toRule({ tier: 'topic', nodes: ['bean'] }), posts, ctx))).toEqual(['b', 'a', 'c'])
    expect(ids(resolveRule(toRule({ tier: 'topic', nodes: ['bean'], include_children: false }), posts, ctx))).toEqual(['c'])
  })

  it('takes its node from the page for a tier template, and pulls nothing without one', () => {
    const tpl = toRule({ tier: 'topic', from_page: true })
    expect(ids(resolveRule(tpl, posts, { ...ctx, node: 'sensory' }))).toEqual(['b'])
    expect(ids(resolveRule(tpl, posts, ctx))).toEqual([])
  })

  it('matches tags by any or all, and excludes nodes', () => {
    expect(ids(resolveRule(toRule({ tier: 'keyword', nodes: ['heat', 'asia'] }), posts, ctx))).toEqual(['d', 'b', 'a'])
    expect(ids(resolveRule(toRule({ tier: 'keyword', nodes: ['heat', 'asia'], match: 'all' }), posts, ctx))).toEqual(['b'])
    expect(ids(resolveRule(toRule({ tier: 'topic', nodes: ['bean'], exclude: ['sensory'] }), posts, ctx))).toEqual(['a', 'c'])
  })

  it('filters further by dạng bài and khuôn bài', () => {
    expect(ids(resolveRule(toRule({ tier: 'all', templates: ['bitesize', 'memo'] }), posts, ctx))).toEqual(['d', 'b'])
    expect(ids(resolveRule(toRule({ tier: 'kind', nodes: ['ref'] }), posts, ctx))).toEqual(['c'])
  })
})

describe('listing rule — order', () => {
  it('orders by time either way, and by the tree', () => {
    expect(ids(resolveRule(toRule({ sort: 'oldest' }), posts, ctx))).toEqual(['c', 'a', 'e', 'b', 'd'])
    expect(treeOrder(topics)).toEqual(['biz', 'ops', 'bean', 'sensory', 'roasting'])
    expect(ids(resolveRule(toRule({ sort: 'tree' }), posts, ctx))).toEqual(['d', 'c', 'b', 'a', 'e'])
  })

  it('keeps a hand order, putting posts it has not placed first or last', () => {
    const manual = toRule({ sort: 'manual', manual_order: ['a', 'c'], tier: 'topic', nodes: ['bean'] })
    expect(ids(resolveRule(manual, posts, ctx))).toEqual(['b', 'a', 'c'])
    expect(ids(resolveRule({ ...manual, new_first: false }, posts, ctx))).toEqual(['a', 'c', 'b'])
  })

  it('falls back to the posts table order for posts it has not placed', () => {
    const legacy = [post('x', null, '2026-01-01', { sort_order: 2 }), post('y', null, '2026-02-01', { sort_order: 1 }), post('z', null, '2026-03-01', { pinned: true })]
    expect(ids(resolveRule(toRule({ sort: 'manual' }), legacy, ctx))).toEqual(['z', 'y', 'x'])
  })

  it('puts pinned posts first in pin order, then limits', () => {
    expect(ids(resolveRule(toRule({ pinned: ['c', 'e'], limit_n: 3 }), posts, ctx))).toEqual(['c', 'e', 'd'])
  })
})

describe('listing rule — groups', () => {
  it('groups by topic in tree order, keeping the order inside', () => {
    const g = resolveRule(toRule({ tier: 'topic', nodes: ['bean'], group_by: 'topic' }), posts, ctx).groups
    expect(g.map((x) => [x.label, x.posts.map((p) => p.id)])).toEqual([
      ['bean weirdo', ['c']],
      ['sensory', ['b']],
      ['roasting', ['a']],
    ])
  })

  it('lets a post sit in every tag group it wears', () => {
    const g = resolveRule(toRule({ tier: 'keyword', nodes: ['heat', 'asia'], group_by: 'keyword' }), posts, ctx).groups
    expect(Object.fromEntries(g.map((x) => [x.key, x.posts.map((p) => p.id)]))).toEqual({ asia: ['d', 'b'], heat: ['b', 'a'] })
  })
})
