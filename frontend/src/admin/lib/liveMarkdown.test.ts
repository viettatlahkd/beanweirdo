/**
 * Chữ đi vào mặt soạn rồi quay ra phải còn nguyên nghĩa.
 *
 * Đây là chỗ một trình soạn ăn mất chữ mà không ai thấy: người viết không làm
 * gì cả, chỉ mở bài ra và click, thế là một dấu đổi nghĩa. Nên mỗi ký hiệu
 * site có đều phải có một dòng ở đây.
 */
import { describe, expect, it } from 'vitest'
import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $createParagraphNode, $createTextNode, $getRoot, createEditor } from 'lexical'
import { SITE_TRANSFORMERS, unescapeSite } from './liveMarkdown'

const NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode]

function editor() {
  return createEditor({
    nodes: NODES,
    onError: (e: Error) => {
      throw e
    },
  })
}

/** Một vòng: markdown vào, mặt soạn dựng lên, rồi ghi ra lại. */
function roundTrip(markdown: string): string {
  const ed = editor()
  let out = ''
  ed.update(() => $convertFromMarkdownString(markdown, SITE_TRANSFORMERS), { discrete: true })
  ed.getEditorState().read(() => {
    out = unescapeSite($convertToMarkdownString(SITE_TRANSFORMERS))
  })
  return out
}

describe('phương ngữ markdown của site trong mặt soạn', () => {
  it('số đo vẫn là số đo, không thành chữ nhấn', () => {
    // `_x_` là gạch chân mảnh của site. Bộ mặc định của Lexical đọc nó là
    // italic rồi ghi ra `*x*`, thứ site đọc lại thành chữ nhấn.
    expect(roundTrip('chữ _số đo_ chữ')).toBe('chữ _số đo_ chữ')
  })

  it('đậm và nghiêng là hai dấu rời nhau, không gộp về một', () => {
    // Trước 2026-09-19 cả ba đều ghi ra `**`: site chỉ có một mức nhấn. Chủ
    // site tách đôi, nên mỗi dấu phải giữ đúng nghĩa của nó qua một vòng.
    expect(roundTrip('chữ *nghiêng* chữ')).toBe('chữ *nghiêng* chữ')
    expect(roundTrip('chữ **đậm** chữ')).toBe('chữ **đậm** chữ')
    expect(roundTrip('chữ ***cả hai*** chữ')).toBe('chữ ***cả hai*** chữ')
  })

  it('`__x__` vẫn là đậm, vì nơi khác viết đậm như vậy', () => {
    expect(roundTrip('chữ __đậm__ chữ')).toBe('chữ **đậm** chữ')
  })

  it('số đo và chữ nhấn chồng nhau thì giữ cả hai', () => {
    expect(roundTrip('chữ **_cả hai_** chữ')).toBe('chữ **_cả hai_** chữ')
  })

  it('gạch dưới giữa chữ không phải là số đo', () => {
    // Không có dòng này thì mọi bài đang chứa một đường dẫn hay một tên biến
    // sẽ đổi hình dạng ngay lần sửa đầu tiên.
    expect(roundTrip('tên_file_dài không phải số đo')).toBe('tên_file_dài không phải số đo')
  })

  it('ký hiệu site không đọc được thì nằm nguyên làm chữ thường', () => {
    expect(roundTrip('không đọc ~~gạch ngang~~ được')).toBe('không đọc ~~gạch ngang~~ được')
  })

  it('link, địa chỉ trần, danh sách, trích dẫn, tiêu đề đều nguyên', () => {
    for (const written of [
      '[chữ](https://vi.du)',
      'https://vi.du/trang',
      '- một\n- hai',
      '1. một\n2. hai',
      '> trích dẫn',
      '# Tiêu đề',
      '## Tiêu đề nhỏ',
      'dòng một\ndòng hai',
    ]) {
      expect(roundTrip(written)).toBe(written)
    }
  })

  it('sửa đi sửa lại không đẻ thêm dấu gạch chéo', () => {
    // Lexical thoát `_` thành `\_` lúc ghi, rồi lần sau thoát nốt dấu `\`.
    // Không gỡ thì mỗi lần mở bài ra là số gạch chéo nhân đôi.
    let text = 'tên_file_dài và **nhấn**'
    for (let i = 0; i < 3; i++) text = roundTrip(text)
    expect(text).toBe('tên_file_dài và **nhấn**')
    expect(text).not.toContain('\\')
  })
})

describe('unescapeSite', () => {
  it('gỡ đúng năm ký tự Lexical thoát, không đụng gì khác', () => {
    expect(unescapeSite('a\\*b\\_c\\`d\\~e\\\\f')).toBe('a*b_c`d~e\\f')
    expect(unescapeSite('a\\nb')).toBe('a\\nb')
  })
})

describe('hai mức nhấn', () => {
  it('chữ nghiêng ở lại nghiêng, không bị đổi thành đậm', () => {
    /*
     * `OneEmphasis` trong `LiveText` từng đổi mọi `italic` thành `bold` ngay
     * tại gốc, vì `italic` không có chỗ ghi ra và sẽ biến mất lúc rời ô. Nay
     * nó có chỗ ghi (`*x*`), nên phép đổi ấy bỏ đi — và đây là bài kiểm rằng
     * nó đã bỏ thật.
     */
    const ed = editor()
    ed.update(
      () => {
        const node = $createTextNode('nghiêng')
        node.toggleFormat('italic')
        $getRoot().clear().append($createParagraphNode().append(node))
      },
      { discrete: true },
    )
    ed.getEditorState().read(() => {
      const node = $getRoot().getAllTextNodes()[0]
      expect(node.hasFormat('italic')).toBe(true)
      expect(node.hasFormat('bold')).toBe(false)
      expect(unescapeSite($convertToMarkdownString(SITE_TRANSFORMERS))).toBe('*nghiêng*')
    })
  })
})
