import '@testing-library/jest-dom/vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UseHoursResult } from '../data/useHours'
import { TIMER_KEY } from '../lib/useSessionTimer'

const add = vi.fn().mockResolvedValue({ id: 'saved' })
const useHours = vi.fn()
vi.mock('../data/useHours', () => ({ useHours: () => useHours() }))
vi.mock('../components/Breadcrumbs', () => ({ Breadcrumbs: () => null }))

const { Hours } = await import('./Hours')

// 11:07 — the hour the QA case was started at.
const START = new Date('2026-08-21T11:07:00').getTime()

const hours = (): UseHoursResult => ({
  logs: [],
  kinds: ['đọc', 'work'],
  projects: [],
  loading: false,
  error: null,
  add,
  patch: vi.fn(),
  remove: vi.fn(),
  addTag: vi.fn(),
  // Thêm bởi QA-02; file này viết trước nên chưa có.
  renameTag: vi.fn(),
  removeTag: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
})

describe('Hours — a session logged from the rail', () => {
  beforeEach(() => {
    localStorage.clear()
    add.mockClear()
    useHours.mockReturnValue(hours())
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(START)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  // 20s, not the 5s default: user-event driving fake timers is sensitive to how
  // loaded the machine is, and this repo is worked by several agents at once.
  it('records the whole span the stopwatch ran, not the ticks the tab received', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<Hours />)

    await u.click(screen.getByText('Bắt đầu'))
    // Away in another tab until mid-afternoon; one repaint in all that time.
    act(() => {
      vi.setSystemTime(START + 4 * 3600_000 - 1000)
      vi.advanceTimersByTime(1000)
    })
    await u.click(screen.getByText('Hoàn thành'))

    expect(add).toHaveBeenCalledWith(expect.objectContaining({ mins: 240, at: '11:07' }))
  }, 20_000)

  it('picks a running session back up on the next page load', () => {
    localStorage.setItem(
      TIMER_KEY,
      JSON.stringify({
        mode: 'up',
        target: 1500,
        base: 0,
        since: START - 90 * 60_000,
        suspended: false,
        onScreenOnly: false,
      }),
    )
    render(<Hours />)

    expect(screen.getByText('01:30:00')).toBeInTheDocument()
    expect(screen.getByText('Đang chạy — vẫn tính khi bạn rời màn này.')).toBeInTheDocument()
  })

  it('offers on-screen-only as a choice, off to begin with', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<Hours />)

    const toggle = screen.getByRole('switch', { name: /chỉ tính khi đang mở màn này/i })
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await u.click(toggle)
    expect(screen.getByRole('switch', { name: /chỉ tính khi đang mở màn này/i })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  }, 20_000)
})
