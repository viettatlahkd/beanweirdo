/**
 * Đi một vòng khối → chữ → khối, và **đo xem mất gì**.
 *
 * Chủ site muốn màn soạn là một dải chữ liền mạch, khối chỉ dựng lại lúc
 * render. Câu hỏi duy nhất đáng lo là: làm thế thì mất nội dung nào. Bài kiểm
 * này trả lời bằng số, không bằng phỏng đoán.
 */
import { describe, expect, it } from 'vitest'
import { bodyToMarkdown, markdownToBlocks, runsToText, textToRuns } from './index'

const roundTrip = (blocks: unknown[]) => {
  const { text, lost } = bodyToMarkdown(blocks as never)
  return { text, lost, back: markdownToBlocks(text) }
}

describe('những thứ đi trọn một vòng', () => {
  it('tiêu đề giữ cả chữ lẫn cấp', () => {
    const { back } = roundTrip([{ type: 'heading', level: 3, text: 'Overall feedback' }])
    expect(back[0]).toMatchObject({ type: 'heading', level: 3, text: 'Overall feedback' })
  })

  it('đoạn văn giữ cả định dạng trong dòng', () => {
    const { back } = roundTrip([{ type: 'paragraph', text: 'có **đậm** và [link](https://a.com)' }])
    expect(back[0]).toMatchObject({ type: 'paragraph', text: 'có **đậm** và [link](https://a.com)' })
  })

  it('danh sách giữ mục, tầng bậc và kiểu đánh số', () => {
    const items = [{ runs: textToRuns('cha'), children: [{ runs: textToRuns('con') }] }, { runs: textToRuns('hai') }]
    const { back } = roundTrip([{ type: 'list', ordered: true, items }])
    const list = back[0] as unknown as { type: string; ordered?: boolean; items: { runs: never[]; children?: { runs: never[] }[] }[] }
    expect(list.type).toBe('list')
    expect(list.ordered).toBe(true)
    expect(runsToText(list.items[0].runs)).toBe('cha')
    expect(runsToText(list.items[0].children?.[0].runs)).toBe('con')
    expect(runsToText(list.items[1].runs)).toBe('hai')
  })

  it('trích dẫn giữ chữ', () => {
    const { back } = roundTrip([{ type: 'quote', text: 'Vị mỏng ở cuối.' }])
    expect(back[0]).toMatchObject({ type: 'quote', text: 'Vị mỏng ở cuối.' })
  })

  it('bảng giữ cột và dòng', () => {
    const table = { columns: ['Ngày', 'Điểm'], rows: [{ cells: ['01', '8.5'] }] }
    const { back } = roundTrip([{ type: 'table', table }])
    expect(back[0]).toMatchObject({ type: 'table', table })
  })

  it('ảnh giữ địa chỉ và chú thích', () => {
    const { back } = roundTrip([{ type: 'image', caption: 'cận cảnh', imageUrl: 'https://a.com/x.jpg' }])
    expect(back[0]).toMatchObject({ type: 'image', caption: 'cận cảnh', imageUrl: 'https://a.com/x.jpg' })
  })

  it('cả một bài nhiều khối giữ đúng thứ tự', () => {
    const { back } = roundTrip([
      { type: 'heading', level: 2, text: 'Một' },
      { type: 'paragraph', text: 'Hai' },
      { type: 'list', items: [{ runs: textToRuns('ba') }] },
      { type: 'table', table: { columns: ['a'], rows: [{ cells: ['b'] }] } },
    ])
    expect(back.map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'table'])
  })
})

describe('những thứ markdown không đựng nổi — báo tên ra, không nuốt lặng lẽ', () => {
  it('số liệu và biểu đồ không có ký hiệu markdown nào', () => {
    const { lost } = bodyToMarkdown([
      { type: 'metrics', items: [{ label: 'Nhiệt', value: '198°C' }] },
      { type: 'chart', points: [{ label: 'a', heightPct: 40 }] },
    ] as never)
    expect(lost).toEqual(['metrics', 'chart'])
  })

  it('dòng nhãn và khối nhấn cũng vậy — viết ra là mất kiểu', () => {
    const { lost } = bodyToMarkdown([
      { type: 'meta', text: 'ROASTING · LOG' },
      { type: 'callout', text: 'lưu ý', heading: 'Chốt' },
    ] as never)
    expect(lost).toEqual(['meta', 'callout'])
  })

  it('bề rộng cột của bảng không sống sót', () => {
    const table = { columns: ['a', 'b'], rows: [], widths: [70, 30] }
    const { back } = roundTrip([{ type: 'table', table }])
    expect((back[0] as unknown as { table: { widths?: number[] } }).table.widths).toBeUndefined()
  })

  it('dòng chìm của một mục biến thành mục con', () => {
    const { back } = roundTrip([{ type: 'list', items: [{ runs: textToRuns('mục'), sub: ['chìm'] }] }])
    const list = back[0] as unknown as { items: { sub?: string[]; children?: { runs: never[] }[] }[] }
    expect(list.items[0].sub).toBeUndefined()
    expect(runsToText(list.items[0].children?.[0].runs)).toBe('chìm')
  })

  it('ghi chú cạnh bài không nằm trong dải chữ', () => {
    const { text, lost } = bodyToMarkdown([
      { type: 'paragraph', text: 'chữ' },
      { type: 'notes', explorations: [{ id: 'n1', text: 'ghi' }], fieldNotes: [] },
    ] as never)
    expect(text).toBe('chữ')
    // Không nằm trong dòng chảy nên cũng không phải thứ bị mất — nó đi đường
    // riêng, chỗ gọi phải giữ lại.
    expect(lost).toEqual([])
  })
})

describe('nguồn trích không được rơi mất', () => {
  it('đi một vòng vẫn còn tên người được trích', () => {
    const { back } = roundTrip([{ type: 'quote', text: 'Vị mỏng ở cuối.', attribution: 'sổ rang' }])
    expect(back[0]).toMatchObject({ type: 'quote', text: 'Vị mỏng ở cuối.', attribution: 'sổ rang' })
  })

  it('không có nguồn thì không đẻ ra dòng gạch ngang thừa', () => {
    const { text, back } = roundTrip([{ type: 'quote', text: 'Không nguồn.', attribution: '' }])
    expect(text).toBe('> Không nguồn.')
    expect(back[0]).toMatchObject({ type: 'quote', attribution: '' })
  })
})
