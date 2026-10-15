/**
 * Gõ ký hiệu đầu dòng trong một khối chữ đứng riêng, kiểm trên dữ liệu.
 */
import type { ReportBlock } from 'post-renderer'
import { describe, expect, it } from 'vitest'
import { spaceBlock } from './blockKeys'

const para = (text: string, id = 'b1') => ({ type: 'paragraph', id, text }) as unknown as ReportBlock
const table = () => ({ type: 'table', id: 't1', table: { columns: [], rows: [] } }) as unknown as ReportBlock

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
