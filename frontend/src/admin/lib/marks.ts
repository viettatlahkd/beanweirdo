/**
 * `Cmd+B`, `Cmd+I`, `Cmd+U`, `Cmd+K` — đặt định dạng bằng phím.
 *
 * Cho tới lượt này, muốn nhấn một chữ thì phải tự gõ `**` ở hai đầu. Mấy tổ
 * hợp phím này là thứ người viết thử **đầu tiên** ở bất cứ ô chữ nào, và
 * không có chúng thì ô chữ tự khai rằng nó không phải chỗ để viết.
 *
 * Vẫn là markdown chứ không phải một cách lưu thứ hai: phím chỉ chèn hộ mấy
 * dấu mà tay vẫn gõ được. Nhờ vậy không có đường nhập liệu nào thứ hai để
 * trôi ra khỏi đường thứ nhất.
 */

export type Mark = 'bold' | 'italic' | 'reading' | 'link'

/** Chữ, và vùng chọn sau khi đã đặt dấu. */
export type Marked = { text: string; start: number; end: number }

/**
 * Dấu của từng mức, đúng ký hiệu markdown chuẩn.
 *
 * `bold` từng tên là `em` và từng là mức nhấn **duy nhất** của site, nên
 * `Cmd+B` với `Cmd+I` cùng ra `**`. Chủ site tách đôi: *"ctrl B là in đậm
 * thôi không in nghiêng, ctrl I là in nghiêng không in đậm"*. Bấm cả hai thì
 * hai lớp dấu chồng lên nhau thành `***x***`, đúng cách markdown viết cả hai.
 */
const WRAP: Record<'bold' | 'italic' | 'reading', string> = {
  bold: '**',
  italic: '*',
  reading: '_',
}

/** Bao nhiêu ký tự `ch` liền nhau ngay trước `at`. */
function runBefore(text: string, at: number, ch: string): number {
  let n = 0
  while (at - n - 1 >= 0 && text[at - n - 1] === ch) n += 1
  return n
}

/** Bao nhiêu ký tự `ch` liền nhau bắt đầu từ `at`. */
function runAfter(text: string, at: number, ch: string): number {
  let n = 0
  while (at + n < text.length && text[at + n] === ch) n += 1
  return n
}

/**
 * Vùng chọn đã mang sẵn dấu này chưa.
 *
 * Phải **đếm** số dấu sao liền nhau chứ không so từng ký tự, vì dấu sao chồng
 * tầng: một là nghiêng, hai là đậm, ba là cả hai. So từng ký tự thì bấm
 * `Cmd+I` lên một chữ đang đậm sẽ thấy một dấu sao ngay bên ngoài, tưởng là
 * "đã nghiêng rồi", và **gỡ** mất một tầng đậm thay vì thêm nghiêng vào.
 *
 * Gạch dưới thì không chồng tầng — `_` là số đo, `__` là đậm, hai thứ khác
 * hẳn nhau — nên nó chỉ hỏi đúng bằng.
 */
function alreadyWrapped(text: string, start: number, end: number, pad: string): boolean {
  const ch = pad[0]
  const n = pad.length
  const paired = Math.min(runBefore(text, start, ch), runAfter(text, end, ch))
  if (ch !== '*') return paired === n
  return n === 1 ? paired % 2 === 1 : paired >= n
}

/** Bỏ dấu nếu vùng chọn đã có sẵn, còn không thì thêm vào. */
function toggleWrap(text: string, start: number, end: number, pad: string): Marked {
  const n = pad.length
  const inside = text.slice(start, end)

  // Dấu nằm **ngoài** vùng chọn: người viết bôi đen đúng chữ, không kể dấu.
  if (alreadyWrapped(text, start, end, pad)) {
    return {
      text: text.slice(0, start - n) + inside + text.slice(end + n),
      start: start - n,
      end: end - n,
    }
  }

  // Dấu nằm **trong** vùng chọn: người viết bôi đen cả dấu lẫn chữ.
  if (inside.length > 2 * n && inside.startsWith(pad) && inside.endsWith(pad)) {
    const bare = inside.slice(n, -n)
    return { text: text.slice(0, start) + bare + text.slice(end), start, end: start + bare.length }
  }

  return {
    text: text.slice(0, start) + pad + inside + pad + text.slice(end),
    start: start + n,
    end: end + n,
  }
}

/**
 * Một link đang viết dở trông phải ra dở.
 *
 * `[chữ]()` chưa phải là link — chưa có địa chỉ thì `textToRuns` không đọc nó
 * thành link, nên nó hiện đúng như nó là: một cái vỏ đang chờ. Con trỏ nhảy
 * vào giữa hai ngoặc đơn, chỗ duy nhất còn thiếu.
 */
function linkAround(text: string, start: number, end: number): Marked {
  const inside = text.slice(start, end)
  const drawn = `[${inside}]()`
  const caret = start + inside.length + 3
  return { text: text.slice(0, start) + drawn + text.slice(end), start: caret, end: caret }
}

/**
 * Đặt hoặc bỏ một dấu quanh vùng chọn.
 *
 * Không bôi đen gì thì vẫn đặt dấu, và con trỏ nằm giữa chúng — gõ tiếp là
 * chữ nằm trong dấu luôn, không phải quay lại đặt dấu sau khi đã viết xong.
 */
export function applyMark(text: string, start: number, end: number, mark: Mark): Marked {
  if (mark === 'link') return linkAround(text, start, end)
  return toggleWrap(text, start, end, WRAP[mark])
}

/** Tổ hợp phím này là dấu nào, hay không phải dấu nào cả. */
export function markFor(e: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
}): Mark | null {
  if (!e.metaKey && !e.ctrlKey) return null
  // Alt+Cmd là một họ tổ hợp khác — của trình duyệt và của hệ điều hành.
  if (e.altKey) return null
  switch (e.key.toLowerCase()) {
    case 'b':
      return 'bold'
    case 'i':
      return 'italic'
    case 'u':
      return 'reading'
    case 'k':
      return 'link'
    default:
      return null
  }
}
