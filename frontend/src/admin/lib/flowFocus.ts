/**
 * Con trỏ đi xuyên thân bài bằng bàn phím: từ dải chữ vào khối, từ khối ra
 * dải chữ, không cần chuột.
 *
 * Chủ site: *"keyboard centered nhé nên phải dùng được bằng keyboard ... dùng
 * chuột cũng được nhưng mà là failed nếu không có keyboard"*.
 *
 * Bốn khuôn giữ thân bài bằng bốn từ vựng khác nhau (`ReportBlock`,
 * `SectionData`, `LongformBlock`, element của memo/bitesize/cards), nhưng trên
 * màn hình chúng vẽ ra cùng một thứ: dải chữ (`LiveRun`) xen với khối
 * (`RowShell`). Nên việc đi lại đọc **DOM**, không đọc dữ liệu — mỗi chỗ dừng
 * mang `data-flow="run"` hoặc `data-flow="thing"` cùng chỉ số trong kho ở
 * `data-flow-at`, và một chỗ viết chung cho cả bốn.
 */
import type { LexicalEditor } from 'lexical'
import { $createParagraphNode, $getRoot } from 'lexical'

/** Ô nhận chữ bên trong một khối. Nút ở máng trái không tính. */
const FIELD =
  'input:not([type=file]):not([type=hidden]), textarea, [role=textbox], .awc-live-input, [contenteditable=true]'

/** Vùng chứa các chỗ dừng — một thân bài, hay một thẻ của cards. */
function flowRoot(from: Element | null): HTMLElement | null {
  return (from?.closest('[data-flow-root]') as HTMLElement | null) ?? null
}

/** Mọi ô gõ được trong thân bài, theo đúng thứ tự người đọc thấy. */
function flowFields(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = []
  root.querySelectorAll<HTMLElement>('[data-flow]').forEach((stop) => {
    // Dải chữ nằm trong một khối (hộp ghi chú của long-form) đã được khối ấy đếm.
    if (stop.parentElement?.closest('[data-flow]')) return
    if (stop.dataset.flow === 'run') {
      const input = stop.querySelector<HTMLElement>('.awc-live-input')
      if (input) out.push(input)
      return
    }
    stop.querySelectorAll<HTMLElement>(FIELD).forEach((field) => {
      if (field.closest('.awc-gutter')) return
      // Ô Lexical lồng trong ô khác thì chỉ đếm cái ngoài cùng.
      if (field.parentElement?.closest('.awc-live-input')) return
      out.push(field)
    })
  })
  return out
}

/** Lexical gắn editor vào chính phần tử gốc của nó. */
function lexicalOf(el: HTMLElement): LexicalEditor | null {
  return (el as HTMLElement & { __lexicalEditor?: LexicalEditor }).__lexicalEditor ?? null
}

/**
 * Đặt con trỏ vào một ô, ở đầu hoặc cuối.
 *
 * Ô Lexical thì đi qua chính editor của nó: đặt vùng chọn DOM bằng tay thì
 * Lexical chỉ đọc lại ở lần `selectionchange` sau, và phím kế tiếp rơi vào
 * chỗ cũ.
 */
export function focusField(field: HTMLElement, edge: 'start' | 'end' | 'all' | 'newLine'): void {
  const editor = lexicalOf(field)
  if (editor) {
    editor.update(() => {
      const root = $getRoot()
      const first = root.getFirstChild()
      if (edge === 'newLine' && first && first.getTextContentSize() > 0) {
        // Thoát khối là để viết tiếp một dòng **mới**, không phải chen chữ
        // vào đầu đoạn đang có. Dòng trống này không ai gõ vào thì lúc ghi
        // tự rơi mất — markdown không có đoạn rỗng.
        const line = $createParagraphNode()
        first.insertBefore(line)
        line.select()
      } else if (edge === 'end') root.selectEnd()
      else root.selectStart()
    })
    field.focus({ preventScroll: false })
    return
  }
  field.focus()
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    try {
      // Khối vừa chèn mang sẵn chữ mặc định ("Cột 1") — bôi đen để gõ đè luôn.
      if (edge === 'all') field.select()
      else {
        const at = edge === 'end' ? field.value.length : 0
        field.setSelectionRange(at, at)
      }
    } catch {
      // `type=number` không có vùng chọn — focus là đủ.
    }
  }
}

/**
 * Sang ô kế bên theo một hướng. Trả `false` khi không còn ô nào — để phím
 * về lại trình duyệt thay vì chết cứng ở mép bài.
 */
