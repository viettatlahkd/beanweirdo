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
