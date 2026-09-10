/**
 * Dán từ nơi khác vào, và chữ có định dạng đọc ra hình dạng của nó.
 *
 * Hai thứ được kiểm ở đây là hai nửa của cùng một lời hứa: cái ký hiệu người
 * viết gõ ra và cái ký hiệu clipboard mang tới phải là **một**. Nếu chúng lệch
 * nhau thì sẽ có một đường nhập liệu thứ hai, và nó sẽ âm thầm sai.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getElement, pastedToItems, runsToText, textToRuns } from './index'
import { paletteFrom } from '../palette'

const palette = paletteFrom('#C25C7C')

describe('định dạng trong một dòng', () => {
  it('đọc ra link viết kiểu markdown', () => {
    expect(textToRuns('xem [bài này](https://a.com/x) nhé')).toEqual([
      { t: 'xem ' },
      { t: 'bài này', href: 'https://a.com/x' },
      { t: ' nhé' },
    ])
  })

  it('một địa chỉ trần cũng là link, và không nuốt dấu chấm câu', () => {
    expect(textToRuns('nguồn https://a.com/x.')).toEqual([
      { t: 'nguồn ' },
      { t: 'https://a.com/x', href: 'https://a.com/x' },
      { t: '.' },
    ])
  })

  it('địa chỉ trần ghi lại thành chính nó, không phồng lên thành [x](x)', () => {
    const text = 'nguồn https://a.com/x.'
    expect(runsToText(textToRuns(text))).toBe(text)
  })

  it('đi một vòng không mất gì — nhấn, số đo, link', () => {
    const text = 'một *ý* với _92°C_ và [nguồn](https://a.com)'
    expect(runsToText(textToRuns(text))).toBe(text)
  })

  it('`**đậm**` của nơi khác về chung một nhấn', () => {
    expect(textToRuns('có **đậm** đây')).toEqual([{ t: 'có ' }, { t: 'đậm', em: true }, { t: ' đây' }])
  })

  it('gạch dưới giữa chữ không phải định dạng', () => {
    // Một tên file hay một mã định danh đã nằm sẵn trong bài cũ; đọc nó thành
    // gạch chân là đổi hình dạng của những bài chưa ai đụng tới.
    expect(textToRuns('file_ten_bien.ts')).toEqual([{ t: 'file_ten_bien.ts' }])
  })

  it('dấu sao mở mà không đóng thì vẫn là dấu sao', () => {
    expect(textToRuns('2 * 3 = 6')).toEqual([{ t: '2 * 3 = 6' }])
  })
})

describe('vẽ ra link', () => {
  it('dòng danh sách vẽ thẻ a với đúng địa chỉ', () => {
    const list = getElement('list')!
    render(
      <list.View
        attributes={{ type: 'list', items: [{ runs: textToRuns('xem [đây](https://a.com/x)') }] }}
        palette={palette}
        index={0}
      />,
    )
    const link = screen.getByRole('link', { name: 'đây' })
    expect(link).toHaveAttribute('href', 'https://a.com/x')
    // Bài mở ra bên cạnh, người đọc không mất chỗ đang đứng trong bài.
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('đoạn văn cũng vẽ link, không chỉ danh sách', () => {
    const paragraph = getElement('paragraph')!
    render(<paragraph.View attributes={{ type: 'paragraph', text: 'nguồn https://b.com' }} palette={palette} index={0} />)
    expect(screen.getByRole('link', { name: 'https://b.com' })).toHaveAttribute('href', 'https://b.com')
  })
})

describe('dán vào', () => {
  it('sáu gạch đầu dòng thành sáu mục, không phải một dòng', () => {
    const pasted = pastedToItems(
      ['- Chưa chốt test cases.', '- Chưa có deadline phản hồi.', '- Chưa có exit criteria.'].join('\n'),
    )
    expect(pasted?.items).toHaveLength(3)
    expect(pasted?.items.map((i) => runsToText(i.runs))).toEqual([
      'Chưa chốt test cases.',
      'Chưa có deadline phản hồi.',
      'Chưa có exit criteria.',
    ])
    expect(pasted?.ordered).toBe(false)
  })

  it('danh sách đánh số về đúng dạng đánh số', () => {
    expect(pastedToItems('1. một\n2. hai')?.ordered).toBe(true)
    expect(pastedToItems('1) một\n2) hai')?.ordered).toBe(true)
  })

  it('thụt lề thành mục con, dù nguồn thụt bằng gì', () => {
    const spaces = pastedToItems('- cha\n  - con\n    - cháu')
    const tabs = pastedToItems('- cha\n\t- con\n\t\t- cháu')
    for (const pasted of [spaces, tabs]) {
      expect(pasted?.items).toHaveLength(1)
      expect(runsToText(pasted?.items[0].children?.[0].runs)).toBe('con')
      expect(runsToText(pasted?.items[0].children?.[0].children?.[0].runs)).toBe('cháu')
    }
  })

  it('thụt sâu hơn ba tầng thì dồn về tầng ba — design chỉ vẽ ba', () => {
    // Tầng thứ tư đứng ngang hàng tầng ba chứ không lồng thêm: lồng thêm là
    // dựng một tầng không có cách nào vẽ ra, và chữ sẽ biến mất trên trang.
    const pasted = pastedToItems('- a\n  - b\n    - c\n      - d')
    const third = pasted?.items[0].children?.[0].children
    expect(third?.map((i) => runsToText(i.runs))).toEqual(['c', 'd'])
  })

  it('•, – và các dấu nơi khác dùng cũng là gạch đầu dòng', () => {
    expect(pastedToItems('• một\n– hai\n▪ ba')?.items).toHaveLength(3)
  })

  it('định dạng trong dòng dán vào vẫn giữ', () => {
    const pasted = pastedToItems('- xem **đây**: https://a.com\n- và [kia](https://b.com)')
    expect(pasted?.items[0].runs).toContainEqual({ t: 'đây', em: true })
    expect(pasted?.items[1].runs).toContainEqual({ t: 'kia', href: 'https://b.com' })
  })

  it('nhiều dòng không dấu vẫn là nhiều mục', () => {
    // Nguồn nào cũng có lúc chỉ đưa chữ trần lên clipboard; cái người viết
    // nhìn thấy lúc copy vẫn là mấy dòng rời.
    expect(pastedToItems('một\nhai\nba')?.items).toHaveLength(3)
  })

  it('dòng trống giữa các mục không sinh ra mục rỗng', () => {
    expect(pastedToItems('- một\n\n- hai')?.items).toHaveLength(2)
  })

  it('một dòng chữ trần thì trả về null — dán như thường', () => {
    expect(pastedToItems('chỉ một câu thôi')).toBeNull()
    expect(pastedToItems('   ')).toBeNull()
  })

  it('một dòng có dấu đầu dòng thì vẫn là một mục', () => {
    expect(pastedToItems('- một mục')?.items).toHaveLength(1)
  })
})