export function moveFocus(from: HTMLElement, dir: -1 | 1): boolean {
  const to = fieldBeside(from, dir)
  if (!to) return false
  focusField(to, dir === 1 ? 'start' : 'end')
  return true
}

/** Ô kế bên theo một hướng, không đụng tới focus. */
export function fieldBeside(from: HTMLElement, dir: -1 | 1): HTMLElement | null {
  const root = flowRoot(from)
  if (!root) return null
  const fields = flowFields(root)
  const here = fields.findIndex((f) => f === from || f.contains(from))
  if (here < 0) return null
  return fields[here + dir] ?? null
}

/**
 * Đợi thân bài vẽ lại rồi mới đặt con trỏ.
 *
 * Chèn hay dời một khối là ghi xuống dữ liệu, rồi React mới vẽ; phần tử cần
 * focus chưa có mặt lúc gọi. Thử lại qua vài khung hình rồi thôi — không tìm
 * thấy thì con trỏ ở yên, không phải lỗi.
 */
function focusLater(
  root: HTMLElement | null,
  find: (root: HTMLElement) => HTMLElement | null | undefined,
  then: (el: HTMLElement) => void,
  tries = 8,
): void {
  if (!root) return
  const step = (left: number) => {
    const el = root.isConnected ? find(root) : null
    if (el) then(el)
    else if (left > 0) requestAnimationFrame(() => step(left - 1))
  }
  requestAnimationFrame(() => step(tries))
}

