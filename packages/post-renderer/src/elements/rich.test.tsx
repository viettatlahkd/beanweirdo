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
