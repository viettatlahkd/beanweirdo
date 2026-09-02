import type { ReportTable } from 'post-renderer'
import { describe, expect, it } from 'vitest'
import { addColumn, addRow, freeColumnName, removeColumn, removeRow, resizeColumn, widthsOf } from './reportTable'

const table = (): ReportTable => ({
  columns: ['Mốc', 'Thời gian', 'Nhiệt'],
  rows: [{ cells: ['Sấy', '0:00', '196°C'] }, { cells: ['Maillard', '4:20', '162°C'] }],
})

const sum = (w: number[]) => Math.round(w.reduce((a, b) => a + b, 0))

describe('the widths in force', () => {
  it('are equal when a table was written before widths existed', () => {
    expect(widthsOf(table())).toEqual([100 / 3, 100 / 3, 100 / 3])
  })

  it('ignore a stored list that no longer matches the columns', () => {
    expect(widthsOf({ ...table(), widths: [50, 50] })).toEqual([100 / 3, 100 / 3, 100 / 3])
  })
})

describe('dragging a boundary', () => {
  it('moves exactly the two columns it sits between', () => {
    const out = resizeColumn({ ...table(), widths: [40, 30, 30] }, 0, 10)
    expect(out.widths).toEqual([50, 20, 30])
  })

  it('stops at the neighbour rather than cascading down the table', () => {
    const out = resizeColumn({ ...table(), widths: [40, 30, 30] }, 0, 90)
    expect(out.widths).toEqual([64, 6, 30])
  })

  it('does nothing at the last boundary, where there is no neighbour', () => {
    const t = { ...table(), widths: [40, 30, 30] }
    expect(resizeColumn(t, 2, 10)).toBe(t)
  })
})

describe('adding and removing a column', () => {
  it('takes the new column’s room proportionally from the rest', () => {
    const out = addColumn(table(), 'Ghi')
    expect(out.columns).toHaveLength(4)
    expect(out.rows.every((r) => r.cells.length === 4)).toBe(true)
    expect(sum(out.widths!)).toBe(100)
    expect(out.widths![3]).toBe(25)
  })

  it('gives a removed column’s room back to the others', () => {
    const out = removeColumn({ ...table(), widths: [50, 30, 20] }, 0)
    expect(out.columns).toEqual(['Thời gian', 'Nhiệt'])
    expect(sum(out.widths!)).toBe(100)
    expect(out.widths![0]).toBeGreaterThan(30)
  })

  it('keeps the last column, because a table with none renders as nothing', () => {
    const one: ReportTable = { columns: ['Mốc'], rows: [{ cells: ['Sấy'] }] }
    expect(removeColumn(one, 0)).toBe(one)
  })
})

describe('adding and removing a row', () => {
  it('adds a row as wide as the table', () => {
    expect(addRow(table()).rows[2].cells).toEqual(['', '', ''])
  })

  it('keeps the last row', () => {
    const one: ReportTable = { columns: ['Mốc'], rows: [{ cells: ['Sấy'] }] }
    expect(removeRow(one, 0)).toBe(one)
  })
})

describe('naming a new column', () => {
  it('skips a name already in use, so two headings are never the same', () => {
    expect(freeColumnName(['Mốc', 'Thời gian'])).toBe('Cột 3')
    expect(freeColumnName(['Cột 3', 'Cột 4'])).toBe('Cột 5')
  })
})
