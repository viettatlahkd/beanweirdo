import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useNotes = vi.fn()
const usePublishedPosts = vi.fn()
const useModules = vi.fn()
vi.mock('../data/useNotes', () => ({ useNotes: () => useNotes() }))
vi.mock('../data/usePublishedPosts', () => ({ usePublishedPosts: () => usePublishedPosts() }))
vi.mock('../data/useModules', () => ({ useModules: () => useModules() }))
vi.mock('../components/Breadcrumbs', () => ({ Breadcrumbs: () => null }))

const { Notes } = await import('./Notes')

/**
 * Three posts filed under Ghi 01, because one cannot show what opening does to
 * the others. Opening is only half the behaviour; the half worth testing is
 * what happens to everything else.
 */
const post = (id: string, en: string) => ({
  id,
  module_id: 'ghi01',
  en,
  vi: 'mô tả',
  lead: null,
  kind: 'note',
  date_label: '2026.08',
  template: 'memo',
  body: { specs: [], sections: [] },
  hero_caption: null,
  hero_image_url: null,
  pull_quote: null,
  further_reading: null,
})

const cards = () =>
  Array.from(document.querySelectorAll<HTMLElement>('div')).filter(
    // Thẻ bài: hoặc một ô trong chu kỳ dàn trang, hoặc mở hết chiều ngang.
    (d) => /^span [45]$/.test(d.style.gridColumn) || d.style.gridColumn === '1 / -1',
  )

describe('Ghi 01 — mở bài tại chỗ khi có nhiều bài', () => {
  beforeEach(() => {
    useNotes.mockReturnValue({ notes: [], loading: false, error: null })
    useModules.mockReturnValue({
      data: [{ id: 'ghi01', title: 'Ghi 01', accent: '#6FA8C0', on_color: '#123' }],
    })
    usePublishedPosts.mockReturnValue({
      data: [post('a', 'Bài A'), post('b', 'Bài B'), post('c', 'Bài C')],
      loading: false,
      error: null,
    })
  })

  it('đóng hết thì mỗi bài chiếm 5 cột và không bài nào mờ', () => {
    render(<Notes />)
    const c = cards()
    expect(c).toHaveLength(3)
    // Không thẳng cột: chu kỳ dàn trang cho mỗi bài một cỡ và một độ trồi.
    expect(new Set(c.map((x) => x.style.gridColumn)).size).toBeGreaterThan(1)
    expect(new Set(c.map((x) => x.style.marginTop)).size).toBeGreaterThan(1)
    expect(c.every((x) => x.style.opacity === '1')).toBe(true)
  })

  it('mở một bài thì nó rộng hết lưới, hai bài kia mờ đi', () => {
    render(<Notes />)
    fireEvent.click(screen.getByText('Bài B'))

    const open = cards().filter((x) => x.style.gridColumn === '1 / -1')
    const rest = cards().filter((x) => /^span [45]$/.test(x.style.gridColumn))
    expect(open).toHaveLength(1)
    expect(open[0].textContent).toContain('Bài B')
    expect(rest).toHaveLength(2)
    expect(rest.every((x) => x.style.opacity === '0.18')).toBe(true)
  })

  it('mở bài khác thì bài đang mở tự thu — mỗi lúc chỉ một bài', () => {
    render(<Notes />)
    fireEvent.click(screen.getByText('Bài B'))
    fireEvent.click(screen.getByText('Bài C'))
    const open = cards().filter((x) => x.style.gridColumn === '1 / -1')
    expect(open).toHaveLength(1)
    expect(open[0].textContent).toContain('Bài C')
  })

  it('bấm lại chính bài đang mở thì thu về như cũ', () => {
    render(<Notes />)
    fireEvent.click(screen.getByText('Bài B'))
    fireEvent.click(screen.getByText('Bài B'))
    expect(cards().filter((x) => x.style.gridColumn === '1 / -1')).toHaveLength(0)
    expect(cards().every((x) => x.style.opacity === '1')).toBe(true)
  })
})
