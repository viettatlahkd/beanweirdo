/**
 * What happens to a table's shape when the writer changes it.
 *
 * Column widths are the reason this is not four one-line functions inside the
 * editor. Adding a column has to take room from the others, removing one has
 * to give its room back, and dragging a boundary must move exactly two
 * columns — get any of it wrong and the writer's careful table quietly
 * redistributes itself every time they touch it.
 */
import type { ReportTable, TableMerge } from 'post-renderer'

/** No column may be dragged below this share, or it becomes unclickable. */
const MIN_WIDTH = 6

/** The widths actually in force — the stored ones, or equal columns. */
export function widthsOf(table: ReportTable): number[] {
  const n = table.columns.length
  if (n === 0) return []
  const w = table.widths
  if (!w || w.length !== n) return Array.from({ length: n }, () => 100 / n)
  return w
}

/**
 * Moves the boundary between column `index` and the one after it.
 *
 * Only those two change. Pushing a boundary past a neighbour's minimum stops
 * at the minimum rather than eating into the column beyond, so a drag can
 * never cascade down the whole table.
 */
export function resizeColumn(table: ReportTable, index: number, deltaPct: number): ReportTable {
  const w = widthsOf(table)
  if (index < 0 || index >= w.length - 1) return table
  const room = w[index] + w[index + 1]
  const left = Math.min(room - MIN_WIDTH, Math.max(MIN_WIDTH, w[index] + deltaPct))
  const next = [...w]
  next[index] = left
  next[index + 1] = room - left
  return { ...table, widths: next }
}

/** A new column at the end, taking its share proportionally from the rest. */
export function addColumn(table: ReportTable, label: string): ReportTable {
  const w = widthsOf(table)
  const n = w.length + 1
  const share = 100 / n
  const scaled = w.map((x) => x * (1 - share / 100))
  return {
    ...table,
    columns: [...table.columns, label],
    rows: table.rows.map((r) => ({ cells: [...r.cells, ''] })),
    widths: [...scaled, share],
  }
}

/**
 * Removes a column and gives its room back to the others.
 *
 * The last column stays. A table with no columns renders as nothing at all —
 * the writer would be looking at a blank where their table was, with no way to
 * tell an empty table from a deleted one.
 */
export function removeColumn(table: ReportTable, index: number): ReportTable {
  if (table.columns.length <= 1) return table
  const w = widthsOf(table)
  const freed = w[index]
  const kept = w.filter((_, i) => i !== index)
  const total = kept.reduce((a, b) => a + b, 0)
  // A merge whose first column goes keeps its words: they move to the column taking its place.
  const rows = table.rows.map((r) => ({ cells: [...r.cells] }))
  for (const m of table.merges ?? []) if (m.col === index && m.cols > 1) rows[m.row].cells[index + 1] = rows[m.row].cells[index]
  return tidy({
    ...table,
    columns: table.columns.filter((_, i) => i !== index),
    rows: rows.map((r) => ({ cells: r.cells.filter((_, i) => i !== index) })),
    widths: kept.map((x) => x + (freed * x) / total),
    merges: (table.merges ?? []).map((m) => shrink(m, 'col', 'cols', index)),
  })
}

export function addRow(table: ReportTable): ReportTable {
  return { ...table, rows: [...table.rows, { cells: table.columns.map(() => '') }] }
}

/** The last row stays, for the same reason the last column does. */
export function removeRow(table: ReportTable, index: number): ReportTable {
  if (table.rows.length <= 1) return table
  // A merge whose first row goes keeps its words: they move to the row taking its place.
  const rows = table.rows.map((r) => ({ cells: [...r.cells] }))
  for (const m of table.merges ?? []) if (m.row === index && m.rows > 1) rows[index + 1].cells[m.col] = rows[index].cells[m.col]
  return tidy({
    ...table,
    rows: rows.filter((_, i) => i !== index),
    merges: (table.merges ?? []).map((m) => shrink(m, 'row', 'rows', index)),
  })
}

/** A merge after line `index` (a row or a column) is taken out: moved up past it, or one shorter across it. */
function shrink(m: TableMerge, at: 'row' | 'col', span: 'rows' | 'cols', index: number): TableMerge {
  if (m[at] > index) return { ...m, [at]: m[at] - 1 }
  if (index < m[at] + m[span]) return { ...m, [span]: m[span] - 1 }
  return m
}

const overlaps = (a: TableMerge, b: TableMerge) =>
  a.row < b.row + b.rows && b.row < a.row + a.rows && a.col < b.col + b.cols && b.col < a.col + a.cols

/** Merges kept valid: inside the table, more than one cell, none overlapping another. */
function tidy(table: ReportTable): ReportTable {
  const nr = table.rows.length
  const nc = table.columns.length
  const kept: TableMerge[] = []
  for (const m of table.merges ?? []) {
    const n = { row: m.row, col: m.col, rows: Math.min(m.rows, nr - m.row), cols: Math.min(m.cols, nc - m.col) }
    if (n.row < 0 || n.col < 0 || n.rows < 1 || n.cols < 1 || n.rows * n.cols < 2) continue
    if (kept.some((k) => overlaps(k, n))) continue
    kept.push(n)
  }
  const { merges: _drop, ...rest } = table
  return kept.length > 0 ? { ...rest, merges: kept } : rest
}

/**
 * Joins the body cells between two corners into one (owner, 2026-10-17).
 *
 * A merge the area touches is taken in whole, so merges never overlap. No
 * words are lost: every filled cell's text goes into the new one, in reading
 * order, a blank line apart.
 */
export function mergeCells(table: ReportTable, a: { row: number; col: number }, b: { row: number; col: number }): ReportTable {
  let area: TableMerge = {
    row: Math.min(a.row, b.row),
    col: Math.min(a.col, b.col),
    rows: Math.abs(a.row - b.row) + 1,
    cols: Math.abs(a.col - b.col) + 1,
  }
  let rest = table.merges ?? []
  for (let grown = true; grown; ) {
    grown = false
    for (const m of rest.filter((m) => overlaps(m, area))) {
      const row = Math.min(area.row, m.row)
      const col = Math.min(area.col, m.col)
      area = {
        row,
        col,
        rows: Math.max(area.row + area.rows, m.row + m.rows) - row,
        cols: Math.max(area.col + area.cols, m.col + m.cols) - col,
      }
      rest = rest.filter((x) => x !== m)
      grown = true
    }
  }
  if (area.rows * area.cols < 2) return table
  const words: string[] = []
  const rows = table.rows.map((r, ri) => ({
    cells: r.cells.map((c, ci) => {
      const inside = ri >= area.row && ri < area.row + area.rows && ci >= area.col && ci < area.col + area.cols
      if (!inside) return c
      if (c.trim() !== '') words.push(c.trim())
      return ''
    }),
  }))
  rows[area.row].cells[area.col] = words.join('\n\n')
  return tidy({ ...table, rows, merges: [...rest, area] })
}

/** Undoes the merge anchored at a cell; its words stay in that cell. */
export function splitCell(table: ReportTable, row: number, col: number): ReportTable {
  return tidy({ ...table, merges: (table.merges ?? []).filter((m) => !(m.row === row && m.col === col)) })
}

/** "Cột 3" when 3 is free — a name repeated is a heading nobody can tell apart. */
export function freeColumnName(columns: string[]): string {
  const taken = new Set(columns)
  for (let n = columns.length + 1; ; n += 1) {
    const name = `Cột ${n}`
    if (!taken.has(name)) return name
  }
}
