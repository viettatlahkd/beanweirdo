/**
 * Dải chữ liền mạch, kiểm trên dữ liệu.
 *
 * Điều phải giữ bằng mọi giá: **không mất nội dung** khi gom vào một ô rồi
 * dựng lại, và **không mất `id`** vì ghi chú cạnh bài neo vào đó.
 */
import type { ReportBlock } from 'post-renderer'
import { textToRuns } from 'post-renderer'
import { describe, expect, it } from 'vitest'
import { splitForThing, toRuns, writeRun } from './flow'

const para = (text: string, id: string) => ({ type: 'paragraph', id, text }) as unknown as ReportBlock
const head = (text: string, id: string) => ({ type: 'heading', id, level: 2, text }) as unknown as ReportBlock
const list = (id: string, ...lines: string[]) =>
  ({ type: 'list', id, items: lines.map((t) => ({ runs: textToRuns(t) })) }) as unknown as ReportBlock
const table = (id: string) =>
  ({ type: 'table', id, table: { columns: ['a'], rows: [{ cells: ['b'] }], widths: [100] } }) as unknown as ReportBlock

describe('gom thành dải', () => {
  it('mọi khối chữ liền nhau vào chung một ô', () => {
    const runs = toRuns([head('Tiêu đề', 'b1'), para('Đoạn', 'b2'), list('b3', 'mục')])
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ kind: 'text', at: [0, 2] })
    expect((runs[0] as { text: string }).text).toBe('## Tiêu đề\n\nĐoạn\n\n- mục')
  })

  it('bảng cắm vào giữa, chữ hai bên là hai dải', () => {
    const runs = toRuns([para('trên', 'b1'), table('t1'), para('dưới', 'b2')])
    expect(runs.map((r) => r.kind)).toEqual(['text', 'thing', 'text'])
    expect(runs[1]).toMatchObject({ kind: 'thing', at: 1 })
  })

  it('bài chỉ có một cái bảng thì không sinh dải chữ rỗng', () => {
    expect(toRuns([table('t1')]).map((r) => r.kind)).toEqual(['thing'])
  })

  it('bài rỗng thì không có dải nào', () => {
    expect(toRuns([])).toEqual([])
  })
})

describe('sửa xong một dải', () => {
  const body = [head('Tiêu đề', 'b1'), para('Đoạn', 'b2'), table('t1')]

  it('dựng lại đúng khối, giữ nguyên cái bảng đứng sau', () => {
    const next = writeRun(body, [0, 1], '## Tiêu đề mới\n\nĐoạn\n\n- thêm mục')
    expect(next.map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'table'])
    expect((next[3] as unknown as { table: { widths: number[] } }).table.widths).toEqual([100])
  })

  it('giữ `id` cũ theo thứ tự — ghi chú cạnh bài neo vào đó', () => {
    const next = writeRun(body, [0, 1], '## Tiêu đề mới\n\nĐoạn')
    expect(next.map((b) => b.id)).toEqual(['b1', 'b2', 't1'])
  })

  it('khối mọc thêm thì mới cần id mới', () => {
    const next = writeRun(body, [0, 1], '## Một\n\nHai\n\nBa')
    expect(next.slice(0, 2).map((b) => b.id)).toEqual(['b1', 'b2'])
    expect(next[2].id).toBeUndefined()
  })

  it('xoá hết chữ thì dải biến mất, không để lại đoạn văn rỗng', () => {
    const next = writeRun(body, [0, 1], '   ')
    expect(next.map((b) => b.type)).toEqual(['table'])
  })

  it('bôi đen cả dải rồi gõ đè: nội dung mới thay trọn, cái bảng không suy suyển', () => {
    const next = writeRun(body, [0, 1], 'chỉ còn một câu')
    expect(next.map((b) => b.type)).toEqual(['paragraph', 'table'])
    expect(next[1].id).toBe('t1')
  })
})

describe('chèn một thứ vào giữa dải chữ', () => {
  const body = [para('trên\n\ndưới', 'b1')]

  it('cắt ở ranh giới dòng, chữ hai bên thành hai dải', () => {
    const text = 'trên\n\ndưới'
    const out = splitForThing(body, [0, 0], text, text.indexOf('dưới'), table('t9'))
    expect(out.blocks.map((b) => b.type)).toEqual(['paragraph', 'table', 'paragraph'])
    expect(out.thingAt).toBe(1)
  })

  it('con trỏ ở đầu thì thứ chèn vào đứng trước hết', () => {
    const out = splitForThing(body, [0, 0], 'trên', 0, table('t9'))
    expect(out.blocks.map((b) => b.type)).toEqual(['table', 'paragraph'])
    expect(out.thingAt).toBe(0)
  })

  it('con trỏ ở cuối thì đứng sau hết', () => {
    const text = 'trên'
    const out = splitForThing(body, [0, 0], text, text.length, table('t9'))
    expect(out.blocks.map((b) => b.type)).toEqual(['paragraph', 'table'])
  })

  it('không cắt giữa câu — con trỏ giữa dòng thì thứ chèn vào đứng sau cả dòng', () => {
    // Một cái bảng chen vào giữa một câu là làm gãy câu ấy, mà người viết
    // không hề ra lệnh cho việc đó.
    const text = 'một câu dài'
    const out = splitForThing(body, [0, 0], text, 4, table('t9'))
    expect(out.blocks.map((b) => b.type)).toEqual(['paragraph', 'table'])
    expect((out.blocks[0] as unknown as { text: string }).text).toBe('một câu dài')
  })
})
