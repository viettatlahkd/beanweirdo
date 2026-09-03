import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Longform } from './Longform'
import type { LongformPostData } from './types'

const post: LongformPostData = {
  title: 'Lipids in Beans',
  subtitle: 'Chất béo, thể chất của nước',
  blocks: [
    { k: 'h1', runs: [{ t: 'Bản gốc bị bỏ qua' }] },
    { k: 'p', runs: [{ t: 'Mở đầu.' }] },
    { k: 'h1', runs: [{ t: 'Tổng quan' }] },
    { k: 'p', runs: [{ t: 'Thuộc phần Tổng quan.' }] },
    { k: 'h2', runs: [{ t: 'Lipid trong thực phẩm' }] },
    { k: 'p', runs: [{ t: 'Thuộc phần con.' }] },
    { k: 'h1', runs: [{ t: 'Phần hai' }] },
    { k: 'p', runs: [{ t: 'Thuộc phần hai.' }] },
  ],
}

describe('Longform', () => {
  it('shows the post title in place of the export heading, with its subtitle', () => {
    render(<Longform post={post} />)
    // The export opens with its own h1; the post's title is what readers know
    // it by, so that is what leads the page.
    expect(screen.getByText('Lipids in Beans')).toBeInTheDocument()
    expect(screen.queryByText('Bản gốc bị bỏ qua')).not.toBeInTheDocument()
    expect(screen.getByText('Chất béo, thể chất của nước')).toBeInTheDocument()
  })

  it('folds a section away without touching the ones beside it', async () => {
    render(<Longform post={post} />)
    expect(screen.getByText('Thuộc phần Tổng quan.')).toBeInTheDocument()

    // The name appears twice — once in the floating index, once as the
    // heading itself. It is the heading that folds.
    await userEvent.click(screen.getByRole('heading', { name: /Tổng quan/ }))

    // Everything under that heading goes, including its sub-heading's content.
    expect(screen.queryByText('Thuộc phần Tổng quan.')).not.toBeInTheDocument()
    expect(screen.queryByText('Thuộc phần con.')).not.toBeInTheDocument()
    // The next section is untouched, and the heading itself stays clickable.
    expect(screen.getByText('Thuộc phần hai.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Tổng quan/ })).toBeInTheDocument()
  })

  it('collapses everything, then restores it', async () => {
    render(<Longform post={post} />)

    await userEvent.click(screen.getByText('thu gọn'))
    expect(screen.queryByText('Thuộc phần Tổng quan.')).not.toBeInTheDocument()
    expect(screen.queryByText('Thuộc phần hai.')).not.toBeInTheDocument()
    // The title's own opening paragraph has no heading above it, so it stays.
    expect(screen.getByText('Mở đầu.')).toBeInTheDocument()

    await userEvent.click(screen.getByText('xem tất cả'))
    expect(screen.getByText('Thuộc phần Tổng quan.')).toBeInTheDocument()
  })

  it('lists every section but the title in the floating index', () => {
    render(<Longform post={post} />)
    expect(screen.getByText('Mục trong bài')).toBeInTheDocument()
    // Two numbered entries: Tổng quan and Phần hai — not the title.
    expect(screen.getAllByText('01').length).toBeGreaterThan(0)
    expect(screen.getAllByText('02').length).toBeGreaterThan(0)
    expect(screen.queryByText('03')).not.toBeInTheDocument()
  })
})

/*
 * Khối `cont` cũ vẫn còn trong kho — 159 khối trong bài đã xuất bản — và chỉ
 * được ghi lại ở dạng mới khi chủ site sửa bài. Trang phải vẽ được cả hai, ra
 * cùng một hình.
 */
describe('lùi lề đoạn văn', () => {
  const withIndent = (blocks: LongformPostData['blocks']): LongformPostData => ({ ...post, blocks })

  it('cont cũ vẽ ra một đoạn văn lùi vào', () => {
    const { container } = render(
      <Longform post={withIndent([{ k: 'cont' as never, runs: [{ t: '— một điểm phụ' }] }])} />,
    )
    const line = screen.getByText('— một điểm phụ').closest('div')!
    expect(line).toHaveStyle({ paddingLeft: '26px' })
    // Cỡ chữ của đoạn văn, không phải cỡ nhỏ hơn của `cont` ngày trước: chủ
    // site chốt nó *là* đoạn văn, chỉ lùi lề.
    expect(line).toHaveStyle({ fontSize: '15.5px' })
    expect(container).toBeTruthy()
  })

  it('mỗi bậc lùi thêm một khoảng như nhau', () => {
    render(
      <Longform
        post={withIndent([
          { k: 'p', ind: 1, runs: [{ t: 'bậc một' }] },
          { k: 'p', ind: 3, runs: [{ t: 'bậc ba' }] },
        ])}
      />,
    )
    expect(screen.getByText('bậc một').closest('div')).toHaveStyle({ paddingLeft: '26px' })
    expect(screen.getByText('bậc ba').closest('div')).toHaveStyle({ paddingLeft: '78px' })
  })

  it('đoạn đã lùi đứng khít nhau hơn đoạn thường', () => {
    /*
     * `cont` ngày trước cách nhau 8px, còn đoạn văn 14px. Cho `cont` về đoạn
     * văn mà không mang theo khoảng cách của nó thì 159 điểm phụ của bài giãn
     * ra thêm gần một nghìn pixel, và mỗi chùm điểm phụ dưới câu dẫn đọc thành
     * mấy đoạn rời rạc.
     */
    render(
      <Longform
        post={withIndent([
          { k: 'p', runs: [{ t: 'câu dẫn' }] },
          { k: 'p', ind: 1, runs: [{ t: 'điểm phụ' }] },
        ])}
      />,
    )
    expect(screen.getByText('câu dẫn').closest('div')).toHaveStyle({ marginBottom: '14px' })
    expect(screen.getByText('điểm phụ').closest('div')).toHaveStyle({ marginBottom: '8px' })
  })

  it('ô nhập nhận chữ mang dấu định dạng, không phải chuỗi trơn', () => {
    // Nếu ô nhập chỉ thấy chuỗi trơn thì lần nộp đầu tiên đã xoá chỗ đậm.
    render(
      <Longform
        post={withIndent([{ k: 'p', runs: [{ t: 'phần ' }, { t: 'đậm', w: '600' }] }])}
        renderText={(text) => <span>{text}</span>}
      />,
    )
    expect(screen.getByText('phần *đậm*')).toBeInTheDocument()
  })
})
