import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LogEntry } from '../content/hours'
import { TagDeleteReview } from './TagDeleteReview'

const log = (id: string, over: Partial<LogEntry> = {}): LogEntry => ({
  id,
  date: '2026-08-20',
  name: 'phiên ' + id,
  kind: 'work',
  project: null,
  mins: 30,
  at: '09:00',
  ...over,
})

const logs = [log('a'), log('b'), log('c'), log('d', { kind: 'đọc' })]

function review(over: Partial<Parameters<typeof TagDeleteReview>[0]> = {}) {
  const props = {
    target: { system: 'task' as const, name: 'work' },
    logs,
    kinds: ['đọc', 'work'],
    projects: ['Sao đâu'],
    onAddTag: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...over,
  }
  render(<TagDeleteReview {...props} />)
  return props
}

describe('TagDeleteReview', () => {
  it('lists only the activities wearing the tag', () => {
    review()
    expect(screen.getByText(/3 hoạt động đang mang tag này/)).toBeInTheDocument()
    expect(screen.getByText('phiên a')).toBeInTheDocument()
    // Filed under a different task — not this deletion's business.
    expect(screen.queryByText('phiên d')).not.toBeInTheDocument()
  })

  it('moves a ticked batch to the chosen tag, then asks about the rest', async () => {
    const u = userEvent.setup()
    const props = review()

    await u.selectOptions(screen.getByLabelText('Tag thay thế'), 'đọc')
    await u.click(screen.getAllByRole('checkbox')[0])
    await u.click(screen.getByRole('button', { name: 'Chuyển 1 hoạt động sang đọc' }))

    expect(screen.getByText('1 hoạt động → đọc')).toBeInTheDocument()
    // The other two are still open questions.
    expect(screen.getByText('Hoạt động (2)')).toBeInTheDocument()

    await u.click(screen.getByRole('button', { name: 'Xoá tag, 2 còn lại vào khác' }))
    expect(props.onConfirm).toHaveBeenCalledWith({ moves: [{ to: 'đọc', ids: ['a'] }] })
  })

  it('takes every activity at once through select-all', async () => {
    const u = userEvent.setup()
    const props = review()

    await u.selectOptions(screen.getByLabelText('Tag thay thế'), 'đọc')
    await u.click(screen.getByText('chọn tất cả'))
    await u.click(screen.getByRole('button', { name: 'Chuyển 3 hoạt động sang đọc' }))

    // Nothing left to ask about, so the button stops mentioning the bucket.
    expect(screen.getByRole('button', { name: 'Xoá tag' })).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Xoá tag' }))
    expect(props.onConfirm).toHaveBeenCalledWith({ moves: [{ to: 'đọc', ids: ['a', 'b', 'c'] }] })
  })

  it('sends the remainder to the bucket when nothing is chosen for it', async () => {
    const u = userEvent.setup()
    const props = review()

    await u.click(screen.getByRole('button', { name: 'Xoá tag, 3 còn lại vào khác' }))
    expect(props.onConfirm).toHaveBeenCalledWith({ moves: [] })
  })

  it('creates a tag from inside the flow and files the batch under it', async () => {
    const u = userEvent.setup()
    const props = review()

    await u.selectOptions(screen.getByLabelText('Tag thay thế'), '__new__')
    await u.type(screen.getByPlaceholderText('loại mới'), 'công việc{Enter}')

    expect(props.onAddTag).toHaveBeenCalledWith('công việc', 'task')

    await u.click(screen.getByText('chọn tất cả'))
    await u.click(screen.getByRole('button', { name: 'Chuyển 3 hoạt động sang công việc' }))
    await u.click(screen.getByRole('button', { name: 'Xoá tag' }))

    expect(props.onConfirm).toHaveBeenCalledWith({ moves: [{ to: 'công việc', ids: ['a', 'b', 'c'] }] })
  })

  it('offers no project at all as a destination, for projects only', async () => {
    const u = userEvent.setup()
    const props = review({
      target: { system: 'project', name: 'Sao đâu' },
      logs: [log('p1', { project: 'Sao đâu' }), log('p2', { project: 'Sao đâu' })],
      projects: ['Sao đâu', 'Cà củng'],
    })

    await u.selectOptions(screen.getByLabelText('Tag thay thế'), '__none__')
    await u.click(screen.getByText('chọn tất cả'))
    await u.click(screen.getByRole('button', { name: 'Chuyển 2 hoạt động sang không thuộc project' }))
    await u.click(screen.getByRole('button', { name: 'Xoá tag' }))

    expect(props.onConfirm).toHaveBeenCalledWith({ moves: [{ to: null, ids: ['p1', 'p2'] }] })
  })

  it('will not offer the tag being deleted as its own replacement', () => {
    review()
    const picker = screen.getByLabelText('Tag thay thế')
    expect(picker).not.toHaveTextContent(/^work$/)
    expect(screen.getByRole('option', { name: 'đọc' })).toBeInTheDocument()
  })

  it('cannot move anything until both a tag and some activities are chosen', async () => {
    const u = userEvent.setup()
    const props = review()

    await u.click(screen.getByRole('button', { name: 'Chọn tag thay thế và tick hoạt động' }))
    expect(screen.getByText('Hoạt động (3)')).toBeInTheDocument()

    await u.click(screen.getByRole('button', { name: 'Huỷ' }))
    expect(props.onCancel).toHaveBeenCalled()
  })

  it('starts over on request', async () => {
    const u = userEvent.setup()
    review()

    await u.selectOptions(screen.getByLabelText('Tag thay thế'), 'đọc')
    await u.click(screen.getAllByRole('checkbox')[0])
    await u.click(screen.getByRole('button', { name: 'Chuyển 1 hoạt động sang đọc' }))
    await u.click(screen.getByText('làm lại từ đầu'))

    expect(screen.getByText('Hoạt động (3)')).toBeInTheDocument()
    expect(screen.queryByText('1 hoạt động → đọc')).not.toBeInTheDocument()
  })
})
