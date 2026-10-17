/**
 * Ba phím `LiveText` phải tự lo, đo bằng cách bắn lệnh thẳng vào editor.
 *
 * jsdom không dựng `contenteditable`, nên không có đường nào gõ thật. Cái đo
 * được ở đây là: lệnh có tới đúng chỗ không, trạng thái sau đó ra sao, và
 * phím có bị nuốt khi lẽ ra phải để nó đi tiếp không.
 */
import { describe, expect, it } from 'vitest'
import { $createListItemNode, $createListNode, $isListNode, registerList } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode, registerRichText } from '@lexical/rich-text'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  createEditor,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_MODIFIER_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical'
import { registerLiveKeys } from './liveKeys'

function makeEditor(indentParagraphs = false): LexicalEditor {
  const editor = createEditor({
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
    onError: (e: Error) => {
      throw e
    },
  })
  // Thụt lề là lệnh của `rich-text`, mục danh sách chỉ là chỗ nó đáp xuống —
  // thiếu nó thì `INDENT_CONTENT_COMMAND` bắn ra mà không ai nhận.
  registerRichText(editor)
  registerList(editor)
  registerLiveKeys(editor, {}, { indentParagraphs })
  return editor
}

/** Một danh sách hai mục, con trỏ đặt trong mục thứ hai ở vị trí `offset`. */
function listWithCaret(editor: LexicalEditor, offset: number) {
  editor.update(
    () => {
      const list = $createListNode('bullet')
      const first = $createListItemNode().append($createTextNode('một'))
      const second = $createListItemNode().append($createTextNode('hai'))
      list.append(first, second)
      $getRoot().clear().append(list)
      second.getFirstChildOrThrow<ReturnType<typeof $createTextNode>>().select(offset, offset)
    },
    { discrete: true },
  )
}

/**
 * Lệnh chạy trong một vòng cập nhật riêng, và vòng ấy chưa chốt lúc dòng lệnh
 * sau chạy tới. Một `update` rỗng, `discrete`, đẩy nó vào sổ trước khi đo.
 */
function flush(editor: LexicalEditor) {
  editor.update(() => {}, { discrete: true })
}

function tab(editor: LexicalEditor, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true })
  editor.dispatchCommand(KEY_TAB_COMMAND, event)
  flush(editor)
  return event
}

function backspace(editor: LexicalEditor): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true })
  editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event)
  flush(editor)
  return event
}

function text(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => $getRoot().getTextContent())
}

function modifier(editor: LexicalEditor, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, metaKey: true, cancelable: true })
  editor.dispatchCommand(KEY_MODIFIER_COMMAND, event)
  flush(editor)
  return event
}

/**
 * Mục sâu nhất trong bài đang ở tầng mấy.
 *
 * Đếm bằng cách đi xuống, không dùng `$getListDepth`: hàm ấy đo một danh sách
 * cụ thể nằm sâu bao nhiêu, nên hỏi nó ở danh sách ngoài cùng thì lúc nào
 * cũng ra 1, kể cả khi bên trong đã lồng thêm mấy tầng.
 */
function deepest(editor: LexicalEditor): number {
  const walk = (node: LexicalNode, depth: number): number => {
    const here = $isListNode(node) ? depth + 1 : depth
    if (!$isElementNode(node)) return here
    return node.getChildren().reduce((max, child) => Math.max(max, walk(child, here)), here)
  }
  let out = 0
  editor.getEditorState().read(() => {
    out = walk($getRoot(), 0)
  })
  return out
}

