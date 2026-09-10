/**
 * Hoàn tác, kiểm trên dữ liệu.
 *
 * Chỗ dễ sai của một cái lịch sử không nằm ở lần lùi đầu tiên mà ở những chỗ
 * ít ai gõ tới: lùi rồi sửa tiếp, lùi tới đáy, gộp nhầm hai ý thành một. Kiểm
 * chúng ở đây rẻ hơn nhiều so với dựng cả màn soạn lên.
 */
import { describe, expect, it } from 'vitest'
import { emptyHistory, historyKey, inverseOf, record, redo, undo } from './editHistory'

/** Một bài rút gọn, và cách nó nhận một bản vá. */
type Post = Record<string, unknown>
const apply = (post: Post, patch: Post): Post => ({ ...post, ...patch })

/** Gõ một lần: ghi bước lùi, rồi áp bản vá. */
function type(post: Post, history = emptyHistory, patch: Post, now = 0) {
  return {
    post: apply(post, patch),
    history: record(history, inverseOf(post, patch), now),
  }
}

describe('phần đảo ngược', () => {
  it('chỉ giữ giá trị cũ của đúng khoá bị đổi', () => {
    expect(inverseOf({ en: 'cũ', lead: 'giữ' }, { en: 'mới' })).toEqual({ en: 'cũ' })
  })

  it('khoá chưa từng có thì phần đảo ngược là "chưa có"', () => {
    expect(inverseOf({}, { lead: 'mới' })).toEqual({ lead: undefined })
  })
})

describe('lùi và tới', () => {
  it('lùi một bước trả về giá trị trước đó', () => {
    const a = type({ en: 'một' }, emptyHistory, { en: 'hai' })
    const back = undo(a.history, a.post)!
    expect(apply(a.post, back.patch)).toEqual({ en: 'một' })
  })

  it('lùi nhiều bậc, không phải một', () => {
    // Đây là điều bản cũ không làm được: `UNDO_MS` chỉ rút lại được một việc,
    // trong hai giây.
    let s = type({ en: 'một' }, emptyHistory, { en: 'hai' }, 0)
    s = type(s.post, s.history, { en: 'ba' }, 5000)
    s = type(s.post, s.history, { en: 'bốn' }, 10000)

    let post = s.post
    let h = s.history
    for (const want of ['ba', 'hai', 'một']) {
      const back = undo(h, post)!
      post = apply(post, back.patch)
      h = back.history
      expect(post.en).toBe(want)
    }
    expect(undo(h, post)).toBeNull()
  })

  it('tới lại đúng chỗ vừa lùi khỏi', () => {
    const a = type({ en: 'một' }, emptyHistory, { en: 'hai' })
    const back = undo(a.history, a.post)!
    const post = apply(a.post, back.patch)
    const fwd = redo(back.history, post)!
    expect(apply(post, fwd.patch)).toEqual({ en: 'hai' })
  })

  it('lùi hết rồi tới hết thì về đúng chỗ cũ', () => {
    let s = type({ en: 'một', lead: 'a' }, emptyHistory, { en: 'hai' }, 0)
    s = type(s.post, s.history, { lead: 'b' }, 5000)
    const end = s.post

    let post = s.post
    let h = s.history
    while (undo(h, post)) {
      const back = undo(h, post)!
      post = apply(post, back.patch)
      h = back.history
    }
    expect(post).toEqual({ en: 'một', lead: 'a' })

    while (redo(h, post)) {
      const fwd = redo(h, post)!
      post = apply(post, fwd.patch)
      h = fwd.history
    }
    expect(post).toEqual(end)
  })

  it('lùi rồi sửa tiếp thì đường tới bị bỏ', () => {
    // Đã sang nhánh khác thì nhánh cũ không nối vào đâu được nữa; giữ nó lại
    // là hứa một thứ `redo` không thực hiện được.
    const a = type({ en: 'một' }, emptyHistory, { en: 'hai' })
    const back = undo(a.history, a.post)!
    const post = apply(a.post, back.patch)
    const next = type(post, back.history, { en: 'khác' }, 9999)
    expect(redo(next.history, next.post)).toBeNull()
  })

  it('không có gì để lùi thì trả null, không nổ', () => {
    expect(undo(emptyHistory, { en: 'một' })).toBeNull()
    expect(redo(emptyHistory, { en: 'một' })).toBeNull()
  })
})

