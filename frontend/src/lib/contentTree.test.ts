import { describe, expect, it } from 'vitest'
import {
  ancestorsOf,
  buildTree,
  canReparent,
  childrenOf,
  depthOf,
  descendantIds,
  flattenTree,
  hasChildren,
  rootsOf,
  possibleParents,
} from './contentTree'

const m = (id: string, parent_id: string | null = null) => ({ id, parent_id })

/** The shape from the owner's sketch: three branches, one of them two deep. */
const site = [
  m('tuduy'),
  m('bean'),
  m('ghi'),
  m('roasting', 'bean'),
  m('biochem', 'bean'),
  m('heat', 'roasting'),
  m('maillard', 'roasting'),
  m('tanman', 'ghi'),
]

describe('rootsOf', () => {
  it('returns the branches, not what hangs off them', () => {
    expect(rootsOf(site).map((r) => r.id)).toEqual(['tuduy', 'bean', 'ghi'])
  })

  it('treats a table with no parents set as entirely top level', () => {
    const flat = [m('sensory'), m('biochem'), m('roasting')]
    expect(rootsOf(flat).map((r) => r.id)).toEqual(['sensory', 'biochem', 'roasting'])
  })

  it('reads a row from before the migration, which has no such column at all', () => {
    const old = [{ id: 'sensory' }, { id: 'biochem' }]
    expect(rootsOf(old).map((r) => r.id)).toEqual(['sensory', 'biochem'])
  })

  it('shows a row whose parent is missing rather than losing it', () => {
    // A private parent filtered out of the list would otherwise take its
    // children off every surface with it.
    const orphan = [m('roasting', 'bean'), m('ghi')]
    expect(rootsOf(orphan).map((r) => r.id)).toEqual(['roasting', 'ghi'])
  })
})

describe('childrenOf', () => {
  it('returns only what sits directly inside, not the whole subtree', () => {
    expect(childrenOf(site, 'bean').map((r) => r.id)).toEqual(['roasting', 'biochem'])
  })

  it('keeps the order it was given, which is the order the owner arranged', () => {
    const reordered = [m('bean'), m('biochem', 'bean'), m('roasting', 'bean')]
    expect(childrenOf(reordered, 'bean').map((r) => r.id)).toEqual(['biochem', 'roasting'])
  })

  it('is empty for a leaf', () => {
    expect(childrenOf(site, 'heat')).toEqual([])
    expect(hasChildren(site, 'heat')).toBe(false)
    expect(hasChildren(site, 'roasting')).toBe(true)
  })
})

describe('ancestorsOf', () => {
  it('reads top down, and leaves the row itself off the end', () => {
    expect(ancestorsOf(site, 'heat').map((r) => r.id)).toEqual(['bean', 'roasting'])
  })

  it('is empty at the top, which is what makes a breadcrumb stop', () => {
    expect(ancestorsOf(site, 'bean')).toEqual([])
  })

  it('grows by exactly one step per level, so nothing has to count them', () => {
    expect(depthOf(site, 'bean')).toBe(0)
    expect(depthOf(site, 'roasting')).toBe(1)
    expect(depthOf(site, 'heat')).toBe(2)
  })

  it('stops on a cycle instead of hanging the browser', () => {
    // The API refuses to write this. A walk that trusts that and is wrong
    // freezes the tab, and a frozen tab says nothing about what went wrong.
    const loop = [m('a', 'b'), m('b', 'a')]
    expect(ancestorsOf(loop, 'a').length).toBeLessThanOrEqual(2)
  })

  it('answers for an id that is not in the list at all', () => {
    expect(ancestorsOf(site, 'khong-co')).toEqual([])
  })
})