describe('Tab trong danh sách', () => {
  it('ở đầu mục thì thụt vào một tầng', () => {
    const editor = makeEditor()
    listWithCaret(editor, 0)
    expect(deepest(editor)).toBe(1)

    const event = tab(editor)

    expect(event.defaultPrevented).toBe(true)
    expect(deepest(editor)).toBe(2)
  })

  it('Shift+Tab thụt vào một tầng, kể cả giữa chữ (chủ site, 2026-10-17)', () => {
    const editor = makeEditor()
    listWithCaret(editor, 2)

    const event = tab(editor, true)

    expect(event.defaultPrevented).toBe(true)
    expect(deepest(editor)).toBe(2)
  })

  it('Shift+Tab không thụt quá ba tầng, và vẫn giữ phím', () => {
    const editor = makeEditor()
    listWithCaret(editor, 0)
    for (let i = 0; i < 4; i++) tab(editor, true)

    expect(deepest(editor)).toBe(3)
    expect(tab(editor, true).defaultPrevented).toBe(true)
  })

  it('Backspace ở đầu mục lồng thì trả về tầng trên, không xoá gì', () => {
    const editor = makeEditor()
    listWithCaret(editor, 0)
    tab(editor, true)
    expect(deepest(editor)).toBe(2)

    const event = backspace(editor)

    expect(event.defaultPrevented).toBe(true)
    expect(deepest(editor)).toBe(1)
    expect(text(editor)).toMatch(/một[\s\S]*hai/)
  })

  it('giữa chữ thì trả phím lại, để còn Tab ra khỏi ô', () => {
    // Nuốt Tab ở mọi vị trí là dựng một cái bẫy focus: vào được ô chữ mà
    // không ra được bằng bàn phím.
    const editor = makeEditor()
    listWithCaret(editor, 2)

    const event = tab(editor)

    expect(event.defaultPrevented).toBe(false)
    expect(deepest(editor)).toBe(1)
  })

  it('ngoài danh sách thì trả phím lại', () => {
    const editor = makeEditor()
    editor.update(
      () => {
        const text = $createTextNode('đoạn văn')
        $getRoot().clear().append($createParagraphNode().append(text))
        text.select(0, 0)
      },
      { discrete: true },
    )

    expect(tab(editor).defaultPrevented).toBe(false)
  })
})

describe('Cmd+K', () => {
  function paragraphWithSelection(editor: LexicalEditor, from: number, to: number) {
    editor.update(
      () => {
        const text = $createTextNode('đọc thêm ở đây')
        $getRoot().clear().append($createParagraphNode().append(text))
        text.select(from, to)
      },
      { discrete: true },
    )
  }

  function textOf(editor: LexicalEditor): string {
    let out = ''
    editor.getEditorState().read(() => {
      out = $getRoot().getTextContent()
    })
    return out
  }

  it('bọc chữ đang chọn thành một cái vỏ link', () => {
    const editor = makeEditor()
    paragraphWithSelection(editor, 9, 14)

    const event = modifier(editor, 'k')

    expect(event.defaultPrevented).toBe(true)
    expect(textOf(editor)).toBe('đọc thêm [ở đây]()')
  })

  it('con trỏ nằm giữa hai ngoặc đơn, chỗ duy nhất còn thiếu', () => {
    const editor = makeEditor()
    paragraphWithSelection(editor, 9, 14)
    modifier(editor, 'k')

    let offset = -1
    editor.getEditorState().read(() => {
      const selection = editor.getEditorState()._selection
      offset = selection && 'anchor' in selection ? selection.anchor.offset : -1
    })
    // `đọc thêm [ở đây](` — ngay trước dấu đóng ngoặc.
    expect(offset).toBe('đọc thêm [ở đây]('.length)
  })

  it('không chọn gì thì vẫn để lại cái vỏ', () => {
    const editor = makeEditor()
    paragraphWithSelection(editor, 14, 14)

    modifier(editor, 'k')

    expect(textOf(editor)).toBe('đọc thêm ở đây[]()')
  })
})

describe('Cmd+\\', () => {
  it('trả vùng chọn về chữ thường', () => {
    const editor = makeEditor()
    editor.update(
      () => {
        const text = $createTextNode('nhấn')
        text.toggleFormat('bold')
        text.toggleFormat('underline')
        $getRoot().clear().append($createParagraphNode().append(text))
        text.select(0, 4)
      },
      { discrete: true },
    )

    const event = modifier(editor, '\\')

    expect(event.defaultPrevented).toBe(true)
    editor.getEditorState().read(() => {
      const node = $getRoot().getAllTextNodes()[0]
      expect(node.hasFormat('bold')).toBe(false)
      expect(node.hasFormat('underline')).toBe(false)
    })
  })
})

