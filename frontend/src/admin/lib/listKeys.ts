/**
 * Bàn phím trong một danh sách.
 *
 * Chủ site: *"tôi thêm bullet con thì tôi thêm được mà tôi không xoá bằng
 * keyboard là sao? docs ấy thì centric của nó là người dùng tương tác qua bàn
 * phím"*. Đúng: trước lượt này `ListEditor` không truyền `onKeyDown` cho dòng
 * nào, nên thêm mục có nút mà xoá mục cũng chỉ có nút. Thêm bằng phím mà xoá
 * bằng chuột là một cái bẫy — người viết học được nửa đường rồi đứng lại.
 *
 * Phần quyết định nằm ở đây, tách khỏi React, vì nó là mấy phép biến đổi trên
 * một cái cây và cây thì dễ sai ở chỗ không nhìn thấy: mục cuối, mục lồng ba
 * tầng, mục có con. Kiểm chúng bằng dữ liệu rẻ hơn nhiều so với kiểm bằng
 * cách dựng cả màn soạn lên rồi bấm phím.
 *
 * Không hàm nào ở đây tự quyết định "không làm gì" một cách im lặng: trả
 * `null` nghĩa là **trả phím lại cho trình duyệt**, và đó luôn là một lựa
 * chọn có lý do viết kèm.
 */
import { runsToText, textToRuns, type ListItem } from 'post-renderer'

/** Design vẽ ba tầng; sâu hơn là dựng một tầng không có cách nào vẽ ra. */
export const MAX_DEPTH = 3

/** `sub` có mặt thì chỗ cần con trỏ là dòng phụ thứ mấy, không phải dòng chính. */
export type Focus = { path: number[]; caret: number; sub?: number }

/**
 * Kết quả một phím.
 *
 * `leave` là lúc danh sách không còn là chỗ đúng cho con trỏ nữa — Enter ở
 * một mục rỗng ngoài cùng. Khối danh sách không tự làm được việc ấy vì nó
 * phải sinh ra một khối **khác** loại, nên nó nói ra và canvas làm.
 *
 * `items` và `leave` đi được cùng nhau: rời danh sách gần như luôn kèm việc
 * bỏ lại cái mục rỗng vừa dùng để rời đi. Tách làm hai kiểu loại trừ nhau sẽ
 * để lại đúng cái mục rỗng ấy.
 */
export type ListResult = { items?: ListItem[]; focus?: Focus; leave?: true } | null

/** Mục ở đúng đường dẫn, sâu bao nhiêu tầng cũng tới. */
export function at(items: ListItem[], path: number[]): ListItem | undefined {
  return path.reduce<ListItem | undefined>(
    (item, i) => (item === undefined ? items[i] : item.children?.[i]),
    undefined,
  )
}

/** Viết lại đúng một mục, giữ nguyên phần còn lại của cây. */
function write(items: ListItem[], path: number[], change: (item: ListItem) => ListItem): ListItem[] {
  const [head, ...rest] = path
  return items.map((item, i) => {
    if (i !== head) return item
    return rest.length === 0 ? change(item) : { ...item, children: write(item.children ?? [], rest, change) }
  })
}

/** Bỏ đúng một mục. Không giữ lại mục cuối — chỗ gọi quyết định việc ấy. */
function drop(items: ListItem[], path: number[]): ListItem[] {
  const [head, ...rest] = path
  if (rest.length === 0) return items.filter((_, i) => i !== head)
  return items.map((item, i) => {
    if (i !== head) return item
    const kids = drop(item.children ?? [], rest)
    // Hết con thì bỏ hẳn khoá đi, để hai mục giống nhau so ra bằng nhau.
    const { children, ...bare } = item
    void children
    return kids.length > 0 ? { ...bare, children: kids } : bare
  })
}

/** Chèn một mục vào ngay sau `path`, cùng cấp với nó. */
function insertAfter(items: ListItem[], path: number[], fresh: ListItem): ListItem[] {
  const [head, ...rest] = path
  if (rest.length === 0) {
    const next = [...items]
    next.splice(head + 1, 0, fresh)
    return next
  }
  return items.map((item, i) =>
    i === head ? { ...item, children: insertAfter(item.children ?? [], rest, fresh) } : item,
  )
}

/**
 * Mọi đường dẫn theo thứ tự đọc — cha trước con, trên trước dưới.
 *
 * "Mục phía trên" của một mục lồng không phải là anh em liền trước nó, mà có
 * thể là đứa cháu cuối cùng của anh em ấy. Đi theo thứ tự đọc là cách duy
 * nhất trả lời đúng câu ấy mà không phải xét từng trường hợp.
 */
export function paths(items: ListItem[], prefix: number[] = []): number[][] {
  return items.flatMap((item, i) => {
    const here = [...prefix, i]
    return [here, ...paths(item.children ?? [], here)]
  })
}

function previous(items: ListItem[], path: number[]): number[] | undefined {
  const all = paths(items)
  const i = all.findIndex((p) => p.join() === path.join())
  return i > 0 ? all[i - 1] : undefined
}

const textOf = (item: ListItem | undefined) => runsToText(item?.runs)

/** `Tab` — xuống một tầng, thành con của mục liền trước cùng cấp. */
export function indent(items: ListItem[], path: number[]): ListResult {
  const index = path[path.length - 1]
  // Mục đầu tiên của một cấp không có ai để làm con — thụt nó vào là dựng
  // một tầng không có gốc.
  if (index === 0) return null
  if (path.length >= MAX_DEPTH) return null

  const moving = at(items, path)
  if (!moving) return null
  const olderPath = [...path.slice(0, -1), index - 1]
  const older = at(items, olderPath)
  if (!older) return null

  const kids = [...(older.children ?? []), moving]
  const withoutIt = drop(items, path)
  const next = write(withoutIt, olderPath, (it) => ({ ...it, children: kids }))
  return { items: next, focus: { path: [...olderPath, kids.length - 1], caret: textOf(moving).length } }
}

