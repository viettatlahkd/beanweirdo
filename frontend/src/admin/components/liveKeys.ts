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
import { $getListDepth, $isListItemNode, $isListNode, type ListItemNode } from '@lexical/list'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  INDENT_CONTENT_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  $isParagraphNode,
  $setSelection,
  KEY_DELETE_COMMAND,
  KEY_MODIFIER_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  type ElementNode,
  type LexicalEditor,
} from 'lexical'
import { FLOW_EXIT, fieldBeside, focusField, moveFocus } from '../lib/flowFocus'

/**
 * Hai mép của một ô soạn, và thứ nằm ngay ngoài chúng.
 *
 * Chủ site: *"xoá xoá tới khối table hay ảnh này kia là không xoá bằng
 * keyboard được. keyboard centered mà"*. Bảng và ảnh không phải chữ nên chúng
 * đứng ngoài ô soạn; `Backspace` ở đầu ô vì thế chạm vào một bức tường thay vì
 * nuốt cái đứng trước nó.
 *
 * Trả `true` nghĩa là đã nuốt xong — phím không đi tiếp. Trả `false` là không
 * có gì để nuốt, và phím trả về cho trình duyệt.
 */
export type LiveEdges = {
  onBackspaceAtStart?: () => boolean
  onDeleteAtEnd?: () => boolean
}

/**
 * Whether a paragraph may be indented. Only long-form stores a paragraph's
 * indent (`ind`); elsewhere it would show while typing and be gone on save.
 */
export type LiveIndent = { indentParagraphs?: boolean }

/** As deep as an indent goes: three paragraph steps (`stepIndent`), three list tiers (`lvl` 1–3). */
const MAX_PARAGRAPH = 3
const MAX_LIST = 2

/** The block the caret is in that an indent applies to, with its current level (0 = not indented). */
function indentTarget(paragraphs: boolean): { block: ElementNode; level: number; max: number } | null {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return null
  const node = selection.anchor.getNode()
  const item = $isListItemNode(node) ? node : $findMatchingParent(node, $isListItemNode)
  if (item) {
    const list = item.getParent()
    return { block: item, level: $isListNode(list) ? $getListDepth(list) - 1 : 0, max: MAX_LIST }
  }
  if (!paragraphs) return null
  const top = node.getTopLevelElement()
  return $isParagraphNode(top) ? { block: top, level: top.getIndent(), max: MAX_PARAGRAPH } : null
}

/** The caret stands, collapsed, before the first character of `block`. */
function atBlockStart(block: ElementNode): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed() || selection.anchor.offset !== 0) return false
  const node = selection.anchor.getNode()
  const first = (block as ListItemNode).getFirstDescendant()
  return node.is(block) || (first !== null && node.is(first))
}

/**
 * `Shift+Tab` indents the line one level, wherever the caret is in it (owner,
 * 2026-10-17). At the deepest level the key is still taken, so it does not
 * jump focus out of the text.
 */
function indentLine(editor: LexicalEditor, event: KeyboardEvent, paragraphs: boolean): boolean {
  const target = indentTarget(paragraphs)
  if (!target) return false
  event.preventDefault()
  if (target.level < target.max) editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)
  return true
}

/**
 * The caret is in a bullet or a numbered line. Backspace at its start drops the
 * mark first (Lexical turns the item into a paragraph); deleting the block above
 * from there took the box over a stray bullet along with it (owner, 2026-10-17).
 */
function inListItem(): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return false
  const node = selection.anchor.getNode()
  return $isListItemNode(node) || $findMatchingParent(node, $isListItemNode) !== null
}

/** `Backspace` at the start of an indented line takes it back one level instead of deleting. */
function outdentLine(editor: LexicalEditor, event: KeyboardEvent | null, paragraphs: boolean): boolean {
  const target = indentTarget(paragraphs)
  if (!target || target.level === 0 || !atBlockStart(target.block)) return false
  event?.preventDefault()
  editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)
  return true
}