describe('hai mép của ô soạn', () => {
  /** Editor riêng, vì hai móc ở mép phải nối lúc đăng ký. */
  function withEdges(edges: Parameters<typeof registerLiveKeys>[1]) {
    const editor = createEditor({
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
      onError: (e: Error) => {
        throw e
      },
    })
    // Cố ý **không** nối `rich-text` ở đây: khi móc ở mép trả `false`, phím rơi
    // xuống bộ xử lý mặc định của nó, và bộ ấy cần một `window` mà jsdom không
    // dựng cho editor rời. Cái cần đo là móc, không phải cái nằm sau nó.
    registerLiveKeys(editor, edges)
    editor.update(
      () => {
        const text = $createTextNode('chữ')
        $getRoot().clear().append($createParagraphNode().append(text))
        text.select(0, 0)
      },
      { discrete: true },
    )
    return editor
  }

  const press = (editor: LexicalEditor, command: typeof KEY_BACKSPACE_COMMAND, key: string) => {
    const event = new KeyboardEvent('keydown', { key, cancelable: true })
    editor.dispatchCommand(command, event)
    editor.update(() => {}, { discrete: true })
    return event
  }

  it('Backspace ở đầu ô nuốt khối đứng trước', () => {
    // Bảng và ảnh nằm ngoài ô soạn; không có móc này thì xoá ngược tới chúng
    // là cụt đường và phải với tay ra chuột.
    let ate = 0
    const editor = withEdges({ onBackspaceAtStart: () => (ate++, true) })

    expect(press(editor, KEY_BACKSPACE_COMMAND, 'Backspace').defaultPrevented).toBe(true)
    expect(ate).toBe(1)
  })

  it('không có gì đứng trước thì trả phím lại cho trình duyệt', () => {
    const editor = withEdges({ onBackspaceAtStart: () => false })

    expect(press(editor, KEY_BACKSPACE_COMMAND, 'Backspace').defaultPrevented).toBe(false)
  })

  it('Delete ở cuối ô nuốt khối đứng sau', () => {
    let ate = 0
    const editor = withEdges({ onDeleteAtEnd: () => (ate++, true) })
    editor.update(
      () => {
        const node = $getRoot().getAllTextNodes()[0]
        node.select(node.getTextContentSize(), node.getTextContentSize())
      },
      { discrete: true },
    )

    expect(press(editor, KEY_DELETE_COMMAND, 'Delete').defaultPrevented).toBe(true)
    expect(ate).toBe(1)
  })

  it('dòng đầu là gạch đầu dòng thì Backspace bỏ dấu, không nuốt khối đứng trước (chủ site, 2026-10-17)', () => {
    let ate = 0
    const editor = withEdges({ onBackspaceAtStart: () => (ate++, true) })
    editor.update(
      () => {
        const item = $createListItemNode()
        $getRoot().clear().append($createListNode('bullet').append(item))
        item.select(0, 0)
      },
      { discrete: true },
    )

    expect(press(editor, KEY_BACKSPACE_COMMAND, 'Backspace').defaultPrevented).toBe(false)
    expect(ate).toBe(0)
  })

  it('giữa chữ thì không nuốt gì cả', () => {
    let ate = 0
    const editor = withEdges({ onBackspaceAtStart: () => (ate++, true) })
    editor.update(
      () => {
        const node = $getRoot().getAllTextNodes()[0]
        node.select(2, 2)
      },
      { discrete: true },
    )

    expect(press(editor, KEY_BACKSPACE_COMMAND, 'Backspace').defaultPrevented).toBe(false)
    expect(ate).toBe(0)
  })
})

describe('lùi lề đoạn văn (long-form)', () => {
  const paragraphAt = (editor: LexicalEditor, offset: number) =>
    editor.update(
      () => {
        const p = $createParagraphNode().append($createTextNode('đoạn'))
        $getRoot().clear().append(p)
        p.getFirstChildOrThrow<ReturnType<typeof $createTextNode>>().select(offset, offset)
      },
      { discrete: true },
    )
  const indent = (editor: LexicalEditor) =>
    editor.getEditorState().read(() => ($getRoot().getFirstChildOrThrow() as unknown as { getIndent: () => number }).getIndent())

  it('Shift+Tab lùi vào, Backspace ở đầu dòng trả về', () => {
    const editor = makeEditor(true)
    paragraphAt(editor, 2)
    tab(editor, true)
    tab(editor, true)
    expect(indent(editor)).toBe(2)

    paragraphAt(editor, 0)
    tab(editor, true)
    expect(indent(editor)).toBe(1)
    expect(backspace(editor).defaultPrevented).toBe(true)
    expect(indent(editor)).toBe(0)
    expect(text(editor)).toBe('đoạn')
  })

  it('khuôn không lưu được lề đoạn thì Shift+Tab không đụng tới đoạn văn', () => {
    const editor = makeEditor()
    paragraphAt(editor, 0)
    expect(tab(editor, true).defaultPrevented).toBe(false)
    expect(indent(editor)).toBe(0)
  })
})
