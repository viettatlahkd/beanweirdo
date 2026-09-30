/**
 * Dải chữ liền mạch, kiểm trên dữ liệu.
 *
 * Điều phải giữ bằng mọi giá: **không mất nội dung** khi gom vào một ô rồi
 * dựng lại, và **không mất `id`** vì ghi chú cạnh bài neo vào đó.
 */
import type { ReportBlock } from 'post-renderer'
import { textToRuns } from 'post-renderer'
import { describe, expect, it } from 'vitest'
import { insertThing, moveIntoRun, toRuns, writeRun } from './flow'
import { linesThrough, splitAtLine } from './mdBlocks'

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

  it('bài rỗng vẫn có một dải rỗng để gõ vào', () => {
    // Không có nó thì bài mới chỉ còn cái nút `+`, và phải chọn loại khối
    // trước khi được viết chữ đầu tiên.
    expect(toRuns([])).toEqual([{ kind: 'text', at: [0, -1], text: '' }])
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
  /*
   * Vị trí chèn đo bằng **số dòng có chữ phía trên**, không phải khối thứ
   * mấy trong kho — xem `mdBlocks.ts`. Nên mấy bài dưới đây đếm theo cái
   * người viết nhìn thấy.
   */
  const body = [para('trên\n\ndưới', 'b1')]

  it('chèn sau khối con trỏ đang đứng, chữ hai bên thành hai dải', () => {
    const out = insertThing(body, [0, 0], 'trên\n\ndưới', 1, table('t9'))
    expect(out.map((b) => b.type)).toEqual(['paragraph', 'table', 'paragraph'])
    expect((out[0] as unknown as { text: string }).text).toBe('trên')
  })

  it('con trỏ ở khối cuối thì thứ chèn vào đứng sau hết', () => {
    const out = insertThing(body, [0, 0], 'trên\n\ndưới', 2, table('t9'))
    expect(out.map((b) => b.type)).toEqual(['paragraph', 'paragraph', 'table'])
  })

  it('dải rỗng vẫn chèn được, không sinh đoạn văn trống', () => {
    const out = insertThing([], [0, -1], '', 0, table('t9'))
    expect(out.map((b) => b.type)).toEqual(['table'])
  })

  it('thứ chèn vào giữ id mới của nó, không mượn id của đoạn văn', () => {
    // Ghi chú cạnh bài neo vào `id`. Cấp cho cái bảng cái id của đoạn văn thì
    // mọi ghi chú của đoạn ấy lặng lẽ nhảy sang bảng.
    const out = insertThing(body, [0, 0], 'trên\n\ndưới', 1, table('t9'))
    expect(out[1].id).toBe('t9')
    expect(out[0].id).toBe('b1')
  })
})

describe('cắt theo dòng', () => {
  it('chèn được vào giữa một đoạn gộp từ nhiều dòng', () => {
    // Long-form: hai đoạn liền nhau Lexical vẽ thành một khối có ngắt dòng.
    const [before, after] = splitAtLine('một\nhai\nba', 2)
    expect(before).toBe('một\nhai')
    expect(after).toBe('ba')
  })

  it('đếm dòng theo khối và dòng trong khối trên mặt soạn', () => {
    // `## a` là khối 0; `- x\n- y` là khối 1 với hai dòng.
    const text = '## a\n\n- x\n- y\n\nđoạn'
    expect(linesThrough(text, 0, 0)).toBe(1)
    expect(linesThrough(text, 1, 0)).toBe(2)
    expect(linesThrough(text, 1, 1)).toBe(3)
    expect(linesThrough(text, 2, 0)).toBe(4)
  })

  it('không cắt vào giữa khối mã', () => {
    const [before] = splitAtLine('```\nx\ny\n```\nsau', 2)
    expect(before).toBe('```\nx\ny\n```')
  })
})

describe('moveIntoRun', () => {
  const body = [table('t1'), para('một\n\nhai', 'b1'), table('t2')]

  it('thả cái bảng đầu bài vào giữa hai đoạn', () => {
    const out = moveIntoRun(body, 0, [1, 1], 'một\n\nhai', 1, insertThing)
    expect(out.map((b) => b.id ?? b.type)).toEqual(['b1', 't1', expect.anything(), 't2'])
  })

  it('thả cái bảng cuối bài lên trên dòng đầu', () => {
    const out = moveIntoRun(body, 2, [1, 1], 'một\n\nhai', 0, insertThing)
    expect(out[1].id).toBe('t2')
    expect(out.filter((b) => b.id === 't2')).toHaveLength(1)
    expect(out[0].id).toBe('t1')
  })
})
