/**
 * Enter và Backspace giữa các khối, kiểm trên dữ liệu.
 *
 * Chỗ dễ sai không phải "Enter mở khối mới" mà là những chỗ khối bên cạnh
 * không có ô chữ: nhập một đoạn văn vào một cái bảng thì nhập vào đâu.
 */
import type { ReportBlock } from 'post-renderer'
import { describe, expect, it } from 'vitest'
import { backspaceBlock, blockKey, enterBlock, spaceBlock } from './blockKeys'

const para = (text: string, id = 'b1') => ({ type: 'paragraph', id, text }) as unknown as ReportBlock
const head = (text: string, id = 'h1') => ({ type: 'heading', id, level: 2, text }) as unknown as ReportBlock
const table = () => ({ type: 'table', id: 't1', table: { columns: [], rows: [] } }) as unknown as ReportBlock

const shape = (blocks: ReportBlock[] | undefined) =>
  (blocks ?? []).map((b) => `${b.type}:${String((b as { text?: string }).text ?? '')}`)

describe('Enter', () => {
  it('ở cuối khối mở một đoạn văn mới', () => {
    const out = enterBlock([para('xong')], 0, 'xong', 4)
    expect(shape(out?.blocks)).toEqual(['paragraph:xong', 'paragraph:'])
    expect(out?.focus).toEqual({ at: 1, caret: 0 })
  })

  it('ở cuối một tiêu đề cũng mở đoạn văn, không mở thêm tiêu đề', () => {
    // Gõ xong một tiêu đề thì thứ tiếp theo gần như luôn là chữ.
    const out = enterBlock([head('Mẻ rang')], 0, 'Mẻ rang', 7)
    expect(shape(out?.blocks)).toEqual(['heading:Mẻ rang', 'paragraph:'])
  })

  it('ở giữa chữ thì tách, hai nửa giữ nguyên loại', () => {
    const out = enterBlock([head('mộthai')], 0, 'mộthai', 3)
    expect(shape(out?.blocks)).toEqual(['heading:một', 'heading:hai'])
  })

  it('nửa sau giữ cấp tiêu đề nhưng phải mang id khác', () => {
    const out = enterBlock([head('mộthai')], 0, 'mộthai', 3)
    const [a, b] = out!.blocks as unknown as { id: string; level: number }[]
    expect(b.level).toBe(2)
    expect(b.id).not.toBe(a.id)
  })

  it('khối không có ô chữ thì trả phím lại', () => {
    expect(enterBlock([table()], 0, '', 0)).toBeNull()
  })
})

describe('Backspace ở đầu khối', () => {
  it('giữa chữ thì trả phím lại cho trình duyệt', () => {
    expect(backspaceBlock([para('a'), para('b', 'b2')], 1, 'b', 1)).toBeNull()
  })

  it('tiêu đề có chữ thì hạ xuống đoạn văn trước, chưa xoá', () => {
    // Mất một tiêu đề đã gõ xong vì một phím lỡ tay đau hơn nhiều so với
    // thừa một lần bấm.
    const out = backspaceBlock([para('trên'), head('Tiêu đề', 'h9')], 1, 'Tiêu đề', 0)
    expect(shape(out?.blocks)).toEqual(['paragraph:trên', 'paragraph:Tiêu đề'])
    // Giữ nguyên id, vì đây vẫn là khối ấy — ghi chú neo vào nó không được rơi.
    expect((out!.blocks[1] as unknown as { id: string }).id).toBe('h9')
  })

  it('đoạn văn có chữ thì nhập lên khối trên, con trỏ ở chỗ nối', () => {
    const out = backspaceBlock([para('trên'), para('dưới', 'b2')], 1, 'dưới', 0)
    expect(shape(out?.blocks)).toEqual(['paragraph:trêndưới'])
    expect(out?.focus).toEqual({ at: 0, caret: 4 })
  })

  it('khối rỗng thì biến mất, con trỏ về cuối khối trên', () => {
    const out = backspaceBlock([para('trên'), para('', 'b2')], 1, '', 0)
    expect(shape(out?.blocks)).toEqual(['paragraph:trên'])
    expect(out?.focus).toEqual({ at: 0, caret: 4 })
  })

  it('khối trên không có ô chữ thì không nhập vào đâu cả', () => {
    // Nối một đoạn văn vào một cái bảng không có nghĩa gì, và nuốt mất đoạn
    // ấy là kiểu mất chữ tệ nhất: thứ không ai được báo.
    expect(backspaceBlock([table(), para('dưới', 'b2')], 1, 'dưới', 0)).toBeNull()
  })

  it('khối rỗng dưới một cái bảng vẫn xoá được, chỉ là không có chỗ đặt con trỏ', () => {
    const out = backspaceBlock([table(), para('', 'b2')], 1, '', 0)
    expect(shape(out?.blocks)).toEqual(['table:'])
    expect(out?.focus).toBeUndefined()
  })

  it('khối đầu tiên không có gì phía trên thì trả phím lại', () => {
    expect(backspaceBlock([para('một')], 0, 'một', 0)).toBeNull()
  })
})

