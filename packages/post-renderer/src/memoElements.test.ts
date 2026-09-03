import { describe, expect, it } from 'vitest'
import { flatElements, sectionElements } from './memoElements'
import type { MemoSection } from './types'

const sections: MemoSection[] = [
  {
    h: 'Bean character',
    items: [{ runs: [{ t: 'Ngọt mía' }], cont: ['đo lúc drop'], children: [{ runs: [{ t: 'con' }] }] }],
  },
  { h: 'Pour test', phases: [{ n: '01', label: 'blooming', lines: ['40g'] }] },
  { h: 'Bảng', table: { head: ['Mốc', 'Giây'], rows: [['Nở', '30']] } },
]

describe('một mục cũ, đọc thành element', () => {
  it('giữ nguyên thứ tự trang vẫn vẽ: kết luận, gạch đầu dòng, mốc, bảng', () => {
    const s: MemoSection = {
      h: 'Đủ cả',
      callout: { h: 'Kết luận', lines: ['một', 'hai'] },
      items: [{ runs: [{ t: 'x' }] }],
      phases: [{ n: '01', label: 'y', lines: [] }],
      table: { head: ['A'], rows: [['1']] },
    }
    expect(sectionElements(s).map((e) => e.type)).toEqual(['callout', 'list', 'list', 'table'])
  })

  it('mốc pha thành danh sách đánh số, gạch đầu dòng thì không', () => {
    const [bullets] = sectionElements(sections[0])
    const [ordered] = sectionElements(sections[1])
    expect(bullets).toMatchObject({ type: 'list', ordered: false })
    expect(ordered).toMatchObject({ type: 'list', ordered: true })
  })

  it('giữ chữ nhấn, dòng phụ và mục con', () => {
    const [list] = sectionElements(sections[0]) as unknown as [
      { items: { runs: unknown[]; sub?: string[]; children?: unknown[] }[] },
    ]
    expect(list.items[0].sub).toEqual(['đo lúc drop'])
    expect(list.items[0].children).toHaveLength(1)
  })

  it('bỏ số cũ của mốc pha — nay template đánh số, không ai gõ tay', () => {
    const [ordered] = sectionElements(sections[1]) as unknown as [{ items: Record<string, unknown>[] }]
    expect(ordered.items[0]).not.toHaveProperty('n')
  })
})

describe('cả bài, đọc thành một chuỗi phẳng', () => {
  it('tiêu đề là element ngang hàng, không phải nắp của cái bọc', () => {
    expect(flatElements({ sections }).map((e) => e.type)).toEqual([
      'heading',
      'list',
      'heading',
      'list',
      'heading',
      'table',
    ])
  })

  it('mục không có tên thì không đẻ ra tiêu đề rỗng', () => {
    expect(flatElements({ sections: [{ h: '', items: [{ runs: [{ t: 'x' }] }] }] }).map((e) => e.type)).toEqual(['list'])
  })

  it('bài viết theo lối mới đọc thẳng, không qua chuyển đổi', () => {
    const elements = [{ type: 'paragraph', text: 'đã phẳng' }]
    expect(flatElements({ elements })).toEqual(elements)
  })

  it('bài rỗng là chuỗi rỗng, không nổ', () => {
    expect(flatElements({})).toEqual([])
  })
})