describe('descendantIds', () => {
  it('includes the row itself, so it can be handed straight to one query', () => {
    expect(descendantIds(site, 'bean').sort()).toEqual(
      ['bean', 'biochem', 'heat', 'maillard', 'roasting'].sort(),
    )
  })

  it('is just the row when nothing hangs off it', () => {
    expect(descendantIds(site, 'heat')).toEqual(['heat'])
  })

  it('terminates on a cycle', () => {
    const loop = [m('a', 'b'), m('b', 'a')]
    expect(descendantIds(loop, 'a').sort()).toEqual(['a', 'b'])
  })
})

describe('buildTree', () => {
  it('carries depth on every node so no caller has to work it out', () => {
    const tree = buildTree(site)
    expect(tree.map((n) => n.row.id)).toEqual(['tuduy', 'bean', 'ghi'])

    const bean = tree[1]
    expect(bean.depth).toBe(0)
    expect(bean.children.map((n) => n.row.id)).toEqual(['roasting', 'biochem'])
    expect(bean.children[0].depth).toBe(1)
    expect(bean.children[0].children.map((n) => n.row.id)).toEqual(['heat', 'maillard'])
    expect(bean.children[0].children[0].depth).toBe(2)
  })

  it('goes as deep as the data does, with nothing in it naming a limit', () => {
    const deep = [m('a'), m('b', 'a'), m('c', 'b'), m('d', 'c'), m('e', 'd')]
    const flat = flattenTree(buildTree(deep))
    expect(flat.map((n) => n.depth)).toEqual([0, 1, 2, 3, 4])
  })

  it('lists parents before their own children', () => {
    expect(flattenTree(buildTree(site)).map((n) => n.row.id)).toEqual([
      'tuduy',
      'bean',
      'roasting',
      'heat',
      'maillard',
      'biochem',
      'ghi',
      'tanman',
    ])
  })
})

describe('canReparent', () => {
  it('allows a move to the top', () => {
    expect(canReparent(site, 'roasting', null)).toEqual({ ok: true })
  })

  it('allows a move that deepens the tree', () => {
    expect(canReparent(site, 'tuduy', 'bean')).toEqual({ ok: true })
  })

  it('refuses a module inside itself', () => {
    const out = canReparent(site, 'bean', 'bean')
    expect(out.ok).toBe(false)
  })

  it('refuses a module inside its own descendant, which is the loop one step out', () => {
    const out = canReparent(site, 'bean', 'heat')
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.reason).toContain('descendant')
  })

  it('refuses a parent that does not exist, and says which one', () => {
    const out = canReparent(site, 'bean', 'khong-co')
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.reason).toContain('khong-co')
  })
})

describe('the list a parent picker may offer', () => {
  const tree = [
    { id: 'bean' },
    { id: 'roasting', parent_id: 'bean' },
    { id: 'heat', parent_id: 'roasting' },
    { id: 'sensory' },
  ]

  it('leaves out the module itself', () => {
    expect(possibleParents(tree, 'bean').map((r) => r.id)).not.toContain('bean')
  })

  it('leaves out everything already inside it, however deep', () => {
    // Filing bean weirdo inside Heat Transfer would make a branch with no top.
    expect(possibleParents(tree, 'bean').map((r) => r.id)).toEqual(['sensory'])
  })

  it('offers everything else, in the order it was given', () => {
    expect(possibleParents(tree, 'sensory').map((r) => r.id)).toEqual(['bean', 'roasting', 'heat'])
  })

  it('agrees with canReparent on every pair it offers and every pair it hides', () => {
    // The picker exists so a refused choice is never on screen; if the two
    // ever disagree, one of them is lying to the user.
    for (const child of tree) {
      const offered = new Set(possibleParents(tree, child.id).map((r) => r.id))
      for (const parent of tree) {
        expect(canReparent(tree, child.id, parent.id).ok).toBe(offered.has(parent.id))
      }
    }
  })

  it('offers nothing but the others when a module holds everything', () => {
    const chain = [{ id: 'a' }, { id: 'b', parent_id: 'a' }]
    expect(possibleParents(chain, 'a')).toEqual([])
  })
})
