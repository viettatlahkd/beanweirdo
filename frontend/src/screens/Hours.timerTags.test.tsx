import '@testing-library/jest-dom/vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UseHoursResult } from '../data/useHours'

const add = vi.fn().mockResolvedValue({ id: 'saved' })
const addTag = vi.fn().mockResolvedValue(undefined)
const useHours = vi.fn()
vi.mock('../data/useHours', () => ({ useHours: () => useHours() }))

// The trail needs modules, site copy and a nav context; none of that is what
// these tests are about.
vi.mock('../components/Breadcrumbs', () => ({ Breadcrumbs: () => null }))

const { Hours } = await import('./Hours')

const hours = (over: Partial<UseHoursResult> = {}): UseHoursResult => ({
  logs: [],
  kinds: ['đọc', 'work'],
  projects: ['Sao đâu', 'Cà củng'],
  loading: false,
  error: null,
  add,
  patch: vi.fn(),
  remove: vi.fn(),
  addTag,
  // Thêm bởi QA-02; hai file này viết trước nên chưa có.
  renameTag: vi.fn(),
  removeTag: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  ...over,
})

describe('Hours — the timer rail files under both tag systems', () => {
  beforeEach(() => {
    // The rail's tag choices now ride in localStorage with the clock, so one
    // test's picks would otherwise be the next one's starting state.
    localStorage.clear()
    add.mockClear()
    addTag.mockClear()
    useHours.mockReturnValue(hours())
    // `shouldAdvanceTime` keeps the real clock moving under the fake one —
    // without it user-event's own waits never resolve and every click hangs.
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  // The bar at the top of the screen draws the same tag names, so every query
  // here is scoped to the rail's own row.
  const railProjects = () => within(screen.getByRole('group', { name: 'Project' }))
  const railTasks = () => within(screen.getByRole('group', { name: 'Task' }))

  /** Run the stopwatch for `mins`, then file the session. */
  async function runAndSave(u: ReturnType<typeof user>, mins: number) {
    await u.click(screen.getByText('Bắt đầu'))
    act(() => {
      vi.advanceTimersByTime(mins * 60_000)
    })
    await u.click(screen.getByText('Hoàn thành'))
  }

  it('offers every project in the rail, not only the tasks', () => {
    render(<Hours />)
    expect(railProjects().getByText('#Sao đâu')).toBeInTheDocument()
    expect(railProjects().getByText('#Cà củng')).toBeInTheDocument()
    expect(railTasks().getByText('work')).toBeInTheDocument()
  })

  // 20s, not the 5s default: user-event driving fake timers is sensitive to how
  // loaded the machine is, and this repo is worked by several agents at once.
  it('logs the picked project with the session', async () => {
    const u = user()
    render(<Hours />)

    await u.click(railProjects().getByText('#Sao đâu'))
    await runAndSave(u, 2)

    expect(add).toHaveBeenCalledWith(expect.objectContaining({ project: 'Sao đâu', mins: 2 }))
  }, 20_000)

  it('sends null rather than a stray project when none is picked', async () => {
    const u = user()
    render(<Hours />)

    await runAndSave(u, 1)

    expect(add).toHaveBeenCalledWith(expect.objectContaining({ project: null }))
  }, 20_000)

  it('un-picks a project when its chip is clicked again', async () => {
    const u = user()
    render(<Hours />)

    await u.click(railProjects().getByText('#Sao đâu'))
    await u.click(railProjects().getByText('#Sao đâu'))
    await runAndSave(u, 1)

    expect(add).toHaveBeenCalledWith(expect.objectContaining({ project: null }))
  }, 20_000)

  it('adds a project from the rail and files the session under it right away', async () => {
    const u = user()
    render(<Hours />)

    await u.click(railProjects().getByText('+'))
    await u.type(railProjects().getByPlaceholderText('project mới'), 'Ghi chép{Enter}')

    expect(addTag).toHaveBeenCalledWith('Ghi chép', 'project')

    await runAndSave(u, 1)

    expect(add).toHaveBeenCalledWith(expect.objectContaining({ project: 'Ghi chép' }))
  }, 20_000)
})