describe('chọn phím', () => {
  const key = (k: string, shift = false) => ({ key: k, shiftKey: shift })

  it('đang bôi đen thì phím thuộc về vùng chọn', () => {
    expect(blockKey([para('a')], 0, key('Enter'), 'a', 1, true)).toBeNull()
  })

  it('Shift+Enter chưa nhận, để dành cho ngắt dòng trong khối', () => {
    expect(blockKey([para('a')], 0, key('Enter', true), 'a', 1, false)).toBeNull()
  })

  it('phím thường thì không đụng tới cấu trúc', () => {
    expect(blockKey([para('a')], 0, key('x'), 'a', 1, false)).toBeNull()
  })
})

describe('gõ ký hiệu đầu dòng để đổi loại khối', () => {
  it('`# ` thành tiêu đề cấp một, `###` thành cấp ba', () => {
    expect((enterOrSpace('#'))).toMatchObject({ type: 'heading', level: 1 })
    expect((enterOrSpace('###'))).toMatchObject({ type: 'heading', level: 3 })
  })

  it('`- ` thành danh sách, `1. ` thành danh sách đánh số', () => {
    expect(enterOrSpace('-')).toMatchObject({ type: 'list', ordered: false })
    expect(enterOrSpace('1.')).toMatchObject({ type: 'list', ordered: true })
  })

  it('`> ` thành trích dẫn', () => {
    expect(enterOrSpace('>')).toMatchObject({ type: 'quote' })
  })

  it('giữ nguyên id — vẫn là khối ấy, ghi chú neo vào nó không được rơi', () => {
    expect((enterOrSpace('#') as { id?: string }).id).toBe('b1')
  })

  it('chữ đã gõ sau ký hiệu thì đi theo sang khối mới', () => {
    const out = spaceBlock([para('#Mẻ rang')], 0, '#Mẻ rang', 1)
    expect((out!.blocks[0] as unknown as { text: string }).text).toBe('Mẻ rang')
  })

  it('ký hiệu giữa câu thì không đổi gì — `#` ở đó là một dấu thăng', () => {
    expect(spaceBlock([para('mẻ #14')], 0, 'mẻ #14', 5)).toBeNull()
  })

  it('đầu dòng mà không phải ký hiệu nào thì thôi', () => {
    expect(spaceBlock([para('xong')], 0, 'xong', 4)).toBeNull()
  })

  it('khối không có ô chữ thì không đụng tới', () => {
    expect(spaceBlock([table()], 0, '#', 1)).toBeNull()
  })
})

/** Gõ `prefix` rồi dấu cách ở đầu một đoạn văn rỗng, trả về khối sinh ra. */
function enterOrSpace(prefix: string) {
  const out = spaceBlock([para(prefix)], 0, prefix, prefix.length)
  return out!.blocks[0] as unknown as Record<string, unknown>
}
