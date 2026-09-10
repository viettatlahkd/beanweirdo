/**
 * Bàn phím trong danh sách, kiểm trên dữ liệu.
 *
 * Mấy phép này biến đổi một cái cây, và cây sai ở chỗ không nhìn thấy: mục
 * cuối cùng, mục lồng ba tầng, mục có con bị nhập lên. Kiểm bằng dữ liệu bắt
 * được những chỗ ấy; kiểm bằng cách dựng cả màn soạn lên rồi bấm phím thì
 * không, vì không ai nghĩ ra để bấm.
 */
import { runsToText, textToRuns, type ListItem } from 'post-renderer'
import { describe, expect, it } from 'vitest'
import { at, backspace, enter, indent, outdent, paths, subLine } from './listKeys'

const item = (t: string, children?: ListItem[]): ListItem => ({
  runs: textToRuns(t),
  ...(children ? { children } : null),
})

/** Cây thành chữ có thụt lề, để so một phát thấy cả hình dạng. */
function shape(items: ListItem[] | undefined, depth = 0): string {
  return (items ?? [])
    .flatMap((it) => [
      `${'  '.repeat(depth)}${runsToText(it.runs)}`,
      ...(it.children ? shape(it.children, depth + 1).split('\n') : []),
    ])
    .join('\n')
}

const flat = [item('một'), item('hai'), item('ba')]
const nested = [item('cha', [item('con', [item('cháu')])]), item('chú')]

describe('đường đi trong cây', () => {
  it('thứ tự đọc là cha trước con, trên trước dưới', () => {
    expect(paths(nested)).toEqual([[0], [0, 0], [0, 0, 0], [1]])
  })

  it('tới được mục ở mọi tầng', () => {
    expect(runsToText(at(nested, [0, 0, 0])?.runs)).toBe('cháu')
  })
})

describe('Enter', () => {
  it('mục mới ngay dưới, cùng cấp', () => {
    const out = enter(flat, [1], 'hai', 3)
    expect(shape(out && 'items' in out ? out.items : [])).toBe('một\nhai\n\nba')
    expect(out).toMatchObject({ focus: { path: [2], caret: 0 } })
  })

  it('tách mục ở giữa chữ, con ở lại với nửa trên', () => {
    const tree = [item('mộthai', [item('con')])]
    const out = enter(tree, [0], 'mộthai', 3)
    expect(shape(out?.items)).toBe('một\n  con\nhai')
  })

  it('mục rỗng lồng thì lùi ra một tầng, không sinh mục rỗng nữa', () => {
    const tree = [item('cha', [item('')])]
    const out = enter(tree, [0, 0], '', 0)
    expect(shape(out?.items)).toBe('cha\n')
    expect(out?.focus?.path).toEqual([1])
  })

  it('mục rỗng ngoài cùng thì rời danh sách, và không để lại mục rỗng', () => {
    const tree = [item('một'), item('')]
    const out = enter(tree, [1], '', 0)
    expect(out?.leave).toBe(true)
    expect(shape(out?.items)).toBe('một')
  })
})

describe('Backspace ở đầu mục — cái chủ site báo thiếu', () => {
  it('giữa chữ thì trả phím lại cho trình duyệt', () => {
    expect(backspace(flat, [1], 'hai', 2)).toBeNull()
  })

  it('mục có chữ nhập vào mục trên, con trỏ đứng đúng chỗ nối', () => {
    const out = backspace(flat, [1], 'hai', 0)
    expect(shape(out?.items)).toBe('mộthai\nba')
    expect(out?.focus).toEqual({ path: [0], caret: 3 })
  })

  it('mục rỗng thì biến mất, con trỏ về cuối mục trên', () => {
    const tree = [item('một'), item('')]
    const out = backspace(tree, [1], '', 0)
    expect(shape(out?.items)).toBe('một')
    expect(out?.focus).toEqual({ path: [0], caret: 3 })
  })

  it('mục lồng rỗng thì lùi ra trước — mất một tầng nhẹ hơn mất cả mục', () => {
    const tree = [item('cha', [item('')])]
    const out = backspace(tree, [0, 0], '', 0)
    expect(shape(out?.items)).toBe('cha\n')
    expect(out?.focus?.path).toEqual([1])
  })

  it('mục lồng **có chữ** cũng lùi ra trước, không nhập thẳng vào cha', () => {
    // Nhập con vào cha là một câu hỏi không có câu trả lời gọn: cha đang giữ
    // chính nó trong danh sách con của mình. Lùi ra rồi bấm lần nữa mới nhập.
    const tree = [item('cha', [item('con')])]
    const first = backspace(tree, [0, 0], 'con', 0)
    expect(shape(first?.items)).toBe('cha\ncon')

    const second = backspace(first!.items!, [1], 'con', 0)
    expect(shape(second?.items)).toBe('chacon')
  })

  it('con của mục bị nhập đi theo lên, không bị xoá lặng lẽ', () => {
    const tree = [item('một'), item('hai', [item('con')])]
    const out = backspace(tree, [1], 'hai', 0)
    expect(shape(out?.items)).toBe('mộthai\n  con')
  })

  it('mục rỗng duy nhất thì rời danh sách, không để lại khối rỗng', () => {
    const out = backspace([item('')], [0], '', 0)
    expect(out?.leave).toBe(true)
    expect(out?.items).toEqual([])
  })

  it('mục đầu có chữ, không có gì phía trên để nhập vào, thì trả phím lại', () => {
    expect(backspace(flat, [0], 'một', 0)).toBeNull()
  })
})

describe('Tab và Shift+Tab', () => {
  it('Tab thành con của mục liền trước', () => {
    const out = indent(flat, [1])
    expect(shape(out?.items)).toBe('một\n  hai\nba')
    expect(out?.focus).toEqual({ path: [0, 0], caret: 3 })
  })

  it('mục đầu của một cấp không thụt được — không có ai để làm con', () => {
    expect(indent(flat, [0])).toBeNull()
  })

  it('không thụt quá ba tầng, vì design chỉ vẽ ba', () => {
    const deep = [item('a', [item('b', [item('c'), item('d')])])]
    expect(indent(deep, [0, 0, 1])).toBeNull()
  })

  it('Shift+Tab lên một tầng, thành em liền sau của cha', () => {
    const tree = [item('cha', [item('con')]), item('chú')]
    const out = outdent(tree, [0, 0])
    expect(shape(out?.items)).toBe('cha\ncon\nchú')
  })

  it('các em phía dưới đi theo, thành con của nó', () => {
    // Bỏ chúng lại là để chúng nhảy lên đứng dưới một mục khác — tầng bậc đổi
    // mà người viết không hề ra lệnh.
    const tree = [item('cha', [item('con1'), item('con2'), item('con3')])]
    const out = outdent(tree, [0, 0])
    expect(shape(out?.items)).toBe('cha\ncon1\n  con2\n  con3')
  })

  it('ở cấp ngoài cùng thì không lùi được nữa', () => {
    expect(outdent(flat, [1])).toBeNull()
  })
})

describe('Shift+Enter', () => {
  it('thêm một dòng chìm, con trỏ nhảy vào chính dòng ấy', () => {
    const out = subLine(flat, [0])
    expect(out?.items?.[0].sub).toEqual([''])
    expect(out?.focus).toEqual({ path: [0], caret: 0, sub: 0 })
  })
})
