import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Memo } from './Memo'
import type { MemoPostData } from './types'

/**
 * Measurements taken from the design's memo screen, which nobody had compared
 * against the code — an older export was being read, one that did not contain
 * this screen at all, so it was reported as having no design to check.
 */
const post: MemoPostData = {
  band: { bg: '#6FA8C0', fg: '#123' },
  title: 'taste modality',
  sections: [
    {
      h: 'Kết luận',
      callout: { h: 'Cân bằng giữa chua và đắng', lines: ['— chọn chua'] },
      items: [{ runs: [{ t: 'Nhiệt 91°C', u: true }, { t: ', thay cho 92–93' }] }],
    },
    { h: 'Giai đoạn', phases: [
      { n: '01', label: 'blooming', lines: ['— chua mạnh'] },
      { n: '02', label: 'giữa dòng', lines: [] },
    ] },
    { h: 'Liều', table: { head: ['Liều', 'Pour 1', 'Pour 2', 'Pour 3'], rows: [['15g', '50', '60', '60']] } },
  ],
}

const grids = (c: HTMLElement) =>
  Array.from(c.querySelectorAll<HTMLElement>('div')).map((d) => d.style.gridTemplateColumns)

describe('memo khớp design', () => {
  it('bảng giữ cột nhãn hẹp 80px, các cột số chia đều', () => {
    const { container } = render(<Memo post={post} />)
    expect(grids(container)).toContain('80px repeat(3, minmax(0,1fr))')
  })

  it('giai đoạn dùng lưới 34px, không phải 54px', () => {
    const { container } = render(<Memo post={post} />)
    expect(grids(container)).toContain('34px minmax(0,1fr)')
    expect(grids(container)).not.toContain('54px minmax(0,1fr)')
  })

  it('mỗi giai đoạn một màu, không cùng một màu xám', () => {
    const { container } = render(<Memo post={post} />)
    const nums = Array.from(container.querySelectorAll<HTMLElement>('div')).filter((d) =>
      /^0\d$/.test(d.textContent ?? ''),
    )
    const colours = new Set(nums.map((n) => n.style.color))
    expect(colours.size).toBeGreaterThan(1)
  })

  it('khối kết luận có nền riêng, sinh từ màu bài', () => {
    // Nền ấy từng là một mã màu cố định. Nay nó nhạt cùng tông với màu module,
    // nên test chốt ý — có nền riêng, và nền ấy mang tông của bài — chứ không
    // chốt một mã màu mà mỗi module một khác.
    const { container } = render(<Memo post={{ ...post, band: { bg: '#C25C7C', fg: '#FFFFFF' } }} />)
    const grounds = Array.from(container.querySelectorAll<HTMLElement>('div'))
      .map((d) => d.style.background)
      .filter((b) => b.startsWith('rgb'))
      .map((b) => b.match(/\d+/g)!.map(Number))
    const tinted = grounds.find(([r, g, b]) => r > 200 && r > g && b > g)
    expect(tinted).toBeTruthy()
  })

  it('số liệu đáng chú ý có gạch chân mảnh, không đổi màu', () => {
    const { container } = render(<Memo post={post} />)
    const underlined = Array.from(container.querySelectorAll<HTMLElement>('span')).find(
      (s) => s.style.borderBottomWidth === '1px',
    )
    expect(underlined?.textContent).toBe('Nhiệt 91°C')
    expect(underlined?.style.color).toBe('')
  })
})
