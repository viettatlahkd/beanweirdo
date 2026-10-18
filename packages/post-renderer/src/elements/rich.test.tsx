import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Inline, RichText } from './index'

const html = (text: string) => renderToStaticMarkup(<RichText text={text} accentInk="#000" />)

describe('RichText — chữ trong khối nhấn và ô bảng', () => {
  it('chữ không có dấu khối vẽ như trước, giữ chỗ xuống dòng', () => {
    const text = '**Compressed**\nNước đi sau > rút ngắn'
    expect(html(text)).toBe(`<span style="white-space:pre-line">${renderToStaticMarkup(<Inline text={text} accentInk="#000" />)}</span>`)
  })

  it('đánh số, gạch đầu dòng và tiêu đề ra đúng khối (chủ site, 2026-10-17)', () => {
    const out = html('## Thay đổi\n\n1. Một\n2. Hai\n\n- chấm')
    expect(out).toContain('Thay đổi')
    expect(out).toContain('1.</span>')
    expect(out).toContain('2.</span>')
    expect(out).toContain('•</span>')
    expect(out).not.toContain('## ')
  })
})

describe('RichText — đoạn chữ thường bên cạnh danh sách', () => {
  it('giữ chỗ xuống dòng trong đoạn', () => {
    const para = '**Compressed**\nNước đi sau'
    expect(html(`${para}\n\n- chấm`)).toContain(renderToStaticMarkup(<Inline text={para} accentInk="#000" />))
  })
})

describe('bảng có ô gộp (chủ site, 2026-10-17)', () => {
  it('ô gốc trải rowSpan/colSpan, ô bị phủ không vẽ', async () => {
    const { ElementList } = await import('./index')
    const { paletteFrom } = await import('../palette')
    const out = renderToStaticMarkup(
      <ElementList
        palette={paletteFrom('#3E7A4E')}
        elements={[
          {
            type: 'table',
            table: {
              columns: ['A', 'B'],
              rows: [{ cells: ['gộp', 'x'] }, { cells: ['', 'y'] }],
              merges: [{ row: 0, col: 0, rows: 2, cols: 1 }],
            },
          },
        ]}
      />,
    )
    expect(out).toContain('rowSpan="2"'.toLowerCase())
    expect((out.match(/<td/g) ?? []).length).toBe(3)
  })
})
