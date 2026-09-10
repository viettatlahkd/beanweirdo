/**
 * Hoàn tác trong màn soạn.
 *
 * Trước lượt này màn soạn **không có lịch sử nào**. Thứ mang tên `UNDO_MS`
 * chỉ là hai giây rút lại cho một hộp thoại; xoá nhầm một khối đã gõ xong là
 * mất thật. Đó là lỗ nguy hiểm nhất trong bảng đối chiếu ở
 * `docs/spine/TRINH-SOAN.md`, vì nó vi phạm thẳng luật "không mất chữ".
 *
 * Lịch sử ghi **phần đảo ngược**, không ghi ảnh chụp cả bài. Một bài có thân
 * bài vài chục khối, chụp lại sau mỗi lần gõ là giữ vài chục bản gần giống
 * hệt nhau trong bộ nhớ; còn phần đảo ngược của một lần sửa tiêu đề chỉ là
 * một chuỗi. Nó cũng nói đúng hơn về **cái gì vừa đổi**, và đó là thứ cần để
 * gộp mấy lần gõ liền nhau thành một bước.
 *
 * Mọi thay đổi nội dung đi qua đúng một cửa — `applyPatch` — nên lịch sử chỉ
 * cần ngồi ở cửa ấy. Những thay đổi hệ tự làm (đo clip rồi đổi dàn trang) đi
 * đường khác và **không** vào lịch sử: người viết không ra lệnh cho chúng thì
 * cũng không đi tìm cách rút lại chúng.
 */

/** Giá trị cũ của đúng những khoá vừa bị đổi. */
export type Step = Record<string, unknown>

export type History = { past: Step[]; future: Step[]; at: number }

export const emptyHistory: History = { past: [], future: [], at: 0 }

/**
 * Bao nhiêu bước thì đủ.
 *
 * Đủ để lấy lại một buổi làm việc, không đủ để giữ mãi mọi thứ đã từng gõ.
 */
const LIMIT = 100

/** Gõ liền một mạch là một bước, không phải mỗi ký tự một bước. */
const COALESCE_MS = 800

/** Giá trị hiện tại của đúng những khoá sắp bị đổi — tức là cách quay lại. */
export function inverseOf(current: Record<string, unknown>, patch: Record<string, unknown>): Step {
  return Object.fromEntries(Object.keys(patch).map((k) => [k, current[k]]))
}

const sameKeys = (a: Step, b: Step) => {
  const ka = Object.keys(a).sort()
  const kb = Object.keys(b).sort()
  return ka.length === kb.length && ka.every((k, i) => k === kb[i])
}

/**
 * Ghi một bước.
 *
 * Hai lần sửa **cùng một ô** cách nhau trong tích tắc là một ý, không phải
 * hai: gộp chúng lại thì một lần Cmd+Z trả về chỗ người viết nhận ra là
 * "trước khi tôi sửa chỗ này", chứ không phải lùi từng ký tự một.
 *
 * Ghi một bước mới thì **xoá đường làm lại**. Đã đi sang một nhánh khác thì
 * nhánh cũ không còn nối vào đâu được nữa, và giữ nó lại là hứa một thứ
 * `redo` không thực hiện được.
 */
export function record(history: History, step: Step, now: number): History {
  const top = history.past[history.past.length - 1]
  const merge = top !== undefined && now - history.at < COALESCE_MS && sameKeys(top, step)
  // Gộp thì **giữ bước cũ**: nó mang giá trị xa hơn về quá khứ, tức là chỗ
  // người viết muốn quay lại.
  const past = merge ? history.past : [...history.past, step].slice(-LIMIT)
  return { past, future: [], at: now }
}

/**
 * Một bước lùi, kèm phần để đi tới lại.
 *
 * `null` nghĩa là không còn gì để lùi — chỗ gọi im lặng, không kêu.
 */
export function undo(
  history: History,
  current: Record<string, unknown>,
): { history: History; patch: Step } | null {
  const step = history.past[history.past.length - 1]
  if (step === undefined) return null
  return {
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, inverseOf(current, step)],
      // Mốc thời gian lùi về 0 để bước ghi ngay sau một lần hoàn tác không bị
      // gộp vào bước vừa được lôi ra khỏi lịch sử.
      at: 0,
    },
    patch: step,
  }
}

export function redo(
  history: History,
  current: Record<string, unknown>,
): { history: History; patch: Step } | null {
  const step = history.future[history.future.length - 1]
  if (step === undefined) return null
  return {
    history: {
      past: [...history.past, inverseOf(current, step)],
      future: history.future.slice(0, -1),
      at: 0,
    },
    patch: step,
  }
}

/**
 * Phím này có phải là hoàn tác không.
 *
 * Ô nhập đang có chữ chưa ghi thì **trả phím lại cho trình duyệt**. Hoàn tác
 * một ký tự vừa gõ nhầm là thao tác thường hơn nhiều so với hoàn tác cả một
 * lần sửa, và cướp nó đi là làm hỏng cái quen thuộc để phục vụ cái hiếm hơn.
 * Ô nào đang dở thì tự khai bằng `data-dirty`.
 */
export function historyKey(
  e: { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
  active: Element | null,
): 'undo' | 'redo' | null {
  if (!e.metaKey && !e.ctrlKey) return null
  if (active?.getAttribute?.('data-dirty') === 'true') return null

  const key = e.key.toLowerCase()
  if (key === 'z') return e.shiftKey ? 'redo' : 'undo'
  // Windows từ lâu vẫn có Ctrl+Y cho làm lại.
  if (key === 'y' && e.ctrlKey) return 'redo'
  return null
}
