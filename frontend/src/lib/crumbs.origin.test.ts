import { describe, expect, it, vi } from 'vitest'
import { buildCrumbs, crumbBack } from './crumbs'
import type { Nav } from './nav'

/*
 * Thanh breadcrumb kể lại đường người đọc đã đi. Nó chỉ kể đúng nếu chỗ mở bài
 * ra nói thật mình là ai.
 *
 * `openArticle(id, from)` mặc định `from = 'admin'`, và hai chỗ gọi nó đều
 * không truyền gì: Archive, và nút sang bài bên cạnh ngay trong một bài. Nên
 * mở một bài từ Archive dựng ra `Admin › Templates › Tên bài` — một con đường
 * người đọc chưa từng đi qua.
 */
const SECTIONS = { Public: 'Public', Practice: 'Practice', Admin: 'Admin' } as never
const MODULES = [{ id: 'sensory', title: 'sensory' }] as never

const navFor = (articleFrom: 'module' | 'admin' | 'archive'): Nav =>
  ({
    screen: 'article',
    area: 'public',
    moduleId: 'sensory',
    articleFrom,
    goLanding: vi.fn(),
    goHome: vi.fn(),
    goCms: vi.fn(),
    goTemplates: vi.fn(),
    goArchive: vi.fn(),
    openModule: vi.fn(),
    openArticle: vi.fn(),
  }) as never

describe('đường dẫn của một bài kể đúng nơi nó được mở ra', () => {
  it('reads as a public trail when the post was opened from a module', () => {
    const trail = buildCrumbs(navFor('module'), MODULES, SECTIONS, { trailing: 'Bộ từ vựng' })

    expect(trail.map((c) => c.label)).toEqual(['Trang chủ', 'Mục lục', 'sensory', 'Bộ từ vựng'])
  })

  it('only says Templates when the post really was opened from there', () => {
    const trail = buildCrumbs(navFor('admin'), MODULES, SECTIONS, { trailing: 'Bộ từ vựng' })

    expect(trail.map((c) => c.label)).toEqual(['Admin', 'Templates', 'Bộ từ vựng'])
    // Mẩu Templates phải đi được — nó là chỗ thật sự quay lại được.
    expect(trail[1].go).toBeTypeOf('function')
  })

  it('goes back through Archive when that is the door the reader used', () => {
    const trail = buildCrumbs(navFor('archive'), MODULES, SECTIONS, { trailing: 'Bộ từ vựng' })

    // Không phải Templates: người đọc chưa từng chạm vào màn đó.
    expect(trail.map((c) => c.label)).toEqual(['Admin', 'Archive', 'Bộ từ vựng'])
    expect(trail[1].go).toBeTypeOf('function')
  })

  it('sends the back arrow to the door, not out of the area', () => {
    const nav = navFor('archive')
    crumbBack(nav)()

    expect(nav.goArchive).toHaveBeenCalled()
  })
})
