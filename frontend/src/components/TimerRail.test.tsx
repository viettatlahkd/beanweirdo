import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SessionView } from '../lib/useSessionTimer'
import { TimerRail } from './TimerRail'

const session = (over: Partial<SessionView> = {}): SessionView => ({
  id: 's1',
  mode: 'up',
  target: 1800,
  base: 0,
  since: null,
  suspended: false,
  onScreenOnly: false,
  name: 'Cấy men ngày 5',
  kind: 'thực hành',
  project: 'Sao đâu',
  running: true,
  sec: 4200,
  usedSec: 4200,
  ...over,
})

function rail(over: Partial<Parameters<typeof TimerRail>[0]> = {}) {
  const sessions = over.sessions ?? [session()]
  const props = {
    sessions,
    open: sessions[sessions.length - 1],
    canAdd: true,
    projects: ['Sao đâu', 'Cà củng'],
    kinds: ['đọc', 'thực hành'],
    projectColor: { 'Sao đâu': '#102F35', 'Cà củng': '#C25C7C' },
    kindColor: { đọc: '#3E7A4E', 'thực hành': '#C25C7C' },
    onOpenSession: vi.fn(),
    onCollapseAll: vi.fn(),
    onAddSession: vi.fn(),
    onRemoveSession: vi.fn(),
    onStart: vi.fn(),
    onPause: vi.fn(),
    onReset: vi.fn(),
    onRestart: vi.fn(),
    onMode: vi.fn(),
    onTarget: vi.fn(),
    onName: vi.fn(),
    onKind: vi.fn(),
    onProject: vi.fn(),
    onScreenOnly: vi.fn(),
    onAddTag: vi.fn(),
    onLog: vi.fn(),
    ...over,
  }
  render(<TimerRail {...props} />)
  return props
}


