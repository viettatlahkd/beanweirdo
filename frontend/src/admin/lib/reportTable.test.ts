import type { ReportTable } from 'post-renderer'
import { describe, expect, it } from 'vitest'
import { addColumn, addRow, freeColumnName, mergeCells, removeColumn, removeRow, resizeColumn, splitCell, widthsOf } from './reportTable'

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

describe('gộp ô (chủ site, 2026-10-17)', () => {
  const grid = (): ReportTable => ({
    columns: ['A', 'B', 'C'],
    rows: [{ cells: ['a1', 'b1', 'c1'] }, { cells: ['a2', '', 'c2'] }, { cells: ['a3', 'b3', 'c3'] }],
  })

  it('gộp một vùng: ô gốc nhận hết chữ, theo thứ tự đọc; các ô bị phủ để trống', () => {
    const t = mergeCells(grid(), { row: 1, col: 1 }, { row: 0, col: 0 })
    expect(t.merges).toEqual([{ row: 0, col: 0, rows: 2, cols: 2 }])
    expect(t.rows[0].cells).toEqual(['a1\n\nb1\n\na2', '', 'c1'])
    expect(t.rows[1].cells).toEqual(['', '', 'c2'])
  })

  it('vùng chạm vào một ô đã gộp thì nuốt trọn ô ấy, không bao giờ chồng nhau', () => {
    const once = mergeCells(grid(), { row: 0, col: 0 }, { row: 1, col: 0 })
    const twice = mergeCells(once, { row: 1, col: 0 }, { row: 1, col: 2 })
    expect(twice.merges).toEqual([{ row: 0, col: 0, rows: 2, cols: 3 }])
  })

  it('một ô thì không gộp gì', () => {
    expect(mergeCells(grid(), { row: 1, col: 1 }, { row: 1, col: 1 })).toEqual(grid())
  })

  it('tách ô: bỏ vùng gộp, chữ ở lại ô gốc', () => {
    const t = splitCell(mergeCells(grid(), { row: 0, col: 0 }, { row: 0, col: 1 }), 0, 0)
    expect(t.merges).toBeUndefined()
    expect(t.rows[0].cells).toEqual(['a1\n\nb1', '', 'c1'])
  })

  it('xoá hàng đầu của vùng gộp: vùng ngắn lại, chữ chuyển xuống hàng thay chỗ', () => {
    const t = removeRow(mergeCells(grid(), { row: 0, col: 1 }, { row: 2, col: 1 }), 0)
    expect(t.merges).toEqual([{ row: 0, col: 1, rows: 2, cols: 1 }])
    expect(t.rows[0].cells[1]).toBe('b1\n\nb3')
  })

  it('xoá cột trong vùng gộp: vùng hẹp lại; còn một ô thì thôi gộp', () => {
    const t = removeColumn(mergeCells(grid(), { row: 0, col: 1 }, { row: 0, col: 2 }), 2)
    expect(t.merges).toBeUndefined()
    expect(t.columns).toEqual(['A', 'B'])
  })

  it('thêm hàng, thêm cột giữ nguyên vùng gộp', () => {
    const t = addColumn(addRow(mergeCells(grid(), { row: 0, col: 0 }, { row: 1, col: 1 })), 'D')
    expect(t.merges).toEqual([{ row: 0, col: 0, rows: 2, cols: 2 }])
  })
})