describe('gộp bước', () => {
  it('hai lần sửa cùng một ô sát nhau là một bước', () => {
    let s = type({ en: 'một' }, emptyHistory, { en: 'hai' }, 1000)
    s = type(s.post, s.history, { en: 'ba' }, 1200)
    const back = undo(s.history, s.post)!
    // Về thẳng 'một', không dừng ở 'hai'.
    expect(apply(s.post, back.patch).en).toBe('một')
    expect(undo(back.history, apply(s.post, back.patch))).toBeNull()
  })

  it('cách nhau đủ lâu thì là hai bước', () => {
    let s = type({ en: 'một' }, emptyHistory, { en: 'hai' }, 1000)
    s = type(s.post, s.history, { en: 'ba' }, 5000)
    const back = undo(s.history, s.post)!
    expect(apply(s.post, back.patch).en).toBe('hai')
  })

  it('hai ô khác nhau thì không gộp, dù sát nhau', () => {
    let s = type({ en: 'một', lead: 'a' }, emptyHistory, { en: 'hai' }, 1000)
    s = type(s.post, s.history, { lead: 'b' }, 1100)
    const back = undo(s.history, s.post)!
    expect(apply(s.post, back.patch)).toEqual({ en: 'hai', lead: 'a' })
  })

  it('bước ngay sau một lần hoàn tác không bị gộp vào bước vừa lôi ra', () => {
    const a = type({ en: 'một' }, emptyHistory, { en: 'hai' }, 1000)
    const back = undo(a.history, a.post)!
    const post = apply(a.post, back.patch)
    const next = type(post, back.history, { en: 'ba' }, 1100)
    const again = undo(next.history, next.post)!
    expect(apply(next.post, again.patch).en).toBe('một')
  })
})

describe('cấu trúc, không chỉ chữ', () => {
  it('lùi lại được cả một khối đã xoá, kèm ghi chú neo vào nó', () => {
    // Luật "không mất chữ" nói về cấu trúc chứ không riêng chữ: xoá nhầm một
    // khối phải lấy lại được cả khối lẫn ghi chú cạnh nó.
    const body = [{ type: 'paragraph', id: 'b1', text: 'giữ' }, { type: 'notes', anchor: 'b1' }]
    const s = type({ body }, emptyHistory, { body: [] })
    const back = undo(s.history, s.post)!
    expect(apply(s.post, back.patch).body).toEqual(body)
  })
})

describe('phím', () => {
  const key = (over: Partial<Parameters<typeof historyKey>[0]> = {}) => ({
    key: 'z',
    metaKey: true,
    ctrlKey: false,
    shiftKey: false,
    ...over,
  })
  const field = (dirty: boolean) => ({ getAttribute: () => (dirty ? 'true' : null) }) as unknown as Element

  it('Cmd+Z là lùi, Cmd+Shift+Z là tới', () => {
    expect(historyKey(key(), null)).toBe('undo')
    expect(historyKey(key({ shiftKey: true }), null)).toBe('redo')
  })

  it('Ctrl+Y trên Windows cũng là tới', () => {
    expect(historyKey(key({ key: 'y', metaKey: false, ctrlKey: true }), null)).toBe('redo')
  })

  it('ô đang có chữ chưa ghi thì trả phím lại cho trình duyệt', () => {
    // Hoàn tác một ký tự vừa gõ nhầm là thao tác thường hơn nhiều; cướp nó đi
    // là làm hỏng cái quen thuộc để phục vụ cái hiếm hơn.
    expect(historyKey(key(), field(true))).toBeNull()
    expect(historyKey(key(), field(false))).toBe('undo')
  })

  it('phím thường thì không phải lịch sử', () => {
    expect(historyKey(key({ key: 'a' }), null)).toBeNull()
    expect(historyKey(key({ metaKey: false }), null)).toBeNull()
  })
})
