import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LogEntry } from '../content/hours'
import { TagBar } from './TagBar'

const logs: LogEntry[] = [
  { id: 'a', date: '2026-08-20', name: 'đọc paper', kind: 'đọc', project: 'Sao đâu', mins: 40, at: '09:00' },
  { id: 'b', date: '2026-08-20', name: 'onboarding', kind: 'work', project: null, mins: 13, at: '15:51' },
  { id: 'c', date: '2026-08-19', name: 'cũ', kind: 'Khác', project: null, mins: 30, at: '10:00' },
]

function bar(over: Partial<Parameters<typeof TagBar>[0]> = {}) {
  const props = {
    projects: ['Sao đâu'],
    kinds: ['đọc', 'work'],
    logs,
    kindColor: { đọc: '#3E7A4E', work: '#102F35' },
    projectColor: { 'Sao đâu': '#102F35' },
    filter: null,
    onFilter: vi.fn(),
    onAdd: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    ...over,
  }
  render(<TagBar {...props} />)
  return props
}

describe('TagBar — editing a tag in place', () => {
  it('filters on one click and opens the tag on two', async () => {
    const u = userEvent.setup()
    const props = bar()

    await u.click(screen.getByText('work'))
    expect(props.onFilter).toHaveBeenCalledWith({ system: 'task', name: 'work' })

    await u.dblClick(screen.getByText('work'))
    expect(screen.getByLabelText('Đổi tên work')).toHaveValue('work')
  })

  it('saves the new name on Enter', async () => {
    const u = userEvent.setup()
    const props = bar()

    await u.dblClick(screen.getByText('work'))
    await u.clear(screen.getByLabelText('Đổi tên work'))
    await u.type(screen.getByLabelText('Đổi tên work'), 'công việc{Enter}')

    expect(props.onRename).toHaveBeenCalledWith('work', 'công việc', 'task')
  })

  it('saves the new name when the field is clicked away from', async () => {
    const u = userEvent.setup()
    const props = bar()

    await u.dblClick(screen.getByText('đọc'))
    await u.clear(screen.getByLabelText('Đổi tên đọc'))
    await u.type(screen.getByLabelText('Đổi tên đọc'), 'reading')
    await u.click(screen.getByText('Task'))

    expect(props.onRename).toHaveBeenCalledWith('đọc', 'reading', 'task')
  })

  it('leaves the tag alone on Escape', async () => {
    const u = userEvent.setup()
    const props = bar()

    await u.dblClick(screen.getByText('work'))
    await u.clear(screen.getByLabelText('Đổi tên work'))
    await u.type(screen.getByLabelText('Đổi tên work'), 'khác hẳn{Escape}')

    expect(props.onRename).not.toHaveBeenCalled()
    expect(screen.getByText('work')).toBeInTheDocument()
  })

  it('asks for the deletion from the cross pinned to the open chip', async () => {
    const u = userEvent.setup()
    const props = bar()

    // The cross only exists once the chip is open — filtering can't hit it.
    expect(screen.queryByRole('button', { name: 'Xoá work' })).not.toBeInTheDocument()

    await u.dblClick(screen.getByText('work'))
    await u.click(screen.getByRole('button', { name: 'Xoá work' }))

    expect(props.onDelete).toHaveBeenCalledWith('work', 'task')
    // Deleting is not also renaming to whatever was in the field.
    expect(props.onRename).not.toHaveBeenCalled()
  })

  it('edits a project through the same gesture', async () => {
    const u = userEvent.setup()
    const props = bar()

    await u.dblClick(screen.getByText('#Sao đâu'))
    // The chip is labelled as it reads; the field holds the stored name, since
    // the hash is punctuation the journal draws rather than something it keeps.
    expect(screen.getByLabelText('Đổi tên #Sao đâu')).toHaveValue('Sao đâu')
    await u.clear(screen.getByLabelText('Đổi tên #Sao đâu'))
    await u.type(screen.getByLabelText('Đổi tên #Sao đâu'), 'Sao Đâu{Enter}')

    expect(props.onRename).toHaveBeenCalledWith('Sao đâu', 'Sao Đâu', 'project')
  })

  it('lists the unclassified bucket but refuses to treat it as a tag', async () => {
    const u = userEvent.setup()
    const props = bar()

    const bucket = screen.getByText('Khác')
    expect(bucket).toBeInTheDocument()

    await u.dblClick(bucket)
    expect(screen.queryByLabelText('Đổi tên Khác')).not.toBeInTheDocument()
    expect(props.onRename).not.toHaveBeenCalled()
  })

  it('hides the bucket when nothing is sitting in it', () => {
    bar({ logs: logs.filter((l) => l.kind !== 'Khác') })
    expect(screen.queryByText('Khác')).not.toBeInTheDocument()
  })
})
