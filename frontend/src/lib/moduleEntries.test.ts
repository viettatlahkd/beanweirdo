import { describe, expect, it } from 'vitest'
import { entriesOf, entryViews } from './moduleEntries'
import type { ModuleRow } from '../data/useModules'
import type { PostRow } from '../data/usePublishedPosts'

/*
 * A module page lists what is inside the module — which, since 0025, can be
 * another module. Before this, "inside" meant posts only, so a branch page was
 * a title over an empty grid.
 */

const mod = (id: string, o: Partial<ModuleRow> = {}): ModuleRow =>
  ({
    id,
    title: id,
    parent_id: null,
    accent: `#acc-${id}`,
    tint: `#t1-${id}`,
    tint2: `#t2-${id}`,
    blurb: `blurb ${id}`,
    concept: `concept ${id}`,
    img1: null,
    ...o,
  }) as unknown as ModuleRow

const post = (id: string, o: Partial<PostRow> = {}): PostRow =>
  ({
    id,
    module_id: 'bean',
    en: `title ${id}`,
    vi: `mô tả ${id}`,
    kind: 'essay',
    date_label: `ngày ${id}`,
    lead: null,
    body: null,
    hero_image_url: null,
    ...o,
  }) as unknown as PostRow

const TREE = [
  mod('bean'),
  mod('roasting', { parent_id: 'bean' }),
  mod('biochem', { parent_id: 'bean' }),
  mod('sensory'),
]

describe('what a module page lists', () => {
  it('lists the modules filed inside it, which used to be nothing at all', () => {
    const rows = entriesOf('bean', TREE, [])
    expect(rows.map((r) => [r.type, r.id])).toEqual([
      ['module', 'roasting'],
      ['module', 'biochem'],
    ])
  })

  it('puts the branches above the loose posts', () => {
    // Sections first, then the pages that were filed straight into the branch.
    const rows = entriesOf('bean', TREE, [post('p1'), post('p2')])
    expect(rows.map((r) => r.type)).toEqual(['module', 'module', 'post', 'post'])
  })

  it('reads exactly as before for a module holding nothing but posts', () => {
    const rows = entriesOf('sensory', TREE, [post('p1'), post('p2')])
    expect(rows.map((r) => [r.type, r.id])).toEqual([
      ['post', 'p1'],
      ['post', 'p2'],
    ])
  })

  it('keeps the order it was handed, so the screen decides the sort', () => {
    const reversed = [mod('bean'), mod('biochem', { parent_id: 'bean' }), mod('roasting', { parent_id: 'bean' })]
    expect(entriesOf('bean', reversed, []).map((r) => r.id)).toEqual(['biochem', 'roasting'])
  })

  it('shows nothing extra for a module nobody filed anything under', () => {
    expect(entriesOf('roasting', TREE, [])).toEqual([])
  })
})

describe('how a row reads', () => {
  const rows = entryViews(entriesOf('bean', TREE, [post('p1'), post('p2')]), mod('bean'))

  it('names a branch by its own title and describes it with its own blurb', () => {
    expect(rows[0]).toMatchObject({
      type: 'module',
      title: 'roasting',
      description: 'blurb roasting',
      label: 'mục lục',
      trailing: 'concept roasting',
    })
  })

  it('gives a branch its own colour, not a tint of the module above it', () => {
    // Rule 01: the colour is what a module is recognised by before its name is
    // read, so a row opening bean weirdo cannot wear sensory's tint.
    expect(rows[0].tint).toBe('#acc-roasting')
    expect(rows[1].tint).toBe('#acc-biochem')
  })

  it('still alternates the two tints down the posts', () => {
    expect(rows[2].tint).toBe('#t1-bean')
    expect(rows[3].tint).toBe('#t2-bean')
  })

  it('does not count branches into the tint run', () => {
    // Two branches ahead of them used to push both posts onto the same tint,
    // which reads as one block rather than two rows.
    const onlyPosts = entryViews(entriesOf('sensory', TREE, [post('p1'), post('p2')]), mod('bean'))
    expect(onlyPosts.map((r) => r.tint)).toEqual(rows.slice(2).map((r) => r.tint))
  })

  it('reads a post exactly as the layouts read it before', () => {
    expect(rows[2]).toMatchObject({
      type: 'post',
      title: 'title p1',
      description: 'mô tả p1',
      label: 'essay',
      trailing: 'ngày p1',
      image: null,
    })
  })

  it('prefers a post subtitle over the short phrase, as the listing always did', () => {
    const [row] = entryViews(entriesOf('sensory', TREE, [post('p1', { lead: 'phụ đề' })]), mod('bean'))
    expect(row.description).toBe('phụ đề')
  })

  it('carries a branch picture when the module has one', () => {
    const withShot = [mod('bean'), mod('roasting', { parent_id: 'bean', img1: '/roasting.jpg' })]
    const [row] = entryViews(entriesOf('bean', withShot, []), mod('bean'))
    expect(row.image).toBe('/roasting.jpg')
  })
})
