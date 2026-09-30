import { describe, expect, it } from 'vitest'
import { indexModules, type ModuleRow } from '../data/useModules'
import { buildTree, flattenTree } from '../lib/contentTree'
import { countUnder } from '../lib/postGroups'
import type { PostRow } from '../data/usePublishedPosts'

/**
 * The rows the sidebar draws, without drawing them.
 *
 * `Sidebar` pulls in the whole navigation and auth tree, far heavier than what
 * is worth checking here — the same reason `Sidebar.marks.test.tsx` copies
 * `ModuleMark` instead of rendering the bar. What this covers is the ordering
 * the sidebar composes: filter, sort, nest, count. Each step is tested on its
 * own elsewhere; the interesting part is what they do together.
 */

const mod = (
  id: string,
  o: Partial<{ parent_id: string | null; kind: 'normal' | 'special'; visibility: 'public' | 'private'; sort_order: number }> = {},
) =>
  ({
    id,
    title: id,
    parent_id: o.parent_id ?? null,
    kind: o.kind ?? 'normal',
    visibility: o.visibility ?? 'public',
    sort_order: o.sort_order ?? 1,
  }) as unknown as ModuleRow

const post = (module_id: string) => ({ module_id }) as unknown as PostRow

/** Exactly what `section()` walks. */
const rowsOf = (modules: ModuleRow[]) =>
  flattenTree(buildTree(indexModules(modules))).map((n) => ({ id: n.row.id, depth: n.depth }))

describe('the sidebar rows', () => {
  it('is a flat list of depth 0 while nothing is filed inside anything', () => {
    const flat = [mod('sensory', { sort_order: 1 }), mod('biochem', { sort_order: 2 })]
    expect(rowsOf(flat)).toEqual([
      { id: 'sensory', depth: 0 },
      { id: 'biochem', depth: 0 },
    ])
  })

  it('puts each branch directly under its parent, one step in', () => {
    const tree = [
      mod('bean', { sort_order: 1 }),
      mod('ghi', { sort_order: 2 }),
      mod('roasting', { parent_id: 'bean', sort_order: 3 }),
      mod('biochem', { parent_id: 'bean', sort_order: 4 }),
    ]
    expect(rowsOf(tree)).toEqual([
      { id: 'bean', depth: 0 },
      { id: 'roasting', depth: 1 },
      { id: 'biochem', depth: 1 },
      { id: 'ghi', depth: 0 },
    ])
  })

  it('keeps indenting past the third level, with nothing naming a limit', () => {
    const deep = [
      mod('a', { sort_order: 1 }),
      mod('b', { parent_id: 'a', sort_order: 2 }),
      mod('c', { parent_id: 'b', sort_order: 3 }),
      mod('d', { parent_id: 'c', sort_order: 4 }),
    ]
    expect(rowsOf(deep).map((r) => r.depth)).toEqual([0, 1, 2, 3])
  })

  it('never lists a private module, nor strands what was inside it', () => {
    // The child has to keep appearing somewhere: a module nobody can reach
    // reads as a module that was deleted.
    const withPrivate = [
      mod('rieng', { visibility: 'private', sort_order: 1 }),
      mod('con', { parent_id: 'rieng', sort_order: 2 }),
    ]
    expect(rowsOf(withPrivate)).toEqual([{ id: 'con', depth: 0 }])
  })

  it('keeps a child under its parent whatever the sort says', () => {
    // tanman sorts first on its own number, but staying under its parent is
    // the stronger promise — the indent is what says where it belongs.
    const mixed = [
      mod('ghi01', { kind: 'special', sort_order: 101 }),
      mod('tanman', { parent_id: 'ghi01', kind: 'normal', sort_order: 1 }),
      mod('sensory', { kind: 'normal', sort_order: 20 }),
    ]
    expect(rowsOf(mixed)).toEqual([
      { id: 'sensory', depth: 0 },
      { id: 'ghi01', depth: 0 },
      { id: 'tanman', depth: 1 },
    ])
  })
})

describe('the count beside a name', () => {
  const tree = [
    mod('bean', { sort_order: 1 }),
    mod('roasting', { parent_id: 'bean', sort_order: 2 }),
    mod('heat', { parent_id: 'roasting', sort_order: 3 }),
  ]

  it('covers the whole branch, not just what is filed directly under it', () => {
    const posts = [post('roasting'), post('roasting'), post('heat')]
    // A heading that holds everything one level down used to read "0 bài".
    expect(countUnder(posts, tree, 'bean')).toBe(3)
    expect(countUnder(posts, tree, 'roasting')).toBe(3)
    expect(countUnder(posts, tree, 'heat')).toBe(1)
  })

  it('still shows zero for a module that genuinely holds nothing', () => {
    // Rule 05: a public module always shows, count and all, even at nothing.
    expect(countUnder([], tree, 'bean')).toBe(0)
  })
})
