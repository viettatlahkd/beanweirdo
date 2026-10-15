import { describe, expect, it, vi } from 'vitest'
import { buildCrumbs, crumbBack } from './crumbs'
import type { Nav } from './nav'

/*
 * The trail is as long as the branch is deep.
 *
 * `buildCrumbs` used to return hand-written arrays of a fixed length — one
 * entry for the module and no room for anything above it. So `Trang chủ › Mục
 * lục › sensory › …` was not a trail the code walked, it was a trail the code
 * spelled out, and a third level had nowhere to appear.
 *
 * Rule 05 still describes the three-step version. It stops being true here.
 */


/** The owner's sketch: bean weirdo holds Roasting, Roasting holds Heat. */
const TREE = [
  { id: 'bean', title: 'bean weirdo', parent_id: null },
  { id: 'roasting', title: 'Roasting', parent_id: 'bean' },
  { id: 'heat', title: 'Heat Transfer', parent_id: 'roasting' },
  { id: 'sensory', title: 'sensory', parent_id: null },
] as never

const navFor = (screen: string, moduleId: string, articleFrom = 'module'): Nav =>
  ({
    screen,
    area: 'public',
    moduleId,
    articleFrom,
    goLanding: vi.fn(),
    goHome: vi.fn(),
    goCms: vi.fn(),
    goArchive: vi.fn(),
    openModule: vi.fn(),
    openArticle: vi.fn(),
  }) as never

describe('the trail grows with the tree', () => {
  it('names every branch on the way down to a module', () => {
    const trail = buildCrumbs(navFor('module', 'roasting'), TREE)
    expect(trail.map((c) => c.label)).toEqual(['Trang chủ', 'Mục lục', 'bean weirdo', 'Roasting'])
  })

  it('grows again one level deeper, with no code that counts levels', () => {
    const trail = buildCrumbs(navFor('module', 'heat'), TREE)
    expect(trail.map((c) => c.label)).toEqual([
      'Trang chủ',
      'Mục lục',
      'bean weirdo',
      'Roasting',
      'Heat Transfer',
    ])
  })

  it('reads exactly as before for a module still at the top', () => {
    const trail = buildCrumbs(navFor('module', 'sensory'), TREE)
    expect(trail.map((c) => c.label)).toEqual(['Trang chủ', 'Mục lục', 'sensory'])
  })

  it('puts the branches into a post trail too', () => {
    const trail = buildCrumbs(navFor('article', 'heat'), TREE, { trailing: 'Dẫn nhiệt' })
    expect(trail.map((c) => c.label)).toEqual([
      'Trang chủ',
      'Mục lục',
      'bean weirdo',
      'Roasting',
      'Heat Transfer',
      'Dẫn nhiệt',
    ])
  })

  it('leaves every branch clickable and only the current page inert', () => {
    const trail = buildCrumbs(navFor('module', 'heat'), TREE)
    expect(trail.slice(0, -1).every((c) => typeof c.go === 'function')).toBe(true)
    expect(trail[trail.length - 1].go).toBeUndefined()
  })

  it('opens the branch it names, not the module being looked at', () => {
    const nav = navFor('module', 'heat')
    const trail = buildCrumbs(nav, TREE)
    trail[2].go?.()
    expect(nav.openModule).toHaveBeenCalledWith('bean')
  })
})

describe('the back arrow walks one branch, not all of them', () => {
  it('steps from Roasting up to bean weirdo', () => {
    const nav = navFor('module', 'roasting')
    crumbBack(nav, undefined, undefined, TREE)()
    expect(nav.openModule).toHaveBeenCalledWith('bean')
    expect(nav.goHome).not.toHaveBeenCalled()
  })

  it('steps from the deepest module to the one directly above it', () => {
    const nav = navFor('module', 'heat')
    crumbBack(nav, undefined, undefined, TREE)()
    expect(nav.openModule).toHaveBeenCalledWith('roasting')
  })

  it('still reaches the index from a module at the top', () => {
    const nav = navFor('module', 'sensory')
    crumbBack(nav, undefined, undefined, TREE)()
    expect(nav.goHome).toHaveBeenCalled()
  })

  it('reaches the index when the caller hands over no tree at all', () => {
    // Every caller but one passes nothing, and the answer has to stay the one
    // the arrow always gave.
    const nav = navFor('module', 'roasting')
    crumbBack(nav)()
    expect(nav.goHome).toHaveBeenCalled()
  })
})