/** Chỗ dừng mang chỉ số `at` trong kho. */
function stopAt(root: HTMLElement, kind: 'run' | 'thing', at: number): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-flow="${kind}"][data-flow-at="${at}"]`)
}

/** Các ô gõ được của một khối, theo thứ tự. */
function fieldsOf(stop: HTMLElement): HTMLElement[] {
  return Array.from(stop.querySelectorAll<HTMLElement>(FIELD)).filter(
    (f) => !f.closest('.awc-gutter') && !f.parentElement?.closest('.awc-live-input'),
  )
}

/**
 * Ô để đặt con trỏ khi vừa vào một khối.
 *
 * Vào từ trên xuống thì ưu tiên ô **nội dung** (ô nhiều dòng) hơn ô nhãn phụ:
 * khối nhấn có một dòng nhãn tuỳ chọn đứng trước phần chữ, và chèn xong mà con
 * trỏ rơi vào nhãn là gõ nhầm chỗ ngay chữ đầu tiên.
 */
export function fieldOf(stop: HTMLElement, edge: 'start' | 'end'): HTMLElement | null {
  if (stop.dataset.flow === 'run') return stop.querySelector<HTMLElement>('.awc-live-input')
  const fields = fieldsOf(stop)
  const body = fields.find((f) => f instanceof HTMLTextAreaElement || f.getAttribute('role') === 'textbox')
  if (edge === 'start' && body) return body
  if (fields.length > 0) return edge === 'start' ? fields[0] : fields[fields.length - 1]
  // Khối không có ô chữ nào (ảnh chưa tải) — đứng ở nút đầu tiên của nó.
  return (
    Array.from(stop.querySelectorAll<HTMLElement>('button')).find((b) => !b.closest('.awc-gutter')) ?? null
  )
}

/** Đặt một giá trị vào ô nhập mà React vẫn nghe thấy như người gõ. */
function setFieldValue(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(field, value)
  field.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Tên sự kiện một ô bên trong khối bắn ra khi muốn thoát khối — xem `thingKeyDown`. */
export const FLOW_EXIT = 'awc-flow-exit'

/**
 * Thoát khỏi một khối, về dòng chữ ngay dưới nó.
 *
 * Dưới khối đã là một dải chữ thì con trỏ vào đầu dải ấy. Dưới nó là một khối
 * khác, hay là hết bài, thì mở một dòng trống (`addLine`) rồi mới vào — viết
 * xong một khung ghi chú mà phải với tay ra chuột để có chỗ viết tiếp là đúng
 * cái chủ site gọi là *failed*.
 */
export function exitThing(stop: HTMLElement, addLine: () => void): void {
  const root = flowRoot(stop)
  const at = Number(stop.dataset.flowAt)
  if (!root || !Number.isInteger(at)) return
  const next = stopAt(root, 'run', at + 1)
  const input = next?.querySelector<HTMLElement>('.awc-live-input')
  if (input) {
    focusField(input, 'newLine')
    return
  }
  addLine()
  focusLater(
    root,
    (r) => stopAt(r, 'run', at + 1)?.querySelector<HTMLElement>('.awc-live-input'),
    (el) => focusField(el, 'newLine'),
  )
}

const isText = (el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement =>
  el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type !== 'file')

/**
 * Phím trong một ô **bên trong khối** — cùng một luật cho mọi khối của mọi khuôn.
 *
 * - `Enter` ở ô một dòng: sang ô kế tiếp của cùng khối (nhãn → giá trị, ô
 *   bảng → ô bảng); ô trống, hoặc ô cuối của khối, thì thoát khối.
 * - `Enter` ở ô nhiều dòng: xuống dòng như thường; nhưng `Enter` trên một dòng
 *   trống ở cuối thì bỏ dòng trống ấy và thoát khối — như Lark, như Notion.
 *   `Cmd/Ctrl+Enter` thoát ngay ở bất cứ đâu.
 * - Mũi tên ở mép ô: sang ô kế bên, xuyên qua ranh giới khối và dải chữ.
 * - `Backspace` / `Delete` trong một khối trống trơn: bỏ khối, con trỏ về dòng phía trên.
 * - `Esc` ở bất cứ đâu trong khối: **chọn cả khối** — con trỏ lên tay nắm, nơi
 *   `Delete` xoá, mũi tên dời, `Enter` quay vào. Khối ảnh, khối bảng đầy chữ
 *   không có ô nào trống, nên trước đây không có phím nào xoá được chúng.
 * - `Delete` / `Backspace` khi con trỏ đứng trên một nút của khối (khối ảnh chưa
 *   có ảnh chỉ có nút): xoá khối.
 *
 * Gắn vào vỏ ngoài của khối, nên ô nào đã tự dùng phím (`preventDefault`) thì
 * nó thắng: dán, `/`, hay luật riêng của từng khối không bị giành mất.
 */
export function thingKeyDown(
  e: {
    key: string
    shiftKey: boolean
    altKey: boolean
    ctrlKey: boolean
    metaKey: boolean
    target: EventTarget | null
    currentTarget: EventTarget | null
    defaultPrevented: boolean
    nativeEvent: KeyboardEvent
    preventDefault: () => void
  },
  remove: () => void,
): void {
  if (e.defaultPrevented || e.nativeEvent.isComposing) return
  const field = e.target
  const stop = e.currentTarget as HTMLElement | null
  if (!stop || !(field instanceof HTMLElement) || field.closest('.awc-gutter')) return

  if (e.key === 'Escape' && !document.querySelector('.awc-menu-pop')) {
    const grip = stop.querySelector<HTMLElement>('.awc-grip')
    if (grip) {
      e.preventDefault()
      grip.focus()
    }
    return
  }
  const editable =
    isText(field) ||
    field.isContentEditable ||
    field instanceof HTMLSelectElement ||
    field.getAttribute('role') === 'textbox' ||
    field.closest('[contenteditable=true]')
  if (!editable) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      removeThing(stop, remove)
    }
    return
  }
  if (!isText(field)) return

  const value = field.value
  const from = field.selectionStart
  const to = field.selectionEnd
  const single = field instanceof HTMLInputElement

  if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
    if (single && value !== '' && !e.metaKey && !e.ctrlKey) {
      const own = fieldsOf(stop)
      const next = own[own.indexOf(field) + 1]
      if (next) {
        e.preventDefault()
        focusField(next, 'end')
        return
      }
    }
    const atEmptyEnd = from === value.length && to === from && (value === '' || value.endsWith('\n'))
    if (single || e.metaKey || e.ctrlKey || atEmptyEnd) {
      e.preventDefault()
      const exit = () => field.dispatchEvent(new CustomEvent(FLOW_EXIT, { bubbles: true }))
      if (!single && atEmptyEnd) {
        setFieldValue(field, value.replace(/\n+$/, ''))
        // Đợi React nhận chữ đã bỏ dòng trống rồi mới rời ô: rời ngay thì lúc
        // ghi nó vẫn cầm bản cũ, và dòng trống ấy vào kho.
        setTimeout(exit, 0)
      } else exit()
    }
    return
  }

  if (from === null || to === null || from !== to || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return

  const dir: -1 | 1 | 0 =
    e.key === 'ArrowLeft'
      ? from === 0 ? -1 : 0
      : e.key === 'ArrowRight'
        ? from === value.length ? 1 : 0
        : e.key === 'ArrowUp'
          ? single || !value.slice(0, from).includes('\n') ? -1 : 0
          : e.key === 'ArrowDown'
            ? single || !value.slice(from).includes('\n') ? 1 : 0
            : 0
  if (dir !== 0) {
    if (moveFocus(field, dir)) e.preventDefault()
    return
  }

  if ((e.key === 'Backspace' || e.key === 'Delete') && value === '') {
    const fields = Array.from(stop.querySelectorAll('input, textarea, [role=textbox]')).filter(
      (f) => !f.closest('.awc-gutter'),
    )
    // Ô chọn tệp không mang chữ nào; ảnh đã tải thì hiện ra thành `img`, và
    // một khối có ảnh không bao giờ là khối trống — xoá chú thích không được
    // kéo cả tấm ảnh đi theo.
    const empty =
      !stop.querySelector('img, video') &&
      fields.every((f) => (f instanceof HTMLInputElement && f.type === 'file') || (isText(f) && f.value === ''))
    if (!empty) return
    e.preventDefault()
    removeThing(stop, remove)
  }
}

/**
 * Bỏ một khối mà con trỏ không rơi mất.
 *
 * Xoá xong thì phần tử đang giữ focus biến mất, và trình duyệt thả con trỏ về
 * `body` — người đang dùng bàn phím mất chỗ đứng, phải cầm chuột bấm lại. Nên
 * con trỏ sang ô ngay trên khối (cuối ô), hoặc ô ngay dưới nếu khối đứng đầu.
 *
 * Report hỏi trước khi xoá một khối có ghi chú cạnh bài: khi ấy khối còn nguyên
 * và hộp hỏi nhận phím, nên chỉ dời con trỏ khi số chỗ dừng thật sự giảm.
 */
export function removeThing(stop: HTMLElement, remove: () => void): void {
  const root = flowRoot(stop)
  if (!root) {
    remove()
    return
  }
  const count = () => root.querySelectorAll('[data-flow]').length
  const before = count()
  // Đếm theo vị trí trong trang, không theo ô của khối: khối ảnh chưa có ảnh
  // không có ô gõ nào để làm mốc.
  const above = flowFields(root).filter(
    (f) => !stop.contains(f) && stop.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_PRECEDING,
  ).length
  remove()
  focusLater(
    root,
    (r) => {
      if (count() === before) return null
      const now = flowFields(r)
      // Dải chữ hai bên khối gộp lại sau khi xoá, nhưng ô phía trên vẫn giữ
      // chỉ số của nó; khối đứng đầu thì ô đầu tiên là ô ngay dưới nó.
      return above > 0 ? now[above - 1] : now[0]
    },
    (el) => focusField(el, above > 0 ? 'end' : 'start'),
  )
}

/** Sau khi chèn hay dời một khối tới chỉ số `at`: đặt con trỏ vào ô đầu của nó. */
export function focusThingLater(from: Element | null, at: number): void {
  focusLater(
    flowRoot(from),
    (r) => {
      const stop = stopAt(r, 'thing', at)
      return stop ? fieldOf(stop, 'start') : null
    },
    (el) => focusField(el, 'all'),
  )
}

/**
 * Dòng thứ mấy, trong khối thứ mấy, của mặt soạn chứa điểm (`node`, `offset`).
 *
 * Mỗi con trực tiếp của `.awc-live-input` là một khối. Trong một khối, mỗi
 * `<br>` (Lexical vẽ dòng gộp thành ngắt dòng) và mỗi mục danh sách mở một dòng
 * — đúng cách `mdBlocks` đếm dòng nguồn, nên `linesThrough` đổi được cặp số
 * này ra chỗ cắt trong markdown. Mục bọc danh sách con (`awc-live-li-nested`)
 * không có chữ của riêng nó, nên không phải một dòng.
 */
export function lineOfPoint(
  input: HTMLElement,
  node: Node,
  offset: number,
): { block: number; line: number; el: HTMLElement } | null {
  let top: Node | null = node
  if (node === input) top = input.children[Math.min(offset, input.children.length - 1)] ?? null
  else while (top && top.parentNode !== input) top = top.parentNode
  if (!(top instanceof HTMLElement)) return null
  const block = Array.prototype.indexOf.call(input.children, top) as number
  if (block < 0) return null

  const point = document.createRange()
  try {
    point.setStart(node, offset)
  } catch {
    return { block, line: 0, el: top }
  }
  point.collapse(true)
  let items = 0
  let breaks = 0
  let el: HTMLElement = top
  top.querySelectorAll<HTMLElement>('li, br').forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    if (mark.tagName === 'LI' && mark.classList.contains('awc-live-li-nested')) return
    const at = Array.prototype.indexOf.call(parent.childNodes, mark) as number
    const cmp = point.comparePoint(parent, at)
    if (mark.tagName === 'LI' && cmp <= 0) {
      items += 1
      el = mark
    } else if (mark.tagName === 'BR' && cmp < 0) breaks += 1
  })
  return { block, line: items > 0 ? items - 1 + breaks : breaks, el }
}
