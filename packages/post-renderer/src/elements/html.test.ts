/**
 * Dán từ Notion: định dạng sống sót, style của trang nguồn thì không.
 *
 * Bản `text/plain` mà Notion đặt lên clipboard đã bỏ đậm và bỏ link, nên đọc
 * bản ấy là chấp nhận mất định dạng mọi lần dán. Đọc bản HTML rồi dịch về
 * markdown giữ được cả hai đầu: chữ đậm còn, mà phông với màu của Notion
 * không theo sang.
 */
import { describe, expect, it } from 'vitest'
import { htmlToMarkdown, pastedToBlocks } from './index'

describe('HTML về markdown', () => {
  it('đậm và nghiêng về cùng một mức nhấn — design chỉ có một', () => {
    expect(htmlToMarkdown('<p>có <strong>đậm</strong> và <em>nghiêng</em></p>')).toBe(
      'có **đậm** và **nghiêng**',
    )
  })

  it('link giữ cả chữ lẫn địa chỉ', () => {
    expect(htmlToMarkdown('<p>xem <a href="https://a.com">đây</a></p>')).toBe('xem [đây](https://a.com)')
  })

  it('tiêu đề giữ đúng cấp', () => {
    expect(htmlToMarkdown('<h1>một</h1><h3>ba</h3>')).toBe('# một\n\n### ba')
  })

  it('danh sách thành gạch đầu dòng, các mục không bị dòng trống cắt rời', () => {
    expect(htmlToMarkdown('<ul><li>một</li><li>hai</li></ul>')).toBe('- một\n- hai')
  })

  it('danh sách đánh số tự đánh lại từ một', () => {
    expect(htmlToMarkdown('<ol><li>một</li><li>hai</li></ol>')).toBe('1. một\n2. hai')
  })

  it('danh sách lồng giữ được tầng bậc', () => {
    expect(htmlToMarkdown('<ul><li>cha<ul><li>con</li></ul></li></ul>')).toBe('- cha\n  - con')
  })

  it('bảng thành bảng markdown, đọc lại được thành element bảng', () => {
    const md = htmlToMarkdown('<table><tr><th>Ngày</th><th>Điểm</th></tr><tr><td>01</td><td>8.5</td></tr></table>')
    expect(md).toBe('| Ngày | Điểm |\n|---|---|\n| 01 | 8.5 |')
    expect(pastedToBlocks(md)?.[0]).toMatchObject({
      type: 'table',
      table: { columns: ['Ngày', 'Điểm'], rows: [{ cells: ['01', '8.5'] }] },
    })
  })

  it('style của trang nguồn không theo sang', () => {
    const md = htmlToMarkdown('<p style="color:#ff0000;font-family:Inter">chữ <span style="font-weight:700">đây</span></p>')
    expect(md).toBe('chữ đây')
    expect(md).not.toContain('style')
    expect(md).not.toContain('color')
  })

  it('div lồng div của Notion không bị nối thành một dòng', () => {
    expect(htmlToMarkdown('<div><div><p>một</p></div><div><p>hai</p></div></div>')).toBe('một\n\nhai')
  })

  it('cả một trang Notion đọc lại thành đúng chuỗi khối', () => {
    const md = htmlToMarkdown(
      '<h3>Overall feedback</h3><ul><li>Chưa chốt <strong>test cases</strong>.</li><li>Chưa có exit criteria.</li></ul>',
    )
    expect(pastedToBlocks(md)?.map((b) => b.type)).toEqual(['heading', 'list'])
  })

  it('thẻ rỗng không sinh ra khối rỗng', () => {
    expect(htmlToMarkdown('<p></p><p>chữ</p><h2></h2>')).toBe('chữ')
  })

  it('HTML không có gì thì trả chuỗi rỗng, để bên gọi lùi về text/plain', () => {
    expect(htmlToMarkdown('<meta charset="utf-8">').trim()).toBe('')
  })
})