/** `Shift+Tab` — lên một tầng, thành em liền sau của cha. */
export function outdent(items: ListItem[], path: number[]): ListResult {
  if (path.length < 2) return null
  const moving = at(items, path)
  if (!moving) return null

  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]
  const parent = at(items, parentPath)
  /*
   * Các em còn lại phía dưới đi theo nó, thành con của nó.
   *
   * Bỏ chúng ở lại là để chúng nhảy lên đứng dưới một mục khác — thứ tự đọc
   * vẫn thế mà tầng bậc thì đổi, và người viết không hề ra lệnh cho việc ấy.
   */
  const younger = (parent?.children ?? []).slice(index + 1)
  const lifted =
    younger.length > 0 ? { ...moving, children: [...(moving.children ?? []), ...younger] } : moving

  let next = items
  for (const p of younger.map((_, k) => [...parentPath, index + 1 + k]).reverse()) {
    next = drop(next, p)
  }
  next = drop(next, path)
  next = insertAfter(next, parentPath, lifted)

  const landed = [...parentPath.slice(0, -1), parentPath[parentPath.length - 1] + 1]
  return { items: next, focus: { path: landed, caret: textOf(moving).length } }
}

/**
 * `Enter` — mục mới, tách mục, hoặc thoát danh sách.
 *
 * Mục rỗng không sinh ra mục rỗng nữa: nó lùi ra một tầng, và ở tầng ngoài
 * cùng thì rời hẳn danh sách. Không có đường ấy thì danh sách là một cái hố —
 * vào được bằng bàn phím, ra thì phải với tay lấy chuột.
 */
export function enter(items: ListItem[], path: number[], text: string, caret: number): ListResult {
  if (text === '') {
    const out = outdent(items, path)
    if (out) return out
    // Ngoài cùng rồi: bỏ cái mục rỗng vừa dùng để thoát, rồi rời danh sách.
    return { items: drop(items, path), leave: true }
  }

  const before = text.slice(0, caret)
  const after = text.slice(caret)
  /*
   * Con ở lại với nửa trên.
   *
   * Chúng là chi tiết của cái ý đã viết xong, không phải của cái ý vừa mở ra;
   * và nửa dưới thường là một mục hoàn toàn mới.
   */
  const kept = write(items, path, (it) => ({ ...it, runs: textToRuns(before) }))
  const next = insertAfter(kept, path, { runs: textToRuns(after) })
  const landed = [...path.slice(0, -1), path[path.length - 1] + 1]
  return { items: next, focus: { path: landed, caret: 0 } }
}

/**
 * `Backspace` ở **đầu** mục — cái chủ site báo thiếu.
 *
 * Mục rỗng thì biến mất; mục có chữ thì nhập vào mục phía trên, và con trỏ
 * đứng đúng chỗ nối để gõ tiếp không phải tìm lại chỗ.
 */
export function backspace(items: ListItem[], path: number[], text: string, caret: number): ListResult {
  // Giữa chữ thì đây là xoá một ký tự, việc của trình duyệt.
  if (caret !== 0) return null

  const item = at(items, path)
  if (!item) return null

  /*
   * Mục lồng thì **lùi ra một tầng trước đã**, dù có chữ hay không.
   *
   * Mất một tầng nhẹ hơn mất cả mục, nên một phím lỡ tay chỉ tốn một phím để
   * đi ngược lại; bấm lần nữa mới nhập lên. Và nhập thẳng con vào cha là một
   * câu hỏi không có câu trả lời gọn, vì cha đang giữ chính nó trong danh
   * sách con của mình.
   */
  const out = outdent(items, path)
  if (out) return out

  // Từ đây chỉ còn mục ở cấp ngoài cùng.
  const priorPath = previous(items, path)

  if (text === '') {
    // Mục rỗng duy nhất của cả danh sách: xoá nó là xoá khối, nên rời hẳn.
    if (!priorPath) return { items: drop(items, path), leave: true }
    const rest = drop(items, path)
    return { items: rest, focus: { path: priorPath, caret: textOf(at(items, priorPath)).length } }
  }

  // Mục đầu tiên của cả danh sách: không có gì phía trên để nhập vào.
  if (!priorPath) return null

  /*
   * Đọc mục phía trên **sau khi** đã bỏ mục này đi.
   *
   * Đọc trước thì danh sách con của nó có thể vẫn đang chứa chính mục đang bị
   * nhập, và mục ấy sẽ được chép lại thành con của chỗ nó vừa nhập vào.
   */
  let next = drop(items, path)
  const prior = at(next, priorPath)
  const join = textOf(prior)
  // Con của mục bị nhập đi theo lên. Bỏ chúng lại là xoá chúng mà không nói —
  // người viết bấm một phím xoá và mất cả một nhánh.
  const kids = [...(prior?.children ?? []), ...(item.children ?? [])]
  next = write(next, priorPath, (it) => ({
    ...it,
    runs: textToRuns(join + text),
    ...(kids.length > 0 ? { children: kids } : null),
  }))
  return { items: next, focus: { path: priorPath, caret: join.length } }
}

/** `Shift+Enter` — một dòng chìm dưới mục, không phải một mục mới. */
export function subLine(items: ListItem[], path: number[]): ListResult {
  const item = at(items, path)
  if (!item) return null
  const next = write(items, path, (it) => ({ ...it, sub: [...(it.sub ?? []), ''] }))
  return { items: next, focus: { path, caret: 0, sub: item.sub?.length ?? 0 } }
}
