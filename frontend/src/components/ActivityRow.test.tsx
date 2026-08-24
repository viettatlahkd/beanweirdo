import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LogEntry } from '../content/hours'
import { ActivityRow, atToMin, endOf, minToAt, splitHm } from './ActivityRow'

const log = (over: Partial<LogEntry> = {}): LogEntry => ({
  id: 'log-1',
  date: '2026-08-21',
  name: 'beanweirdo: fermentation memos',
  kind: 'đọc',
  project: null,
  mins: 30,
  at: '16:57',
  done: true,
  ...over,
})

function row(over: Partial<Parameters<typeof ActivityRow>[0]> = {}) {
  const props = {
    log: log(),
    editable: true,
    kinds: ['đọc', 'work'],
    projects: ['Sao đâu', 'Cà củng'],
    kindColor: { đọc: '#3E7A4E', work: '#102F35' },
    projectColor: { 'Sao đâu': '#102F35', 'Cà củng': '#C25C7C' },
    naming: false,
    onStartNaming: vi.fn(),
    onName: vi.fn(),
    onAbandon: vi.fn(),
    onPatch: vi.fn(),
    onClone: vi.fn(),
    onAddSitting: vi.fn(),
    onPatchSitting: vi.fn(),
    onRemoveSitting: vi.fn(),
    onRemove: vi.fn(),
    ...over,
  }
  render(<ActivityRow {...props} />)
  return props
}

/** Same props as `row`, but keeps the handle so the row can be re-rendered. */
function renderRow(over: Partial<Parameters<typeof ActivityRow>[0]> = {}) {
  const props = {
    log: log(),
    editable: true,
    kinds: ['đọc', 'work'],
    projects: ['Sao đâu', 'Cà củng'],
    kindColor: { đọc: '#3E7A4E', work: '#102F35' },
    projectColor: { 'Sao đâu': '#102F35', 'Cà củng': '#C25C7C' },
    naming: false,
    onStartNaming: vi.fn(),
    onName: vi.fn(),
    onAbandon: vi.fn(),
    onPatch: vi.fn(),
    onClone: vi.fn(),
    onAddSitting: vi.fn(),
    onPatchSitting: vi.fn(),
    onRemoveSitting: vi.fn(),
    onRemove: vi.fn(),
    ...over,
  }
  const view = render(<ActivityRow {...props} />)
  return {
    props,
    rerender: (next: Partial<Parameters<typeof ActivityRow>[0]>) =>
      view.rerender(<ActivityRow {...props} {...next} />),
  }
}

describe('ActivityRow — clock arithmetic', () => {
  it('derives the end from the start and the length', () => {
    expect(endOf({ at: '16:57', mins: 30 })).toBe('17:27')
    expect(endOf({ at: '23:40', mins: 45 })).toBe('00:25')
    expect(atToMin('09:05')).toBe(545)
    expect(minToAt(545)).toBe('09:05')
    expect(splitHm(160)).toEqual({ h: 2, m: 40 })
  })
})

describe('ActivityRow — start, end and duration are two facts, not three', () => {
  it('shows all three side by side', () => {
    row()
    expect(screen.getByText('16:57')).toBeInTheDocument()
    expect(screen.getByText('17:27')).toBeInTheDocument()
    expect(screen.getByText('30m')).toBeInTheDocument()
  })

  it('moves the whole activity when the start is changed, keeping its length', async () => {
    const u = userEvent.setup()
    const props = row()

    await u.click(screen.getByText('16:57'))
    const field = screen.getByDisplayValue('16:57')
    await u.clear(field)
    await u.type(field, '09:00')
    await u.keyboard('{Enter}')

    // Only the start is written; the end is derived, so it follows on its own.
    expect(props.onPatch).toHaveBeenCalledWith({ at: '09:00' })
    expect(props.onPatch).toHaveBeenCalledTimes(1)
  })

  it('recomputes the length when the end is changed, keeping the start', async () => {
    const u = userEvent.setup()
    const props = row()

    await u.click(screen.getByText('17:27'))
    const field = screen.getByDisplayValue('17:27')
    await u.clear(field)
    await u.type(field, '18:00')
    await u.keyboard('{Enter}')

    // 16:57 → 18:00 is 63 minutes. The start does not move.
    expect(props.onPatch).toHaveBeenCalledWith({ mins: 63 })
  })

  it('refuses an end that lands before its start', async () => {
    const u = userEvent.setup()
    const props = row()

    await u.click(screen.getByText('17:27'))
    const field = screen.getByDisplayValue('17:27')
    await u.clear(field)
    await u.type(field, '10:00')
    await u.keyboard('{Enter}')

    // An activity crossing midnight belongs to two days, not to one row.
    expect(props.onPatch).not.toHaveBeenCalled()
  })
})

