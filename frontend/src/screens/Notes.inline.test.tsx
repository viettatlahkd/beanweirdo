import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const usePublishedPosts = vi.fn()
const useModules = vi.fn()
vi.mock('../data/usePublishedPosts', () => ({ usePublishedPosts: () => usePublishedPosts() }))
vi.mock('../data/useModules', () => ({ useModules: () => useModules() }))
vi.mock('../components/Breadcrumbs', () => ({ Breadcrumbs: () => null }))

const { Notes } = await import('./Notes')

/**
 * Three posts filed under Ghi 01, because one cannot show what opening does to
 * the others. Opening is only half the behaviour; the half worth testing is
 * what happens to everything else.
 */
const post = (id: string, en: string, published_at = '2026-08-01T00:00:00Z') => ({
  id,
  published_at,
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

/*
 * Bài mở ra chiếm chín trên mười hai cột và thụt vào một cột, chứ không trọn bề
 * ngang: chủ site muốn nó đọc ra là một khối nổi lên TRONG trang ghi, không
 * phải một trang khác đè lên.
 */
const OPEN_COL = '2 / span 9'

const cards = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-note]')).filter(
    // Thẻ bài: một ô của khối 8 ô (cỡ nhỏ 4 cột, cỡ lớn 5 cột), hoặc bài đang mở.
    (d) => /^\d+ \/ span [45]$/.test(d.style.gridColumn) || d.style.gridColumn === OPEN_COL,
  )

describe('Ghi 01 — mở bài tại chỗ khi có nhiều bài', () => {
  beforeEach(() => {
    useModules.mockReturnValue({
      data: [{ id: 'ghi01', title: 'Ghi 01', accent: '#6FA8C0', on_color: '#123' }],
    })
    usePublishedPosts.mockReturnValue({
      data: [
        post('a', 'Bài A', '2026-08-03T00:00:00Z'),
        post('b', 'Bài B', '2026-08-02T00:00:00Z'),
        post('c', 'Bài C', '2026-08-01T00:00:00Z'),
      ],
      loading: false,
      error: null,
    })
  })

  it('ba bài lấp ba ô cuối của khối, bài cũ nhất ở ô 7, không bài nào mờ', () => {
    render(<Notes />)
    const c = cards()
    expect(c).toHaveLength(3)
    // Chủ site 2026-09-24: bài cũ nhất vào ô 7, bài mới hơn lấp ngược lên.
    expect(c.map((x) => [x.textContent?.includes('Bài C'), x.dataset.slot])).toContainEqual([true, '7'])
    expect(c.map((x) => x.dataset.slot).sort()).toEqual(['5', '6', '7'])
    expect(new Set(c.map((x) => x.style.gridColumn)).size).toBeGreaterThan(1)
    expect(new Set(c.map((x) => x.style.marginTop)).size).toBeGreaterThan(1)
    expect(c.every((x) => x.style.opacity === '1')).toBe(true)
  })

  it('khối đầy tám bài có hai cỡ: ô 0 và ô 5 lớn, còn lại nhỏ', () => {
    usePublishedPosts.mockReturnValue({
      data: 'abcdefgh'.split('').map((id) => post(id, 'Bài ' + id)),
      loading: false,
      error: null,
    })
    render(<Notes />)
    const big = cards()
      .filter((x) => / \/ span 5$/.test(x.style.gridColumn))
      .map((x) => x.dataset.slot)
    expect(big.sort()).toEqual(['0', '5'])
    expect(cards()).toHaveLength(8)
  })

  it('mở một bài thì nó nở ra ba phần tư lưới, hai bài kia mờ đi', () => {
    render(<Notes />)
    fireEvent.click(screen.getByText('Bài B'))

    const open = cards().filter((x) => x.style.gridColumn === OPEN_COL)
    const rest = cards().filter((x) => x.style.gridColumn !== OPEN_COL)
    expect(open).toHaveLength(1)
    expect(open[0].textContent).toContain('Bài B')
    expect(rest).toHaveLength(2)
    expect(rest.every((x) => x.style.opacity === '0.18')).toBe(true)
  })

  it('mở bài khác thì bài đang mở tự thu — mỗi lúc chỉ một bài', () => {
    render(<Notes />)
    fireEvent.click(screen.getByText('Bài B'))
    fireEvent.click(screen.getByText('Bài C'))
    const open = cards().filter((x) => x.style.gridColumn === OPEN_COL)
    expect(open).toHaveLength(1)
    expect(open[0].textContent).toContain('Bài C')
  })

  it('bấm lại chính bài đang mở thì thu về như cũ', () => {
    render(<Notes />)
    fireEvent.click(screen.getByText('Bài B'))
    fireEvent.click(screen.getByText('Bài B'))
    expect(cards().filter((x) => x.style.gridColumn === OPEN_COL)).toHaveLength(0)
    expect(cards().every((x) => x.style.opacity === '1')).toBe(true)
  })
})
