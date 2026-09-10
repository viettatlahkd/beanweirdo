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

/*
 * Bài mở ra chiếm chín trên mười hai cột và thụt vào một cột, chứ không trọn bề
 * ngang: chủ site muốn nó đọc ra là một khối nổi lên TRONG trang ghi, không
 * phải một trang khác đè lên.
 */
const OPEN_COL = '2 / span 9'

const cards = () =>
  Array.from(document.querySelectorAll<HTMLElement>('div')).filter(
    // Thẻ bài: hoặc một ô trong chu kỳ dàn trang, hoặc mở hết chiều ngang.
    (d) => /^span [45]$/.test(d.style.gridColumn) || d.style.gridColumn === OPEN_COL,
  )

describe('Ghi 01 — mở bài tại chỗ khi có nhiều bài', () => {
  beforeEach(() => {
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

  it('mở một bài thì nó nở ra ba phần tư lưới, hai bài kia mờ đi', () => {
    render(<Notes />)
    fireEvent.click(screen.getByText('Bài B'))

    const open = cards().filter((x) => x.style.gridColumn === OPEN_COL)
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

describe('bề ngang thẻ trong lưới Ghi 01', () => {
  it('bài ảnh đứng vẫn giữ đúng bề ngang chu kỳ dàn trang', () => {
    /*
     * Batch là 8 bài + 7 ô feature, mỗi hàng 5·4·3 = 12 cột
     * (docs/spine/data-04-feature-cells.md), và `lib/notesGrid.ts` tính hàng
     * bằng chính những con số ấy. Cho một thẻ 7 cột thì 5+7 đã đầy hàng và ô
     * feature bị đẩy sang hàng sau — ảnh vốn nằm giữa hai bài rơi đi đâu mất.
     *
     * Chỗ hẹp của thẻ ảnh đứng giải bằng bề ngang ẢNH bên trong thẻ, không
     * bằng cách nong thẻ.
     */
    useModules.mockReturnValue({
      data: [{ id: 'ghi01', title: 'Ghi 01', accent: '#6FA8C0', on_color: '#123' }],
    })
    usePublishedPosts.mockReturnValue({
      data: [
        post('a', 'Bài A'),
        { ...post('b', 'Bài B'), template: 'bitesize', body: { portrait: true, text: 'x' } },
      ],
      loading: false,
      error: null,
    })

    const { container } = render(<Notes />)
    /*
     * Duyệt CON TRỰC TIẾP của lưới, không dùng `cards()`.
     *
     * `cards()` lọc theo chính `span 4|5` — nên một thẻ bị nong lên 7 cột sẽ
     * rơi ra ngoài danh sách và vòng lặp chạy qua chỗ trống mà vẫn xanh. Bài
     * kiểm lọc mất đúng cái nó định bắt thì không bắt gì cả.
     */
    const grid = Array.from(container.querySelectorAll<HTMLElement>('div')).find((d) =>
      /repeat\(12/.test(d.style.gridTemplateColumns),
    )!
    const widths = Array.from(grid.children).map((c) => (c as HTMLElement).style.gridColumn)
    expect(widths.length).toBeGreaterThan(0)
    for (const w of widths) expect(['span 3', 'span 4', 'span 5']).toContain(w)
  })
})
