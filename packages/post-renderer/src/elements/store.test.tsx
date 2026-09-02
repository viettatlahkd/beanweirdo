import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { allElements, findElements, getElement, runsToText, textToRuns, toElements, type ElementDefinition } from './index'
import { paletteFrom } from '../palette'

const palette = paletteFrom('#C25C7C')

describe('kho', () => {
  it('có đủ chín element cũ, cộng danh sách', () => {
    expect(allElements().map((e) => e.name).sort()).toEqual([
      'callout',
      'chart',
      'heading',
      'image',
      'list',
      'meta',
      'metrics',
      'paragraph',
      'quote',
      'table',
    ])
  })

  it('mỗi element khai đủ thứ cần để tồn tại', () => {
    for (const e of allElements()) {
      expect(e.title, e.name).toBeTruthy()
      expect(e.description, e.name).toBeTruthy()
      expect(e.keywords.length, e.name).toBeGreaterThan(0)
      expect(Object.keys(e.attributes).length, e.name).toBeGreaterThan(0)
      expect(['text', 'data', 'media']).toContain(e.category)
    }
  })

  it('khối rỗng của một element mang đúng mã của chính nó', () => {
    for (const e of allElements()) {
      expect((e.blank() as { type: string }).type, e.name).toBe(e.name)
    }
  })

  it('tra được bằng tiếng Việt, không cần biết tên tiếng Anh', () => {
    expect(findElements('gạch đầu dòng').map((e) => e.name)).toEqual(['list'])
    expect(findElements('thông số').map((e) => e.name)).toEqual(['metrics'])
    expect(findElements('bảng').map((e) => e.name)).toEqual(['table'])
  })

  it('tra một cái không có thì trả về rỗng, không nổ', () => {
    expect(findElements('không tồn tại')).toEqual([])
    expect(getElement('không tồn tại')).toBeUndefined()
  })

  it('tên trùng chuẩn WordPress ở chỗ chuẩn có', () => {
    // Sáu cái này là core block của WordPress; giữ nguyên tên để người sau
    // nhìn là hiểu, không phải học từ điển riêng của dự án.
    for (const name of ['paragraph', 'heading', 'list', 'quote', 'table', 'image']) {
      expect(getElement(name), name).toBeDefined()
    }
  })
})

const draw = (e: { View: ElementDefinition<never>['View'] }, attributes: unknown) =>
  render(<e.View attributes={attributes as never} palette={palette} index={0} testId="el" />)

describe('danh sách', () => {
  const items = [
    { runs: [{ t: 'một' }], sub: ['dòng phụ'] },
    { runs: [{ t: 'hai' }], children: [{ runs: [{ t: 'con' }] }] },
  ]

  it('vẽ mục, dòng phụ và mục con', () => {
    draw(getElement('list')!, { type: 'list', items })
    expect(screen.getByText('một')).toBeInTheDocument()
    expect(screen.getByText('dòng phụ')).toBeInTheDocument()
    expect(screen.getByText('con')).toBeInTheDocument()
  })

  it('đánh số thì số là của template, không ai phải gõ', () => {
    draw(getElement('list')!, { type: 'list', ordered: true, items })
    // Đệm hai chữ số, đúng cách site đánh số ở mọi nơi khác.
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
  })

  it('không đánh số thì không có số nào', () => {
    draw(getElement('list')!, { type: 'list', items })
    expect(screen.queryByText('01')).not.toBeInTheDocument()
  })

  it('số mang màu bài, không mượn màu module khác', () => {
    const { container } = draw(getElement('list')!, { type: 'list', ordered: true, items })
    // Chỉ soi chính các con số; dòng phụ mang màu trung tính và không liên quan.
    const marks = Array.from(container.querySelectorAll<HTMLElement>('div'))
      .filter((d) => /^\d\d$/.test(d.textContent ?? ''))
      .map((d) => d.style.color.match(/\d+/g)!.map(Number))
    expect(marks).toHaveLength(2)
    for (const [r, g, b] of marks) expect(r > g && b > g, `${r},${g},${b}`).toBe(true)
  })
})