/** Con trỏ đứng ở ngay đầu ô, không bôi đen gì. */
function atStart(): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false
  if (selection.anchor.offset !== 0) return false
  const first = $getRoot().getFirstDescendant()
  return first === null || selection.anchor.getNode().is(first)
}

/** Con trỏ đứng ở ngay cuối ô, không bôi đen gì. */
function atEnd(): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false
  const last = $getRoot().getLastDescendant()
  const node = selection.anchor.getNode()
  if (last !== null && !node.is(last)) return false
  return selection.anchor.offset === node.getTextContentSize()
}

/**
 * `Tab` chỉ đổi tầng khi con trỏ đứng ở **đầu** một mục danh sách.
 *
 * Ăn `Tab` ở mọi vị trí là dựng một cái bẫy focus: vào được ô chữ mà không ra
 * được bằng bàn phím. Ở đầu mục thì `Tab` gần như chắc chắn là ý muốn thụt
 * lề; giữa chữ thì nó là ý muốn đi tiếp sang chỗ khác.
 */
function onTab(editor: LexicalEditor, event: KeyboardEvent, paragraphs: boolean): boolean {
  if (event.shiftKey) return indentLine(editor, event, paragraphs)
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false
  if (selection.anchor.offset !== 0) return false
  const item = $findMatchingParent(selection.anchor.getNode(), $isListItemNode)
  if (!item) return false

  event.preventDefault()
  editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)
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

/**
 * Con trỏ đang ở dòng **đầu** (hay **cuối**) của cả ô, đo bằng hình vẽ thật.
 *
 * Đo theo dòng hiển thị chứ không theo ký tự: `↓` ở dòng cuối của một đoạn
 * dài phải ra khỏi ô ngay, không bắt người viết đi hết tới ký tự cuối. Không
 * đo được (jsdom, dòng trống) thì lùi về đúng đầu/cuối ô.
 */
function onEdgeLine(editor: LexicalEditor, dir: -1 | 1): boolean {
  const root = editor.getRootElement()
  const sel = window.getSelection()
  if (!root || !sel || sel.rangeCount === 0 || !sel.isCollapsed) return false
  const block = (dir === 1 ? root.lastElementChild : root.firstElementChild) as HTMLElement | null
  if (!block || !sel.anchorNode || !(block === sel.anchorNode || block.contains(sel.anchorNode))) return false
  const range = sel.getRangeAt(0)
  const rects = typeof range.getClientRects === 'function' ? Array.from(range.getClientRects()) : []
  const caret = rects[dir === 1 ? rects.length - 1 : 0]
  if (!caret || caret.height === 0) return dir === 1 ? atEnd() : atStart()
  const box = block.getBoundingClientRect()
  const line = parseFloat(getComputedStyle(block).lineHeight) || caret.height
  return dir === 1 ? caret.bottom > box.bottom - line * 0.75 : caret.top < box.top + line * 0.75
}

/**
 * Mũi tên ở mép ô thì sang ô kế bên — khối phía dưới, dải chữ phía trên.
 *
 * Bảng, số liệu, khung ghi chú đứng ngoài ô soạn. Không có đường này thì từ
 * chữ xuống tới chúng là cụt, và phải với tay ra chuột.
 */
function arrowOut(editor: LexicalEditor, event: KeyboardEvent, dir: -1 | 1, byLine: boolean): boolean {
  if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return false
  const edge = byLine ? onEdgeLine(editor, dir) : editor.getEditorState().read(() => (dir === 1 ? atEnd() : atStart()))
  const root = editor.getRootElement()
  if (!edge || !root || !moveFocus(root, dir)) return false
  event.preventDefault()
  return true
}

/**
 * `Enter` trên một dòng trống ở cuối ô soạn **nằm trong một khối** (hộp ghi
 * chú của long-form): bỏ dòng trống ấy và thoát khối — như `thingKeyDown` làm
 * cho ô `textarea`. Ô soạn của thân bài thì không nằm trong khối nào, nên
 * `Enter` ở đó vẫn chỉ là xuống dòng.
 */
