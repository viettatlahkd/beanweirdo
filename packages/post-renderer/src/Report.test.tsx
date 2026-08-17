import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Report } from './Report'
import type { ReportPostData } from './types'

const post: ReportPostData = {
  title: 'Cupping — lô Q3',
  blurb: 'Tổng hợp điểm số và ghi chú cupping quý 3.',
  blocks: [
    { type: 'meta', text: 'Cập nhật 12/09' },
    { type: 'heading', text: 'Tổng quan' },
    { type: 'paragraph', text: 'Điểm trung bình tăng nhẹ so với quý trước.' },
    {
      type: 'metrics',
      items: [
        { label: 'Điểm TB', value: '86.4' },
        { label: 'Số mẫu', value: '18' },
      ],
    },
    {
      type: 'chart',
      points: [
        { label: 'T7', heightPct: 40 },
        { label: 'T8', heightPct: 65 },
        { label: 'T9', heightPct: 80 },
      ],
    },
    {
      type: 'table',
      table: {
        columns: ['Mẫu', 'Điểm'],
        rows: [{ cells: ['Q3-01', '87'] }, { cells: ['Q3-02', '85.5'] }],
      },
    },
    { type: 'image', caption: 'Trạm cupping, buổi sáng', imageUrl: null },
  ],
}

describe('Report', () => {
  it('renders the title and blurb', () => {
    render(<Report post={post} />)
    expect(screen.getByRole('heading', { name: post.title })).toBeInTheDocument()
    expect(screen.getByText(post.blurb!)).toBeInTheDocument()
  })

  it('renders the block sequence in order: meta, heading, paragraph', () => {
    render(<Report post={post} />)
    expect(screen.getByTestId('report-block-0')).toHaveTextContent('Cập nhật 12/09')
    expect(screen.getByTestId('report-block-1')).toHaveTextContent('Tổng quan')
    expect(screen.getByTestId('report-block-2')).toHaveTextContent('Điểm trung bình tăng nhẹ so với quý trước.')
  })

  it('renders a metrics block as label/value tiles', () => {
    render(<Report post={post} />)
    expect(screen.getByText('Điểm TB')).toBeInTheDocument()
    expect(screen.getByText('86.4')).toBeInTheDocument()
    expect(screen.getByText('Số mẫu')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
  })

  it('renders a chart block with one bar per point, sized by heightPct', () => {
    render(<Report post={post} />)
    const chartBlock = screen.getByTestId('report-block-4')
    expect(chartBlock).toHaveTextContent('T7')
    expect(chartBlock).toHaveTextContent('T8')
    expect(chartBlock).toHaveTextContent('T9')
    const bar = chartBlock.querySelector('div[style*="height: 80%"]')
    expect(bar).not.toBeNull()
  })

  it('renders a table block with columns and rows', () => {
    render(<Report post={post} />)
    expect(screen.getByText('Mẫu')).toBeInTheDocument()
    expect(screen.getByText('Điểm')).toBeInTheDocument()
    expect(screen.getByText('Q3-01')).toBeInTheDocument()
    expect(screen.getByText('85.5')).toBeInTheDocument()
  })

  it('renders an image block caption even with no imageUrl', () => {
    render(<Report post={post} />)
    expect(screen.getByText('Trạm cupping, buổi sáng')).toBeInTheDocument()
  })

  it('uses renderParagraph override for WYSIWYG paragraph editing', () => {
    render(
      <Report
        post={post}
        renderParagraph={(text, i) => <textarea aria-label={`para-${i}`} defaultValue={text} />}
      />,
    )
    expect(screen.getByLabelText('para-2')).toHaveValue('Điểm trung bình tăng nhẹ so với quý trước.')
  })

  it('uses renderTableCell override for WYSIWYG cell editing', () => {
    render(
      <Report
        post={post}
        renderTableCell={(text, blockIndex, rowIndex, colIndex) => (
          <input aria-label={`cell-${blockIndex}-${rowIndex}-${colIndex}`} defaultValue={text} />
        )}
      />,
    )
    expect(screen.getByLabelText('cell-5-0-0')).toHaveValue('Q3-01')
  })
})