describe('đọc thứ đang lưu', () => {
  it('nhận element đã đúng tên', () => {
    expect(toElements([{ type: 'paragraph', text: 'x' }])).toEqual([{ type: 'paragraph', text: 'x' }])
  })

  it('dịch được khoá ngắn của report đời đầu', () => {
    expect(toElements([{ t: 'h', v: 'Tiêu đề' }])).toEqual([{ type: 'heading', text: 'Tiêu đề' }])
    expect(toElements([{ m: [{ k: 'Charge', v: '196°C' }] }])).toEqual([
      { type: 'metrics', items: [{ label: 'Charge', value: '196°C' }] },
    ])
    expect(toElements([{ t: 'table', th: ['Mốc'], tr: [['Sấy']] }])).toEqual([
      { type: 'table', table: { columns: ['Mốc'], rows: [{ cells: ['Sấy'] }] } },
    ])
  })

  it('bỏ thứ không đọc được thay vì vẽ ra một hàng trống', () => {
    expect(toElements([{ vô: 'nghĩa' }, { type: 'paragraph', text: 'giữ' }])).toEqual([
      { type: 'paragraph', text: 'giữ' },
    ])
  })

  it('bỏ luôn element mang tên kho không có', () => {
    expect(toElements([{ type: 'chưa-tồn-tại', text: 'x' }])).toEqual([])
  })

  it('body không phải mảng thì là rỗng, không nổ', () => {
    expect(toElements(null)).toEqual([])
    expect(toElements({ sections: [] })).toEqual([])
  })
})

describe('chữ nhấn giữa câu đi qua ô chữ thường mà không mất', () => {
  const runs = [{ t: 'Ngọt mía, ' }, { t: 'hậu vị ngắn', em: true }, { t: ' ở cuối' }]

  it('hiện ra dưới dạng gõ được', () => {
    expect(runsToText(runs)).toBe('Ngọt mía, *hậu vị ngắn* ở cuối')
  })

  it('và quay về nguyên vẹn', () => {
    expect(textToRuns(runsToText(runs))).toEqual(runs)
  })

  it('dấu sao chưa đóng thì là dấu sao, không nuốt cả dòng', () => {
    expect(textToRuns('một * hai')).toEqual([{ t: 'một * hai' }])
  })

  it('dòng rỗng vẫn là một run rỗng, không phải mảng rỗng', () => {
    expect(textToRuns('')).toEqual([{ t: '' }])
  })

  it('vẽ chữ nhấn bằng màu bài', () => {
    const { container } = draw(getElement('list')!, { type: 'list', items: [{ runs }] })
    const em = container.querySelector('em')!
    const [r, g, b] = em.style.color.match(/\d+/g)!.map(Number)
    expect(r > g && b > g).toBe(true)
  })
})

describe('số đo có gạch chân mảnh', () => {
  it('đi qua ô chữ thường mà không mất, và không lẫn với chữ nhấn', () => {
    const runs = [{ t: 'Đo ' }, { t: 'Nhiệt 91°C', u: true }, { t: ' lúc drop' }]
    expect(runsToText(runs)).toBe('Đo _Nhiệt 91°C_ lúc drop')
    expect(textToRuns(runsToText(runs))).toEqual(runs)
  })

  it('vẽ gạch chân mà không đổi màu chữ', () => {
    const { container } = draw(getElement('list')!, {
      type: 'list',
      items: [{ runs: [{ t: '91°C', u: true }] }],
    })
    const span = Array.from(container.querySelectorAll<HTMLElement>('span')).find(
      (x) => x.style.borderBottomWidth === '1px',
    )
    expect(span?.textContent).toBe('91°C')
    expect(span?.style.color).toBe('')
  })
})
