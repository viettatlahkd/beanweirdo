import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Report } from './Report'
import type { ReportPostData, ReportTable } from './types'

const post = (table: ReportTable): ReportPostData => ({
  title: 'Rang thử',
  blocks: [{ id: 'b1', type: 'table', table }],
})

const table: ReportTable = {
  columns: ['Mốc', 'Thời gian', 'Nhiệt'],
  rows: [{ cells: ['Sấy', '0:00', '196°C'] }],
}

const cols = (c: HTMLElement) => Array.from(c.querySelectorAll("col")).map((x) => (x as HTMLElement).style.width)

describe('column widths on the page', () => {
  it('gives each column the share the writer set', () => {
    const { container } = render(<Report post={post({ ...table, widths: [50, 20, 30] })} />)
    expect(cols(container)).toEqual(['50%', '20%', '30%'])
  })

  it('splits evenly for a table written before widths existed', () => {
    const { container } = render(<Report post={post(table)} />)
    expect(new Set(cols(container)).size).toBe(1)
  })

  it('ignores a stored list that no longer matches the columns', () => {
    const { container } = render(<Report post={post({ ...table, widths: [70, 30] })} />)
    expect(new Set(cols(container)).size).toBe(1)
  })
})

describe('numbers in a report', () => {
  it('line up in table cells', () => {
    const { getByText } = render(<Report post={post(table)} />)
    expect(getComputedStyle(getByText('196°C')).fontVariantNumeric).toBe('tabular-nums')
  })

  it('line up under a chart', () => {
    const { getByText } = render(
      <Report
        post={{
          title: 'Rang thử',
          blocks: [{ type: 'chart', points: [{ label: '0:00', heightPct: 40 }] }],
        }}
      />,
    )
    expect(getComputedStyle(getByText('0:00')).fontVariantNumeric).toBe('tabular-nums')
  })

  it('line up in the metrics row', () => {
    const { getByText } = render(
      <Report
        post={{ title: 'Rang thử', blocks: [{ type: 'metrics', items: [{ label: 'Charge', value: '196°C' }] }] }}
      />,
    )
    expect(getComputedStyle(getByText('196°C')).fontVariantNumeric).toBe('tabular-nums')
  })
})

describe('the spacing rhythm', () => {
  it('keeps every block gap on the 8 / 20 / 40 / 64 / 96 scale', () => {
    const scale = [0, 8, 20, 40, 64, 96]
    const { container } = render(
      <Report
        post={{
          title: 'Rang thử',
          blocks: [
            { type: 'meta', text: 'a' },
            { type: 'heading', text: 'b' },
            { type: 'paragraph', text: 'c' },
            { type: 'metrics', items: [{ label: 'k', value: '1' }] },
            { type: 'chart', points: [{ label: 'x', heightPct: 10 }] },
            table && { type: 'table', table },
            { type: 'image', caption: 'd' },
          ].filter(Boolean) as ReportPostData['blocks'],
        }}
      />,
    )
    const gaps = Array.from(container.querySelectorAll('[data-testid^="report-block-"]')).flatMap((el) => {
      const s = getComputedStyle(el as HTMLElement)
      return [s.marginTop, s.marginBottom].map((v) => parseInt(v || '0', 10) || 0)
    })
    expect(gaps.filter((g) => !scale.includes(g))).toEqual([])
  })
})

describe('a post wears its module’s colour all the way down', () => {
  const pink = (blocks: ReportPostData['blocks']): ReportPostData => ({
    title: 'Rang thử',
    band: { bg: '#C25C7C', fg: '#FFFFFF' },
    blocks,
  })

  const rgb = (c: string) => c.match(/\d+/g)!.map(Number)

  it('tints the table headings, not the template’s own blue', () => {
    const { getByText } = render(<Report post={pink([{ type: 'table', table }])} />)
    const [r, g, b] = rgb(getComputedStyle(getByText('Mốc')).color)
    expect(r).toBeGreaterThan(g)
    expect(b).toBeGreaterThan(g)
  })

  it('tints the chart bars', () => {
    const { container } = render(
      <Report post={pink([{ type: 'chart', points: [{ label: '0:00', heightPct: 40 }] }])} />,
    )
    const bar = container.querySelector('[data-testid="report-block-0"] div div div') as HTMLElement
    expect(rgb(bar.style.background)).toEqual([194, 92, 124])
  })

  it('tints the ground an image sits on', () => {
    const { container } = render(<Report post={pink([{ type: 'image', caption: 'x' }])} />)
    const [r, g, b] = rgb(getComputedStyle(container.querySelector('[data-testid="report-block-0"]')!).backgroundColor)
    expect(r).toBeGreaterThan(g)
    expect(b).toBeGreaterThan(g)
  })
})

describe('the three new kinds of block', () => {
  it('sizes a heading by its level, and treats a levelless one as the first', () => {
    const size = (level?: 1 | 2 | 3) => {
      const { container } = render(
        <Report post={{ title: 'x', blocks: [{ type: 'heading', text: 'Tổng quan', level }] }} />,
      )
      return parseInt(getComputedStyle(container.querySelector('[data-testid="report-block-0"]')!).fontSize, 10)
    }
    expect(size(undefined)).toBe(size(1))
    expect(size(1)).toBeGreaterThan(size(2))
    expect(size(2)).toBeGreaterThan(size(3))
  })

  it('draws a highlight box on its own ground', () => {
    const { getByText } = render(
      <Report post={{ title: 'x', blocks: [{ type: 'callout', heading: 'Lưu ý', text: 'Chưa đo được độ ẩm.' }] }} />,
    )
    expect(getByText('Lưu ý')).toBeInTheDocument()
    expect(getByText('Chưa đo được độ ẩm.')).toBeInTheDocument()
  })

  it('prints the quote mark itself', () => {
    const { container, getByText } = render(
      <Report post={{ title: 'x', blocks: [{ type: 'quote', text: 'Vị mỏng ở cuối.', attribution: 'sổ rang' }] }} />,
    )
    expect(container.textContent).toContain('“')
    expect(getByText('sổ rang')).toBeInTheDocument()
  })
})