describe('ActivityRow — duration in hours and minutes', () => {
  it('opens as two boxes carrying the split value', async () => {
    const u = userEvent.setup()
    row({ log: log({ mins: 160 }) })

    await u.click(screen.getByText('2h 40m'))
    expect(screen.getByLabelText('Số giờ')).toHaveValue(2)
    expect(screen.getByLabelText('Số phút')).toHaveValue(40)
  })

  it('adds the two boxes together', async () => {
    const u = userEvent.setup()
    const props = row()

    await u.click(screen.getByText('30m'))
    await u.clear(screen.getByLabelText('Số giờ'))
    await u.type(screen.getByLabelText('Số giờ'), '1')
    await u.clear(screen.getByLabelText('Số phút'))
    await u.type(screen.getByLabelText('Số phút'), '15')
    await u.keyboard('{Enter}')

    expect(props.onPatch).toHaveBeenCalledWith({ mins: 75 })
  })

  it('takes an over-large minute count rather than rejecting it', async () => {
    const u = userEvent.setup()
    const props = row()

    await u.click(screen.getByText('30m'))
    await u.clear(screen.getByLabelText('Số phút'))
    await u.type(screen.getByLabelText('Số phút'), '90')
    await u.keyboard('{Enter}')

    // Typed as 90 minutes, stored as 90 — which the row then reads back as
    // 1h 30m, since that is the same length said differently.
    expect(props.onPatch).toHaveBeenCalledWith({ mins: 90 })
  })

  it('keeps the edit open while focus moves between the two boxes', async () => {
    const u = userEvent.setup()
    const props = row()

    await u.click(screen.getByText('30m'))
    await u.click(screen.getByLabelText('Số phút'))

    // Tabbing from hours to minutes must not count as leaving the field.
    expect(screen.getByLabelText('Số giờ')).toBeInTheDocument()
    expect(props.onPatch).not.toHaveBeenCalled()
  })

  it('abandons on Escape', async () => {
    const u = userEvent.setup()
    const props = row()

    await u.click(screen.getByText('30m'))
    await u.clear(screen.getByLabelText('Số giờ'))
    await u.type(screen.getByLabelText('Số giờ'), '5')
    await u.keyboard('{Escape}')

    expect(props.onPatch).not.toHaveBeenCalled()
  })
})

