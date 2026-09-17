/**
 * Mấy phím người viết thử trước khi đọc bất cứ hướng dẫn nào.
 *
 * Lexical mang sẵn `Cmd+B`, `Cmd+U` và phím cho danh sách, nhưng ba chỗ thì
 * không: thụt lề bằng `Tab`, `Cmd+K`, và `Cmd+\`. Chúng nằm ở đây thay vì
 * trong `LiveText` để `LiveText` còn đọc được — nó là chỗ nối Lexical vào
 * cách lưu của site, không phải chỗ chứa luật bàn phím.
 *
 * Viết dưới dạng hàm thuần nhận `editor`, không phải component, để test gọi
 * thẳng được: jsdom không dựng `contenteditable` nên đường duy nhất đo được
 * mấy phím này là dựng một editor rồi bắn lệnh vào.
 */
import { $isListItemNode } from '@lexical/list'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  INDENT_CONTENT_COMMAND,
  KEY_MODIFIER_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  type LexicalEditor,
} from 'lexical'

/**
 * `Tab` chỉ đổi tầng khi con trỏ đứng ở **đầu** một mục danh sách.
 *
 * Ăn `Tab` ở mọi vị trí là dựng một cái bẫy focus: vào được ô chữ mà không ra
 * được bằng bàn phím. Ở đầu mục thì `Tab` gần như chắc chắn là ý muốn thụt
 * lề; giữa chữ thì nó là ý muốn đi tiếp sang chỗ khác.
 */
function onTab(editor: LexicalEditor, event: KeyboardEvent): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false
  if (selection.anchor.offset !== 0) return false
  const item = $findMatchingParent(selection.anchor.getNode(), $isListItemNode)
  if (!item) return false

  event.preventDefault()
  editor.dispatchCommand(event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND, undefined)
  return true
}

/**
 * `Cmd+K` để lại một cái vỏ link, không mở hộp thoại nào.
 *
 * Vẫn là markdown: phím chèn hộ mấy dấu mà tay vẫn gõ được, nên không sinh ra
 * đường nhập liệu thứ hai. `[chữ]()` chưa có địa chỉ thì `textToRuns` không
 * đọc thành link — một link viết dở trông đúng ra dở, thay vì trông như xong.
 */
function insertLinkShell(): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return false

  selection.insertText(`[${selection.getTextContent()}]()`)

  // Con trỏ vào giữa hai ngoặc đơn — chỗ duy nhất còn thiếu.
  const after = $getSelection()
  if ($isRangeSelection(after) && after.isCollapsed()) {
    const node = after.anchor.getNode()
    if ($isTextNode(node)) node.select(after.anchor.offset - 1, after.anchor.offset - 1)
  }
  return true
}

/**
 * `Cmd+\` trả vùng chọn về chữ thường.
 *
 * Gỡ trên từng `TextNode` chứ không gọi `selection.formatText`: `formatText`
 * bật/tắt theo cờ của **vùng chọn**, thứ có thể chưa đọc cờ của chữ nó đang
 * trùm lên — bôi đen chữ đậm rồi bấm thì hoá ra bôi đậm thêm một lần nữa.
 *
 * Chọn nửa chừng một khối chữ thì cắt khối ấy ra trước, để phần không được
 * chọn giữ nguyên định dạng của nó.
 */
function clearFormats(): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return false

  const nodes = selection.getNodes()
  const [start, end] = selection.isBackward()
    ? [selection.focus, selection.anchor]
    : [selection.anchor, selection.focus]

  nodes.forEach((node, i) => {
    if (!$isTextNode(node)) return
    let part = node
    if (i === 0 && start.offset !== 0) part = part.splitText(start.offset)[1] ?? part
    if (i === nodes.length - 1) {
      const cut = end.offset - (part === node ? 0 : start.offset)
      part = part.splitText(cut)[0] ?? part
    }
    part.setFormat(0)
  })
  return true
}

function onModifier(event: KeyboardEvent): boolean {
  if (!event.metaKey && !event.ctrlKey) return false
  if (event.key === 'k' || event.key === 'K') {
    if (!insertLinkShell()) return false
    event.preventDefault()
    return true
  }
  if (event.key === '\\') {
    if (!clearFormats()) return false
    event.preventDefault()
    return true
  }
  return false
}

/** Nối cả ba vào một editor; trả về hàm gỡ, như mọi `register*` của Lexical. */
export function registerLiveKeys(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerCommand(KEY_TAB_COMMAND, (event) => onTab(editor, event), COMMAND_PRIORITY_LOW),
    editor.registerCommand(KEY_MODIFIER_COMMAND, onModifier, COMMAND_PRIORITY_LOW),
  )
}
