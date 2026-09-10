/**
 * Dán từ nơi khác vào, và chữ có định dạng đọc ra hình dạng của nó.
 *
 * Hai thứ được kiểm ở đây là hai nửa của cùng một lời hứa: cái ký hiệu người
 * viết gõ ra và cái ký hiệu clipboard mang tới phải là **một**. Nếu chúng lệch
 * nhau thì sẽ có một đường nhập liệu thứ hai, và nó sẽ âm thầm sai.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getElement, pastedToBlocks, pastedToItems, runsToText, textToRuns } from './index'
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

describe('dán cả một trang vào canvas', () => {
  const types = (blocks: ReturnType<typeof pastedToBlocks>) => blocks?.map((b) => b.type)

  it('tiêu đề, đoạn văn, danh sách, bảng — mỗi thứ một khối', () => {
    const blocks = pastedToBlocks(
      [
        '# Mẻ rang #14',
        '',
        'Đợt này thử hạ nhiệt vào lúc nứt lần một.',
        '',
        '- nhiệt vào 198°C',
        '- thời gian 11:20',
        '',
        '| Ngày | Điểm |',
        '|---|---|',
        '| 01 | 8.5 |',
        '| 02 | 8.0 |',
      ].join('\n'),
    )
    expect(types(blocks)).toEqual(['heading', 'paragraph', 'list', 'table'])
  })

  it('cấp tiêu đề đi theo số dấu thăng, quá ba thì về ba', () => {
    const blocks = pastedToBlocks('# một\n## hai\n### ba\n#### bốn')
    expect(blocks?.map((b) => b.level)).toEqual([1, 2, 3, 3])
  })

  it('bảng đọc ra đúng cột và dòng', () => {
    const blocks = pastedToBlocks('| Ngày | Điểm |\n|---|---|\n| 01 | 8.5 |')
    expect(blocks?.[0].table).toEqual({ columns: ['Ngày', 'Điểm'], rows: [{ cells: ['01', '8.5'] }] })
  })

  it('vạch ngăn dòng thiếu thì không phải bảng — chỉ là chữ', () => {
    // Không có vạch ngăn thì `| a | b |` chỉ là một dòng có dấu vạch đứng.
    expect(types(pastedToBlocks('| a | b |\n\nmột đoạn'))).toEqual(['paragraph', 'paragraph'])
  })

  it('trích dẫn nhiều dòng gộp thành một khối', () => {
    const blocks = pastedToBlocks('> câu đầu\n> câu sau\n\nđoạn thường')
    expect(types(blocks)).toEqual(['quote', 'paragraph'])
    expect(blocks?.[0].text).toBe('câu đầu câu sau')
  })

  it('ảnh markdown thành khối ảnh, giữ cả chú thích', () => {
    const blocks = pastedToBlocks('![cận cảnh chủ thể](https://a.com/x.jpg)\n\nsau ảnh')
    expect(blocks?.[0]).toMatchObject({ type: 'image', caption: 'cận cảnh chủ thể', imageUrl: 'https://a.com/x.jpg' })
  })

  it('các dòng liền nhau là một đoạn; dòng trống mới ngắt đoạn', () => {
    const blocks = pastedToBlocks('dòng một\ndòng hai\n\nđoạn sau')
    expect(types(blocks)).toEqual(['paragraph', 'paragraph'])
    expect(blocks?.[0].text).toBe('dòng một dòng hai')
  })

  it('vạch ngang không sinh ra khối rỗng', () => {
    // Design không có element nào cho `---`; vẽ một khối trống thay nó là mời
    // người viết gõ vào một chỗ vốn không có gì.
    expect(types(pastedToBlocks('# một\n\n---\n\n# hai'))).toEqual(['heading', 'heading'])
  })

  it('chữ trong khối mã giữ lại, chỉ hai dòng rào bị bỏ', () => {
    const blocks = pastedToBlocks('# tiêu đề\n\n```\nnpm test\n```')
    expect(types(blocks)).toEqual(['heading', 'paragraph'])
    expect(blocks?.[1].text).toBe('npm test')
  })

  it('danh sách dừng lại ở đoạn văn sát lề tiếp theo', () => {
    const blocks = pastedToBlocks('- một\n- hai\nmột câu mới')
    expect(types(blocks)).toEqual(['list', 'paragraph'])
    expect(blocks?.[1].text).toBe('một câu mới')
  })

  it('định dạng trong dòng vẫn giữ qua đường khối', () => {
    const blocks = pastedToBlocks('# t\n\nxem [đây](https://a.com) nhé')
    expect(blocks?.[1].text).toBe('xem [đây](https://a.com) nhé')
  })

  it('một đoạn văn đơn độc trả null — dán như thường', () => {
    expect(pastedToBlocks('chỉ một câu')).toBeNull()
    expect(pastedToBlocks('hai dòng\nliền nhau')).toBeNull()
    expect(pastedToBlocks('  ')).toBeNull()
  })

  it('một danh sách đơn độc thì vẫn là một khối danh sách', () => {
    expect(types(pastedToBlocks('- một\n- hai'))).toEqual(['list'])
  })
})

describe('ngắt dòng trong một đoạn', () => {
  it('trang vẽ ra ngắt dòng, không nuốt mất', () => {
    // Trước lượt này `Enter` chèn một ký tự xuống dòng mà trang không vẽ:
    // chữ trông một kiểu lúc soạn và một kiểu khi đăng.
    const paragraph = getElement('paragraph')!
    const { container } = render(
      <paragraph.View attributes={{ type: 'paragraph', text: 'dòng một\ndòng hai' }} palette={palette} index={0} />,
    )
    expect(getComputedStyle(container.firstElementChild as Element).whiteSpace).toBe('pre-wrap')
  })
})
