/** Elements that hold figures: pairs, bars and rows. */
import { ink, paper, sans, serif } from '../tokens'
import { registerElement, type ElementViewProps } from './registry'

export type MetricsAttrs = { type: 'metrics'; id?: string; items: { label: string; value: string }[] }
export type ChartAttrs = { type: 'chart'; id?: string; points: { label: string; heightPct: number }[] }
export type TableAttrs = {
  type: 'table'
  id?: string
  table: { columns: string[]; rows: { cells: string[] }[]; widths?: number[] }
}

export const metrics = registerElement<MetricsAttrs>({
  name: 'metrics',
  title: 'Số liệu',
  category: 'data',
  description: 'Một hàng cặp nhãn–giá trị: nhiệt, thời gian, liều.',
  keywords: ['số liệu', 'thông số', 'metrics', 'specs', 'chỉ số'],
  attributes: { items: { type: 'array', note: '[{ label, value }]' } },
  blank: () => ({ type: 'metrics', items: [{ label: '', value: '' }] }),
  View: ({ attributes, index, testId, render }: ElementViewProps<MetricsAttrs>) => (
    <div
      data-testid={testId}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(132px,1fr))', gap: 1, background: '#E6E2D2', margin: '0 0 20px' }}
    >
      {attributes.items.map((m, mi) => (
        <div key={mi} style={{ background: '#FFFFFF', padding: '13px 14px 14px' }}>
          <div style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 500, letterSpacing: '.16em', textTransform: 'uppercase', color: '#8A8A7C', marginBottom: 7 }}>
            {m.label}
          </div>
          <div style={{ fontFamily: serif, fontSize: 26, lineHeight: 1, letterSpacing: '-.02em', color: '#172124', fontVariantNumeric: 'tabular-nums' }}>
            {render?.renderMetric ? render.renderMetric(m, index, mi) : m.value}
          </div>
        </div>
      ))}
    </div>
  ),
})

export const chart = registerElement<ChartAttrs>({
  name: 'chart',
  title: 'Biểu đồ',
  category: 'data',
  description: 'Cột đứng cạnh nhau — đường cong rang, thời gian pha.',
  keywords: ['biểu đồ', 'chart', 'cột', 'đường cong'],
  attributes: { points: { type: 'array', note: '[{ label, heightPct 0–100 }]' } },
  blank: () => ({ type: 'chart', points: [{ label: '', heightPct: 50 }] }),
  View: ({ attributes, palette, testId }: ElementViewProps<ChartAttrs>) => (
    <div
      data-testid={testId}
      style={{ margin: '0 0 20px', borderLeft: '1px solid #DDD9C8', borderBottom: '1px solid #DDD9C8', padding: '0 0 0 8px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 168 }}>
        {attributes.points.map((p, pi) => (
          <div key={pi} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ height: `${p.heightPct}%`, background: palette.accent }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
        {attributes.points.map((p, pi) => (
          <div key={pi} style={{ flex: 1, textAlign: 'center', fontFamily: sans, fontSize: 9.5, color: '#8A8A7C', fontVariantNumeric: 'tabular-nums' }}>
            {p.label}
          </div>
        ))}
      </div>
    </div>
  ),
})

/**
 * A column's share of the table.
 *
 * A table written before widths existed has none, and the writer of one that
 * does may have added a column since — so a stored list that no longer matches
 * the columns is ignored rather than stretched to fit, which would move every
 * boundary the writer had set.
 */
export function columnWidth(table: TableAttrs['table'], index: number): string {
  const w = table.widths
  if (!w || w.length !== table.columns.length) return `${100 / Math.max(table.columns.length, 1)}%`
  return `${w[index]}%`
}

export const table = registerElement<TableAttrs>({
  name: 'table',
  title: 'Bảng',
  category: 'data',
  description: 'Hàng và cột, kéo được bề rộng cột.',
  keywords: ['bảng', 'table', 'cột', 'hàng'],
  attributes: {
    table: { type: 'object', note: '{ columns[], rows[{cells[]}], widths?[] } — widths tính bằng phần trăm' },
  },
  blank: () => ({ type: 'table', table: { columns: ['Cột 1'], rows: [{ cells: [''] }] } }),
  View: ({ attributes, palette, index, testId, render }: ElementViewProps<TableAttrs>) => (
    <div data-testid={testId} style={{ margin: '0 0 20px', overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', fontFamily: sans }}>
        <colgroup>
          {attributes.table.columns.map((_, ci) => (
            <col key={ci} style={{ width: columnWidth(attributes.table, ci) }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {attributes.table.columns.map((h, hi) => (
              <th key={hi} style={{ textAlign: 'left', padding: 0, borderBottom: `1px solid ${ink.base}` }}>
                <div style={{ padding: '0 10px 8px', fontWeight: 500, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: palette.ink }}>
                  {h}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {attributes.table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.cells.map((cell, ci) => (
                <td key={ci} style={{ padding: 0, borderBottom: `1px solid ${paper.rule}`, verticalAlign: 'top' }}>
                  <div
                    style={{
                      fontWeight: 300,
                      fontSize: 14,
                      lineHeight: 1.45,
                      color: ink.strong,
                      padding: 10,
                      overflowWrap: 'break-word',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {render?.renderTableCell ? render.renderTableCell(cell, index, ri, ci) : cell}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
})
