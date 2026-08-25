import { describe, expect, it, vi } from 'vitest'
import { buildCrumbs, crumbBack } from './crumbs'
import type { Nav } from './nav'

/*
 * A trail that does not walk is not a trail.
 *
 * Every admin screen's crumbs were labels with no `go`: Admin, Backend, Notes,
 * Templates — none of them went anywhere. The bar read like a way back and was
 * a caption. And `←` from an admin screen left the area entirely, landing on
 * the public journal, which is not one step back from anywhere.
 */
const SECTIONS = { Public: 'Public', Practice: 'Practice', Admin: 'Admin' } as never
const MODULES = [{ id: 'sensory', title: 'sensory' }] as never

function navFor(screen: string, area = 'admin'): Nav {
  return {
    screen,
    area,
    moduleId: 'sensory',
    articleFrom: 'module',
    goLanding: vi.fn(),
    goHome: vi.fn(),
    goCms: vi.fn(),
    goArt: vi.fn(),
    goLogic: vi.fn(),
    goTemplates: vi.fn(),
    goArchive: vi.fn(),
    goHours: vi.fn(),
    goNotes: vi.fn(),
    openModule: vi.fn(),
    openPost: vi.fn(),
    editPost: vi.fn(),
    newPost: vi.fn(),
  } as unknown as Nav
}

const ADMIN = ['cms', 'art', 'logic', 'templates', 'archive']
const PUBLIC = ['home', 'module', 'notes', 'hours']

describe('every crumb but the last one leads somewhere', () => {
  /*
   * Content management is the one screen this cannot ask for. Its trail reads
   * `Admin › Backend › Content management`, and all three name the page you are
   * already on — the first two are the group it heads, not places to go back
   * to. See the block below, which asserts the opposite for that screen.
   */
  for (const screen of [...ADMIN, ...PUBLIC].filter((s) => s !== 'cms')) {
    it(`${screen}`, () => {
      const nav = navFor(screen, ADMIN.includes(screen) ? 'admin' : 'public')
      const crumbs = buildCrumbs(nav, MODULES, SECTIONS)
      expect(crumbs.length).toBeGreaterThan(0)
      crumbs.slice(0, -1).forEach((c) => {
        expect(c.go, `"${c.label}" trên màn ${screen} không đi đâu cả`).toBeTypeOf('function')
      })
    })
  }

  /* The last crumb is the page being looked at, so it stays put. */
  it('leaves the current page unclickable', () => {
    const crumbs = buildCrumbs(navFor('cms'), MODULES, SECTIONS)
    expect(crumbs[crumbs.length - 1].go).toBeUndefined()
  })
})

describe('the back arrow', () => {
  it('stays inside admin instead of leaving for the public journal', () => {
    for (const screen of ['templates', 'art', 'logic']) {
      const nav = navFor(screen)
      crumbBack(nav)()
      expect(nav.goCms, `← trên màn ${screen} không về admin`).toHaveBeenCalled()
    }
  })

  it('walks one step back on a module page', () => {
    const nav = navFor('module', 'public')
    crumbBack(nav)()
    expect(nav.goHome).toHaveBeenCalled()
  })
})

/*
 * Ba chỗ patch mồi chưa phủ.
 *
 * Cái đầu là mặt sau của chính lỗi vừa sửa: một mẩu không bấm được nói dối
 * bằng cách im lặng, một mẩu bấm được mà không đi đâu nói dối bằng cách hứa.
 */
describe('crumbs — không mẩu nào trỏ về chỗ đang đứng', () => {
  it('leaves Admin and Backend inert on Content management itself', () => {
    const nav = navFor('cms')
    const trail = buildCrumbs(nav, MODULES, SECTIONS)

    // Cả ba mẩu đều là Content management theo một nghĩa nào đó, nên không mẩu
    // nào được nhận con trỏ bấm.
    expect(trail.map((c) => c.label)).toEqual(['Admin', 'Backend', 'Content management'])
    expect(trail.filter((c) => c.go)).toHaveLength(0)
  })

  it('still walks from the other admin screens', () => {
    // Chỉ Content management mới là chỗ đang đứng; ở Design system thì hai mẩu
    // đầu vẫn phải đưa về được.
    for (const screen of ['art', 'logic', 'archive']) {
      const trail = buildCrumbs(navFor(screen), MODULES, SECTIONS)
      expect(trail.slice(0, -1).every((c) => c.go), screen).toBe(true)
    }
  })
})
