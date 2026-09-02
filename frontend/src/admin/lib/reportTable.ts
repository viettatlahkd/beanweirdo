/**
 * What happens to a table's shape when the writer changes it.
 *
 * Column widths are the reason this is not four one-line functions inside the
 * editor. Adding a column has to take room from the others, removing one has
 * to give its room back, and dragging a boundary must move exactly two
 * columns — get any of it wrong and the writer's careful table quietly
 * redistributes itself every time they touch it.
 */
import type { ReportTable } from 'post-renderer'

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
  return {
    columns: table.columns.filter((_, i) => i !== index),
    rows: table.rows.map((r) => ({ cells: r.cells.filter((_, i) => i !== index) })),
    widths: kept.map((x) => x + (freed * x) / total),
  }
}

export function addRow(table: ReportTable): ReportTable {
  return { ...table, rows: [...table.rows, { cells: table.columns.map(() => '') }] }
}

/** The last row stays, for the same reason the last column does. */
export function removeRow(table: ReportTable, index: number): ReportTable {
  if (table.rows.length <= 1) return table
  return { ...table, rows: table.rows.filter((_, i) => i !== index) }
}

/** "Cột 3" when 3 is free — a name repeated is a heading nobody can tell apart. */
export function freeColumnName(columns: string[]): string {
  const taken = new Set(columns)
  for (let n = columns.length + 1; ; n += 1) {
    const name = `Cột ${n}`
    if (!taken.has(name)) return name
  }
}
