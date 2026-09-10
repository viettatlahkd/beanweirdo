/**
 * `Cmd+B`, `Cmd+U`, `Cmd+K` — đặt định dạng bằng phím.
 *
 * Cho tới lượt này, muốn nhấn một chữ thì phải tự gõ `**` ở hai đầu. Ba tổ
 * hợp phím này là thứ người viết thử **đầu tiên** ở bất cứ ô chữ nào, và
 * không có chúng thì ô chữ tự khai rằng nó không phải chỗ để viết.
 *
 * Vẫn là markdown chứ không phải một cách lưu thứ hai: phím chỉ chèn hộ mấy
 * dấu mà tay vẫn gõ được. Nhờ vậy không có đường nhập liệu nào thứ hai để
 * trôi ra khỏi đường thứ nhất.
 */

export type Mark = 'em' | 'reading' | 'link'

/** Chữ, và vùng chọn sau khi đã đặt dấu. */
export type Marked = { text: string; start: number; end: number }

const WRAP: Record<'em' | 'reading', string> = {
  // `**` chứ không phải `*`: đây là dấu người viết gặp ở mọi nơi khác. Cả hai
  // đều đọc ra cùng một mức nhấn.
  em: '**',
  reading: '_',
}

/** Bỏ dấu nếu vùng chọn đã có sẵn, còn không thì thêm vào. */
function toggleWrap(text: string, start: number, end: number, pad: string): Marked {
  const n = pad.length
  const inside = text.slice(start, end)

  // Dấu nằm **ngoài** vùng chọn: người viết bôi đen đúng chữ, không kể dấu.
  if (text.slice(start - n, start) === pad && text.slice(end, end + n) === pad) {
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
      return 'em'
    case 'u':
      return 'reading'
    case 'k':
      return 'link'
    default:
      return null
  }
}