function exitOnEmptyLast(editor: LexicalEditor, event: KeyboardEvent | null): boolean {
  if (event?.shiftKey) return false
  const root = editor.getRootElement()
  if (!root?.parentElement?.closest('[data-flow="thing"]')) return false
  const empty = editor.getEditorState().read(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false
    const top = selection.anchor.getNode().getTopLevelElement()
    const all = $getRoot().getChildren()
    return (
      top !== null &&
      all.length > 1 &&
      top.is(all[all.length - 1]) &&
      $isParagraphNode(top) &&
      top.getTextContentSize() === 0
    )
  })
  if (!empty) return false
  event?.preventDefault()
  $getRoot().getLastChild()?.remove()
  // Như `backOutOfEmptyLine`: bỏ vùng chọn để Lexical không kéo focus về.
  $setSelection(null)
  setTimeout(() => root.dispatchEvent(new CustomEvent(FLOW_EXIT, { bubbles: true })), 0)
  return true
}

/**
 * `Backspace` ở một dòng **trống** đầu ô: quay về khối phía trên, không xoá nó.
 *
 * Đây là chiều ngược của thoát khối: Enter ra khỏi bảng mở một dòng trống,
 * đổi ý bấm Backspace thì phải về lại cái bảng — không phải xoá mất cái bảng
 * như luật "xoá ngược tới khối" (`onBackspaceAtStart`) vẫn làm khi dòng có chữ.
 */
function backOutOfEmptyLine(editor: LexicalEditor, event: KeyboardEvent | null): boolean {
  const root = editor.getRootElement()
  if (!root || !atStart()) return false
  const first = $getRoot().getFirstChild()
  if (!$isParagraphNode(first) || first.getTextContentSize() > 0) return false
  const to = fieldBeside(root, -1)
  if (!to) return false
  event?.preventDefault()
  if ($getRoot().getChildrenSize() > 1) first.remove()
  // Bỏ vùng chọn, rồi mới chuyển ô: Lexical vẽ xong lượt này sẽ đặt lại vùng
  // chọn của nó lên DOM, và kéo focus về đúng ô vừa rời.
  $setSelection(null)
  setTimeout(() => focusField(to, 'end'), 0)
  return true
}

/** Nối tất cả vào một editor; trả về hàm gỡ, như mọi `register*` của Lexical. */
export function registerLiveKeys(editor: LexicalEditor, edges: LiveEdges = {}, { indentParagraphs = false }: LiveIndent = {}): () => void {
  const edge = (at: () => boolean, take?: () => boolean) => (event: KeyboardEvent | null) => {
    if (!take || !at() || !take()) return false
    event?.preventDefault()
    return true
  }

  return mergeRegister(
    editor.registerCommand(KEY_TAB_COMMAND, (event) => onTab(editor, event, indentParagraphs), COMMAND_PRIORITY_LOW),
    editor.registerCommand(KEY_MODIFIER_COMMAND, onModifier, COMMAND_PRIORITY_LOW),
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) =>
        outdentLine(editor, event, indentParagraphs) ||
        backOutOfEmptyLine(editor, event) ||
        (!inListItem() && edge(atStart, edges.onBackspaceAtStart)(event)),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(KEY_DELETE_COMMAND, edge(atEnd, edges.onDeleteAtEnd), COMMAND_PRIORITY_LOW),
    editor.registerCommand(KEY_ARROW_DOWN_COMMAND, (e) => arrowOut(editor, e, 1, true), COMMAND_PRIORITY_LOW),
    editor.registerCommand(KEY_ARROW_UP_COMMAND, (e) => arrowOut(editor, e, -1, true), COMMAND_PRIORITY_LOW),
    editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, (e) => arrowOut(editor, e, 1, false), COMMAND_PRIORITY_LOW),
    editor.registerCommand(KEY_ARROW_LEFT_COMMAND, (e) => arrowOut(editor, e, -1, false), COMMAND_PRIORITY_LOW),
    editor.registerCommand(KEY_ENTER_COMMAND, (e) => exitOnEmptyLast(editor, e), COMMAND_PRIORITY_LOW),
  )
}