describe('ActivityRow — the project picker', () => {
  it('drops its list open on the first click instead of the second', async () => {
    const u = userEvent.setup()
    const showPicker = vi.fn()
    // jsdom has no showPicker; stand one up so the call can be observed.
    ;(HTMLSelectElement.prototype as unknown as { showPicker: () => void }).showPicker = showPicker

    row()
    await u.click(screen.getByText('+ project'))

    expect(showPicker).toHaveBeenCalled()
    expect(screen.getByRole('combobox')).toHaveFocus()

    delete (HTMLSelectElement.prototype as unknown as { showPicker?: () => void }).showPicker
  })

  it('still works where the browser has no showPicker', async () => {
    const u = userEvent.setup()
    row()

    await u.click(screen.getByText('+ project'))

    expect(screen.getByRole('combobox')).toHaveFocus()
    expect(screen.getByRole('option', { name: '— không thuộc project —' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sao đâu' })).toBeInTheDocument()
  })
})

describe('ActivityRow — reading and editing want different shapes', () => {
  it('at rest keeps the length big at the right margin, on its own', () => {
    row()

    // One `30m` on the row, not two: the right margin is where the eye lands
    // when scanning a day, and that is where it stays until an edit starts.
    expect(screen.getAllByText('30m')).toHaveLength(1)
    expect(screen.getByText('30m')).toHaveStyle({ fontSize: '18px' })
    // The separator only belongs to the editing cluster.
    expect(screen.queryByText('·')).not.toBeInTheDocument()
  })

  it('brings the length over beside the clock times while editing', async () => {
    const u = userEvent.setup()
    row()

    await u.click(screen.getByText('16:57'))

    // The three numbers are one sum while being changed, so they sit together
    // and the big figure stands down.
    expect(screen.getByText('·')).toBeInTheDocument()
    expect(screen.getByText('30m')).toHaveStyle({ fontSize: '13px' })
    expect(screen.getAllByText('30m')).toHaveLength(1)
  })

  it('puts the big figure back when the edit finishes', async () => {
    const u = userEvent.setup()
    row()

    await u.click(screen.getByText('16:57'))
    await u.keyboard('{Escape}')

    expect(screen.getByText('30m')).toHaveStyle({ fontSize: '18px' })
    expect(screen.queryByText('·')).not.toBeInTheDocument()
  })

  it('still opens the duration editor from the big figure', async () => {
    const u = userEvent.setup()
    row()

    await u.click(screen.getByText('30m'))

    expect(screen.getByLabelText('Số giờ')).toBeInTheDocument()
    expect(screen.getByLabelText('Số phút')).toBeInTheDocument()
  })
})

describe('ActivityRow — a brand-new row is already being worked on', () => {
  it('lines the three numbers up while the new row is being named', () => {
    row({ naming: true })

    // A new row arrives with a guessed start and 30 minutes on it, and those
    // are the first things you fix — so they sit together from the outset,
    // without needing a click to bring them into line.
    expect(screen.getByText('·')).toBeInTheDocument()
    expect(screen.getByText('16:57')).toBeInTheDocument()
    expect(screen.getByText('17:27')).toBeInTheDocument()
    expect(screen.getByText('30m')).toHaveStyle({ fontSize: '13px' })
    expect(screen.getAllByText('30m')).toHaveLength(1)
  })

  it('hands the row back its right-margin figure once it is named', () => {
    const { rerender } = renderRow({ naming: true })
    expect(screen.getByText('30m')).toHaveStyle({ fontSize: '13px' })

    rerender({ naming: false })

    expect(screen.getByText('30m')).toHaveStyle({ fontSize: '18px' })
    expect(screen.queryByText('·')).not.toBeInTheDocument()
  })

  it('keeps the name field focused for typing', () => {
    row({ naming: true })
    expect(screen.getByPlaceholderText('Hoạt động gì')).toBeInTheDocument()
  })
})

describe('ActivityRow — a new row stays put while you set it up', () => {
  it('survives reaching for the project picker before typing a name', async () => {
    const u = userEvent.setup()
    const props = row({ naming: true, log: log({ name: '', project: null }) })

    await u.click(screen.getByText('+ project'))

    // Rule 08.04 drops an unnamed row when you leave it — but reaching for the
    // project chip is not leaving, it is setting the row up.
    expect(props.onName).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('survives reaching for the duration before typing a name', async () => {
    const u = userEvent.setup()
    const props = row({ naming: true, log: log({ name: '' }) })

    await u.click(screen.getByText('30m'))

    expect(props.onName).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Số giờ')).toBeInTheDocument()
  })

  it('survives reaching for either clock time', async () => {
    const u = userEvent.setup()
    const props = row({ naming: true, log: log({ name: '' }) })

    await u.click(screen.getByText('16:57'))
    expect(props.onName).not.toHaveBeenCalled()

    const field = screen.getByDisplayValue('16:57')
    await u.clear(field)
    await u.type(field, '09:00')
    await u.keyboard('{Enter}')
    expect(props.onPatch).toHaveBeenCalledWith({ at: '09:00' })
    expect(props.onName).not.toHaveBeenCalled()
  })

  it('lets go once the pointer lands outside the row', async () => {
    const props = row({ naming: true, log: log({ name: '' }) })

    fireEvent.mouseDown(document.body)

    // Nothing typed and the pointer went elsewhere: the row was abandoned.
    expect(props.onName).toHaveBeenCalledWith('')
  })

  it('keeps what was typed when the pointer lands outside', async () => {
    const u = userEvent.setup()
    const props = row({ naming: true, log: log({ name: '' }) })

    await u.type(screen.getByPlaceholderText('Hoạt động gì'), 'Cấy men ngày 6')
    fireEvent.mouseDown(document.body)

    expect(props.onName).toHaveBeenCalledWith('Cấy men ngày 6')
  })

  it('saves on Enter without needing the pointer to go anywhere', async () => {
    const u = userEvent.setup()
    const props = row({ naming: true, log: log({ name: '' }) })

    await u.type(screen.getByPlaceholderText('Hoạt động gì'), 'Đọc paper{Enter}')

    expect(props.onName).toHaveBeenCalledWith('Đọc paper')
  })

  it('abandons on Escape', async () => {
    const u = userEvent.setup()
    const props = row({ naming: true, log: log({ name: '' }) })

    await u.type(screen.getByPlaceholderText('Hoạt động gì'), 'nửa chừng{Escape}')

    expect(props.onAbandon).toHaveBeenCalled()
  })
})

describe('ActivityRow — two of three, the third follows', () => {
  it('sets the length from a start and an end', async () => {
    const u = userEvent.setup()
    const props = row({ naming: true, log: log({ name: '', at: '09:00', mins: 30 }) })

    // Known: it started at 09:00 and finished at 10:15. The length follows.
    await u.click(screen.getByText('09:30'))
    const end = screen.getByDisplayValue('09:30')
    await u.clear(end)
    await u.type(end, '10:15')
    await u.keyboard('{Enter}')

    expect(props.onPatch).toHaveBeenCalledWith({ mins: 75 })
  })

  it('sets the end from a start and a length', async () => {
    const u = userEvent.setup()
    const props = row({ naming: true, log: log({ name: '', at: '09:00', mins: 30 }) })

    // Known: it started at 09:00 and took two hours. The end follows — and is
    // never written, because it is always derived from the other two.
    await u.click(screen.getByText('30m'))
    await u.clear(screen.getByLabelText('Số giờ'))
    await u.type(screen.getByLabelText('Số giờ'), '2')
    await u.clear(screen.getByLabelText('Số phút'))
    await u.type(screen.getByLabelText('Số phút'), '0')
    await u.keyboard('{Enter}')

    expect(props.onPatch).toHaveBeenCalledWith({ mins: 120 })
  })

  it('moves the end when the start moves, keeping the length', async () => {
    const u = userEvent.setup()
    const props = row({ log: log({ at: '09:00', mins: 30 }) })

    await u.click(screen.getByText('09:00'))
    const start = screen.getByDisplayValue('09:00')
    await u.clear(start)
    await u.type(start, '14:00')
    await u.keyboard('{Enter}')

    // Only the start is written; 30 minutes is untouched, so the end is 14:30.
    expect(props.onPatch).toHaveBeenCalledWith({ at: '14:00' })
    expect(props.onPatch).toHaveBeenCalledTimes(1)
  })
})

describe('ActivityRow — renaming a row that already exists', () => {
  it('saves the new name when the pointer lands outside', async () => {
    const u = userEvent.setup()
    const props = row({ naming: true, log: log({ name: 'Tên cũ' }) })

    const field = screen.getByPlaceholderText('Hoạt động gì')
    await u.clear(field)
    await u.type(field, 'Tên mới')
    fireEvent.mouseDown(document.body)

    expect(props.onName).toHaveBeenCalledWith('Tên mới')
  })

  it('survives reaching for the project chip mid-rename', async () => {
    const u = userEvent.setup()
    const props = row({ naming: true, log: log({ name: 'Tên cũ', project: null }) })

    await u.click(screen.getByText('+ project'))

    expect(props.onName).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('Hoạt động gì')).toHaveValue('Tên cũ')
  })

  it('reports an emptied name as empty — the screen decides what that means', async () => {
    const u = userEvent.setup()
    const props = row({ naming: true, log: log({ name: 'Tên cũ' }) })

    await u.clear(screen.getByPlaceholderText('Hoạt động gì'))
    fireEvent.mouseDown(document.body)

    // This row already has an hour and two tags on it. Deleting its name is
    // not the same act as abandoning a blank row, and the difference is the
    // screen's to make, not this component's.
    expect(props.onName).toHaveBeenCalledWith('')
  })
})

describe('ActivityRow — nhân đôi', () => {
  it('copies the row without touching it', async () => {
    const props = row()
    await userEvent.click(screen.getByRole('button', { name: 'Nhân đôi beanweirdo: fermentation memos' }))

    expect(props.onClone).toHaveBeenCalledTimes(1)
    expect(props.onRemove).not.toHaveBeenCalled()
    expect(props.onPatch).not.toHaveBeenCalled()
    // The copy arrives complete, so nothing asks for a name.
    expect(props.onStartNaming).not.toHaveBeenCalled()
  })

  it('hides the copy button on a day that can no longer be edited', () => {
    row({ editable: false })
    expect(screen.queryByRole('button', { name: /Nhân đôi/ })).not.toBeInTheDocument()
  })
})

describe('ActivityRow — ghi chú', () => {
  it('shows nothing at all on a row without a note', () => {
    // A row nobody wrote a note on must look exactly like a row from before
    // notes existed — no line, no gap, nothing advertising itself.
    row({ log: log({ note: null }) })

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Ghi chú hoặc link')).not.toBeInTheDocument()
    expect(screen.queryByText('ghi chú/link')).not.toBeInTheDocument()
  })

  it('offers the field only while the row is being written', () => {
    // The way in is the name edit, not a permanent prompt on every row.
    row({ naming: true, log: log({ note: null }) })

    expect(screen.getByLabelText('Ghi chú hoặc link')).toBeInTheDocument()
  })

  it('shows a link as its host, opening in its own tab', () => {
    row({ log: log({ note: 'https://www.arxiv.org/abs/2401.12345?utm_source=x' }) })
    const a = screen.getByRole('link')

    // The host is what the eye reads; the whole address is what the click gets.
    expect(a).toHaveTextContent('arxiv.org/…')
    expect(a).toHaveAttribute('href', 'https://www.arxiv.org/abs/2401.12345?utm_source=x')
    expect(a).toHaveAttribute('target', '_blank')
  })

  it('opens the note field alongside the name when the row is being edited', () => {
    row({ naming: true, log: log({ note: 'nhớ đọc lại chương 4' }) })

    expect(screen.getByLabelText('Ghi chú hoặc link')).toHaveValue('nhớ đọc lại chương 4')
  })

  it('saves the note with the name on Enter', async () => {
    const props = row({ naming: true, log: log({ note: null }) })
    const field = screen.getByLabelText('Ghi chú hoặc link')

    await userEvent.type(field, 'https://github.com/beanweirdo')
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(props.onPatch).toHaveBeenCalledWith({ note: 'https://github.com/beanweirdo' })
    expect(props.onName).toHaveBeenCalled()
  })

  it('does not write the note back when it was not touched', async () => {
    const props = row({ naming: true, log: log({ note: 'https://github.com/beanweirdo' }) })
    fireEvent.keyDown(screen.getByLabelText('Ghi chú hoặc link'), { key: 'Enter' })

    expect(props.onPatch).not.toHaveBeenCalled()
  })
})

describe('ActivityRow — một hoạt động nhiều lần', () => {
  const sitting = (over: Partial<LogEntry> = {}): LogEntry =>
    log({ id: 's1', name: '', at: '13:42', mins: 180, ...over })

  it('replaces the clock pair with a count', () => {
    row({
      log: log({ name: 'beanweirdo: web code' }),
      sittings: [sitting(), sitting({ id: 's2', at: '23:10', mins: 80 })],
    })

    // Two ends hours apart, with a gap between them, sitting next to a total
    // they do not add up to — so the pair goes and the count stays.
    expect(screen.getByText('2 lần')).toBeInTheDocument()
    expect(screen.queryByText('13:42 – 16:42')).not.toBeInTheDocument()
  })

  it('totals the sittings rather than showing the parent own minutes', () => {
    row({
      log: log({ mins: 999 }),
      sittings: [sitting({ mins: 180 }), sitting({ id: 's2', mins: 80 })],
    })

    expect(screen.getByText('4h 20m')).toBeInTheDocument()
    expect(screen.queryByText('16h 39m')).not.toBeInTheDocument()
  })

  it('keeps the name and both tags on the heading only', () => {
    row({
      log: log({ name: 'web code', project: 'Sao đâu', kind: 'đọc' }),
      sittings: [sitting(), sitting({ id: 's2' })],
    })

    // One name, one project chip, one task chip — not one per sitting.
    expect(screen.getAllByText('web code')).toHaveLength(1)
    expect(screen.getAllByText('#Sao đâu')).toHaveLength(1)
  })

  it('offers a way to add another sitting, and names it for the activity', async () => {
    const props = row({ log: log({ name: 'web code' }), sittings: [sitting()] })
    await userEvent.click(screen.getByRole('button', { name: 'Thêm một lần nữa cho web code' }))

    expect(props.onAddSitting).toHaveBeenCalledTimes(1)
  })

  it('removes one sitting without touching the activity', async () => {
    const props = row({ sittings: [sitting({ at: '13:42' }), sitting({ id: 's2', at: '23:10' })] })
    await userEvent.click(screen.getByRole('button', { name: 'Xoá lần 23:10' }))

    expect(props.onRemoveSitting).toHaveBeenCalledWith('s2')
    expect(props.onRemove).not.toHaveBeenCalled()
  })

  it('leaves a plain row exactly as it was', () => {
    row({ log: log({ at: '16:57', mins: 30 }) })

    // No count, no second tier — just the clock pair it has always shown.
    expect(screen.queryByText(/lần$/)).not.toBeInTheDocument()
    expect(screen.getByText('16:57')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Xoá lần/ })).not.toBeInTheDocument()
  })

  it('offers the same control on a plain row, since that is how a group starts', async () => {
    // The first press turns the row into a heading with two sittings under it.
    // It is an icon beside the copy button, not a line of text on every row.
    const props = row({ log: log({ name: 'web code' }) })
    await userEvent.click(screen.getByRole('button', { name: 'Thêm một lần nữa cho web code' }))

    expect(props.onAddSitting).toHaveBeenCalledTimes(1)
  })

  it('hides the controls on a day that can no longer be edited', () => {
    row({ editable: false, sittings: [sitting(), sitting({ id: 's2' })] })

    expect(screen.queryByRole('button', { name: /Thêm một lần nữa/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Xoá lần/ })).not.toBeInTheDocument()
    // The reading itself stays: a locked day still shows what happened.
    expect(screen.getByText('2 lần')).toBeInTheDocument()
  })
})

describe('ActivityRow — gộp vào hàng trên', () => {
  it('offers the fold only when there is somewhere to fold into', async () => {
    const props = row({ log: log({ name: 'web code' }), onMerge: vi.fn() })
    await userEvent.click(screen.getByRole('button', { name: 'Gộp web code vào hàng trên' }))

    expect(props.onMerge).toHaveBeenCalledTimes(1)
    // Folding is not deleting, and not copying.
    expect(props.onRemove).not.toHaveBeenCalled()
    expect(props.onClone).not.toHaveBeenCalled()
  })

  it('hides the fold when nothing above matches', () => {
    row({ log: log({ name: 'web code' }) })
    expect(screen.queryByRole('button', { name: /Gộp/ })).not.toBeInTheDocument()
  })

  it('hides the fold on a day that can no longer be edited', () => {
    row({ editable: false, log: log({ name: 'web code' }), onMerge: vi.fn() })
    expect(screen.queryByRole('button', { name: /Gộp/ })).not.toBeInTheDocument()
  })
})