describe('TimerRail — the order never changes', () => {
  const three = [
    session({ id: 'a', name: 'Cấy men ngày 5' }),
    session({ id: 'b', name: 'Đọc paper lipid' }),
    session({ id: 'c', name: 'Rang thử mẻ 2' }),
  ]

  it('paints sessions in the order they were created, whichever is open', () => {
    const { unmount } = render(<div />)
    unmount()

    rail({ sessions: three, open: three[2] })
    const withLast = screen.getByText('Cấy men ngày 5').compareDocumentPosition(
      screen.getByText('Đọc paper lipid'),
    )
    // FOLLOWING = 4: the first card really is above the second.
    expect(withLast & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('expands a session where it stands rather than moving it to the end', () => {
    rail({ sessions: three, open: three[0] })

    // The open one is first here — its name lives in the editable field, not
    // as text — and the two collapsed ones stay after it in creation order.
    // Nothing is reshuffled by which card happens to be open.
    const first = screen.getByLabelText('Tên hoạt động')
    expect(first).toHaveValue('Cấy men ngày 5')

    const second = screen.getByText('Đọc paper lipid')
    const third = screen.getByText('Rang thử mẻ 2')
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(second.compareDocumentPosition(third) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('draws exactly one dark card — the open one', () => {
    rail({ sessions: three, open: three[1] })

    const dark = Array.from(document.querySelectorAll('div')).filter((d) =>
      d.style.backgroundImage.includes('linear-gradient'),
    )
    expect(dark).toHaveLength(1)
    // And the open session is the one holding the editable name field.
    expect(screen.getByLabelText('Tên hoạt động')).toHaveValue('Đọc paper lipid')
  })
})

describe('TimerRail — collapsed cards', () => {
  const two = [session({ id: 'a', name: 'Cấy men ngày 5' }), session({ id: 'b', name: 'Đọc paper' })]

  it('shows the mode as the card header, project chip before task chip', () => {
    rail({ sessions: two, open: two[1] })

    const card = screen.getByText('Cấy men ngày 5').closest('div[style*="border"]') as HTMLElement
    const text = card.textContent ?? ''
    expect(text).toContain('Bấm giờ')
    // Project first, then task — the order every other list on the screen uses.
    expect(text.indexOf('#Sao đâu')).toBeLessThan(text.indexOf('thực hành'))
  })

  it('says so when a session has no project, rather than leaving a gap', () => {
    rail({ sessions: [session({ id: 'a', name: 'Không project', project: null }), two[1]], open: two[1] })
    expect(screen.getByText('+ project')).toBeInTheDocument()
  })

  it('expands the session when the card itself is clicked', async () => {
    const u = userEvent.setup()
    const props = rail({ sessions: two, open: two[1] })

    await u.click(screen.getByText('Cấy men ngày 5'))
    expect(props.onOpenSession).toHaveBeenCalledWith('a')
  })

  it('keeps the three controls from expanding the card they act on', async () => {
    const u = userEvent.setup()
    const props = rail({ sessions: two, open: two[1] })

    await u.click(screen.getByRole('button', { name: 'Ghi Cấy men ngày 5 vào hoạt động' }))
    await u.click(screen.getByRole('button', { name: 'Tạm dừng Cấy men ngày 5' }))
    await u.click(screen.getByRole('button', { name: 'Bỏ Cấy men ngày 5' }))

    expect(props.onLog).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 70)
    expect(props.onPause).toHaveBeenCalledWith('a')
    expect(props.onRemoveSession).toHaveBeenCalledWith('a')
    // None of the three doubled as "open this card".
    expect(props.onOpenSession).not.toHaveBeenCalled()
  })

  it('offers to restart a paused session from the same button', async () => {
    const u = userEvent.setup()
    const paused = session({ id: 'a', name: 'Đã dừng', running: false })
    const props = rail({ sessions: [paused, two[1]], open: two[1] })

    await u.click(screen.getByRole('button', { name: 'Chạy tiếp Đã dừng' }))
    expect(props.onStart).toHaveBeenCalledWith('a')
  })

  it('dims the log button for a session too short to round up to a minute', async () => {
    const u = userEvent.setup()
    // 20 seconds rounds to 0 minutes; 30 would round up to 1 and is loggable.
    const brief = session({ id: 'a', name: 'Vừa bấm', sec: 20, usedSec: 20 })
    const props = rail({ sessions: [brief, two[1]], open: two[1] })

    const log = screen.getByRole('button', { name: 'Ghi Vừa bấm vào hoạt động' })
    expect(log).toHaveStyle({ opacity: '0.35' })

    // The screen still refuses the write on the other side, so a stray click
    // here costs nothing.
    await u.click(log)
    expect(props.onLog).toHaveBeenCalledWith(expect.anything(), 0)
  })
})

describe('TimerRail — clicking away folds everything up', () => {
  it('collapses when the pointer goes down outside the rail', () => {
    const props = rail()

    fireEvent.mouseDown(document.body)

    expect(props.onCollapseAll).toHaveBeenCalled()
  })

  it('leaves the rail alone when the pointer goes down inside it', () => {
    const props = rail()

    fireEvent.mouseDown(screen.getByLabelText('Tên hoạt động'))

    // Switching between cards, typing a name, picking a tag — all inside.
    expect(props.onCollapseAll).not.toHaveBeenCalled()
  })

  it('does not listen while everything is already collapsed', () => {
    const props = rail({ open: null })

    fireEvent.mouseDown(document.body)

    expect(props.onCollapseAll).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Tên hoạt động')).not.toBeInTheDocument()
  })
})

describe('TimerRail — starting another clock', () => {
  it('adds one when asked', async () => {
    const u = userEvent.setup()
    const props = rail()

    await u.click(screen.getByRole('button', { name: 'Thêm một đồng hồ' }))
    expect(props.onAddSession).toHaveBeenCalled()
  })

  it('refuses, and says why, when the open session has no name', async () => {
    const u = userEvent.setup()
    const props = rail({ canAdd: false, sessions: [session({ name: '' })] })

    const plus = screen.getByRole('button', { name: 'Thêm một đồng hồ' })
    await u.click(plus)

    expect(props.onAddSession).not.toHaveBeenCalled()
    expect(plus).toHaveAttribute('title', 'Đặt tên cho phiên đang mở trước đã')
  })

  it('counts the clocks in the header once there is more than one', () => {
    rail({ sessions: [session({ id: 'a' }), session({ id: 'b' })], open: session({ id: 'b' }) })
    expect(screen.getByText('Đang chạy · 2')).toBeInTheDocument()
  })
})

describe('TimerRail — the open session', () => {
  it('offers the four quarter-hour presets and nothing else', async () => {
    const u = userEvent.setup()
    rail({ sessions: [session({ mode: 'down', target: 1800 })] })

    const shown = Array.from(document.querySelectorAll('div'))
      .filter((d) => /^\d+′$/.test(d.textContent ?? ''))
      .map((d) => d.textContent)
    expect(shown).toEqual(['15′', '30′', '45′', '60′'])

    await u.click(screen.getByRole('button', { name: 'Tự đặt số phút' }))
    expect(screen.getByLabelText('Số phút tự đặt')).toBeInTheDocument()
  })

  it('shows a typed length as a fifth chip so it is visible as the choice', () => {
    rail({ sessions: [session({ mode: 'down', target: 90 * 60 })] })

    const shown = Array.from(document.querySelectorAll('div'))
      .filter((d) => /^\d+′$/.test(d.textContent ?? ''))
      .map((d) => d.textContent)
    expect(shown).toEqual(['15′', '30′', '45′', '60′', '90′'])
  })

  it('carries no standing instructions any more', () => {
    rail({ sessions: [session({ mode: 'down' })] })
    const text = document.body.textContent ?? ''
    expect(text).not.toContain('Phiên đếm lên chạy')
    expect(text).not.toContain('Hết giờ sẽ có')
  })
})

describe('TimerRail — làm lại từ đầu', () => {
  const two = [session({ id: 'a', name: 'Cấy men ngày 5' }), session({ id: 'b', name: 'Đọc paper lipid' })]

  it('offers restart on a collapsed clock without expanding it', async () => {
    const props = rail({ sessions: two, open: two[1] })
    await userEvent.click(screen.getByRole('button', { name: 'Làm lại Cấy men ngày 5 từ đầu' }))

    expect(props.onRestart).toHaveBeenCalledWith('a')
    // The controls sit on a card that expands when clicked; acting on one must
    // not also open the session underneath it.
    expect(props.onOpenSession).not.toHaveBeenCalled()
  })

  it('offers restart on the expanded clock too', async () => {
    const props = rail({ sessions: two, open: two[1] })
    await userEvent.click(screen.getByRole('button', { name: 'Làm lại từ đầu' }))

    expect(props.onRestart).toHaveBeenCalledWith('b')
  })

  it('keeps restart apart from the button that ends the session', async () => {
    const props = rail()
    await userEvent.click(screen.getByText('Đặt lại'))

    expect(props.onReset).toHaveBeenCalled()
    expect(props.onRestart).not.toHaveBeenCalled()
  })
})
