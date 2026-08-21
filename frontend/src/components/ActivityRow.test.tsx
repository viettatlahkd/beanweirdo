import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
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
    onRemove: vi.fn(),
    ...over,
  }
  render(<ActivityRow {...props} />)
  return props
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
