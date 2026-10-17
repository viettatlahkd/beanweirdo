/**
 * Phương ngữ markdown của site, nói lại cho Lexical nghe.
 *
 * Lexical mang sẵn bộ `TRANSFORMERS` của CommonMark, nơi `_x_` nghĩa là
 * *italic*. Site này đọc `_x_` là **số đo** — một gạch chân mảnh, cố ý không
 * cùng tín hiệu với chữ nhấn (`elements/runs.ts`, `textToRuns`). Hai cách đọc
 * ấy gặp nhau ở `LiveText` và bên thua là người viết:
 *
 *     `chữ _số đo_ chữ`  →  Lexical đọc thành italic  →  ghi ra `*số đo*`
 *                        →  site đọc lại thành chữ nhấn.
 *
 * Mở bài ra, click một cái, rời ô — số đo thành chữ nhấn, vĩnh viễn, không có
 * gì trên màn hình nói rằng vừa mất. Thêm nữa, CommonMark không có ký hiệu cho
 * gạch chân, nên `Cmd+U` gõ xong là rơi mất luôn lúc ghi.
 *
 * Nên bộ dưới đây chỉ giữ đúng những gì site hiểu, và bỏ hẳn những gì nó không
 * hiểu. Bỏ đi thì an toàn hơn giữ lại: một ký hiệu không có transformer nằm
 * nguyên là chữ thường, còn một transformer không có chỗ ghi thì ăn mất chữ.
 */
import {
  CODE,
  HEADING,
  INLINE_CODE,
  LINK,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  UNORDERED_LIST,
  type TextFormatTransformer,
  $convertFromMarkdownString,
  $convertToMarkdownString,
  type ElementTransformer,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown'
import { $getRoot, $isParagraphNode, $isTextNode } from 'lexical'
import { EMPTY_LINE } from 'post-renderer'

/**
 * Nhấn, hai mức rời nhau, đúng ký hiệu markdown chuẩn.
 *
 * Trước 2026-09-19 cả ba dấu `*`, `**`, `__` cùng đổ về `bold`: site chỉ có
 * một mức nhấn, nên `Cmd+B` với `Cmd+I` ra cùng một thứ. Chủ site tách đôi:
 * *"ctrl B là in đậm thôi không in nghiêng, ctrl I là in nghiêng không in
 * đậm"*. Cả hai cùng lúc thì là `***x***`, và phím tắt là bấm cả hai — không
 * có phím thứ ba, y như Notion hay Docs.
 *
 * Tag dài đứng trước tag ngắn: `***` phải thử trước `**` trước `*`, không thì
 * `***x***` đọc thành một dấu sao, `**x**`, rồi một dấu sao nữa.
 */
const EM_TRIPLE_STAR: TextFormatTransformer = {
  format: ['bold', 'italic'],
  tag: '***',
  type: 'text-format',
}
const EM_DOUBLE_STAR: TextFormatTransformer = { format: ['bold'], tag: '**', type: 'text-format' }
const EM_DOUBLE_SCORE: TextFormatTransformer = {
  format: ['bold'],
  intraword: false,
  tag: '__',
  type: 'text-format',
}
const EM_STAR: TextFormatTransformer = { format: ['italic'], tag: '*', type: 'text-format' }

/**
 * Số đo. `intraword: false` để `tên_file_dài` không hoá thành gạch chân —
 * cùng lý do `MARKED` trong `runs.ts` chỉ bắt dấu ở ranh giới chữ.
 */
const DO_SCORE: TextFormatTransformer = {
  format: ['underline'],
  intraword: false,
  tag: '_',
  type: 'text-format',
}

/**
 * Không có tô sáng.
 *
 * `==x==` thì site không có gì để vẽ, nên để nó nằm nguyên làm chữ thường là
 * đúng cái người viết nhìn thấy. Bỏ đi thì an toàn hơn giữ lại: một ký hiệu
 * không có transformer nằm nguyên là chữ thường, còn một transformer không có
 * chỗ ghi thì ăn mất chữ — đúng chuyện đã xảy ra với italic hồi nó chưa có chỗ
 * ghi ra. `` `code` `` và `~~gạch ngang~~` có từ 2026-10-14, khi trang đọc biết
 * vẽ chúng (`elements/codeStrike.ts`).
 */
/**
 * Gõ tắt: chuỗi bên trái thành ký tự bên phải ngay khi gõ xong (chủ site,
 * 2026-10-17: `->` thành `→`). Chỉ chạy lúc gõ: không có `importRegExp` nên
 * chữ cũ đã lưu không bị đổi khi mở lại, không có `export` nên ký tự mới ghi
 * ra như mọi chữ thường. Thêm một cặp vào đây là đủ.
 */
const TYPED: [from: string, to: string][] = [['->', '→']]

const TYPED_REPLACEMENTS: TextMatchTransformer[] = TYPED.map(([from, to]) => ({
  dependencies: [],
  regExp: new RegExp(`${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  trigger: from[from.length - 1],
  replace: (node) => {
    node.setTextContent(to)
  },
  type: 'text-match',
}))

/**
 * One step of a paragraph's indent, at the head of its line. Markdown has no
 * indented paragraph (four spaces make code), so the step is an invisible
 * character (U+2062) that only this editor and long-form read; it never
 * reaches the stored text.
 */
export const INDENT_MARK = '\u2062'

/**
 * Paragraphs Lexical's own export loses.
 *
 * - Empty: written as `EMPTY_LINE` rather than as nothing. Lexical writes one
 *   empty paragraph exactly as it writes none (`"a\n\nb"` both), so the line
 *   was gone before anything downstream saw it.
 * - Indented (`Shift+Tab`): led by one `INDENT_MARK` a step.
 *
 * Export only — reading both back is `$importSite`.
 */
const SITE_PARAGRAPH: ElementTransformer = {
  dependencies: [],
  export: (node, children) => {
    if (!$isParagraphNode(node)) return null
    if (node.isEmpty()) return EMPTY_LINE
    return node.getIndent() > 0 ? INDENT_MARK.repeat(node.getIndent()) + children(node) : null
  },
  regExp: /(?!)/,
  replace: () => false,
  type: 'element',
}

export const SITE_TRANSFORMERS: Transformer[] = [
  SITE_PARAGRAPH,
  HEADING,
  QUOTE,
  UNORDERED_LIST,
  ORDERED_LIST,
  CODE,
  EM_TRIPLE_STAR,
  EM_DOUBLE_STAR,
  EM_DOUBLE_SCORE,
  EM_STAR,
  DO_SCORE,
  INLINE_CODE,
  STRIKETHROUGH,
  LINK,
  ...TYPED_REPLACEMENTS,
]

/** Dấu Lexical thêm vào lúc ghi, và site không có khái niệm ấy. */
const ESCAPED = /\\([*_`~\\])/g

/**
 * Bỏ dấu `\` mà Lexical rắc vào trước mỗi ký tự có nghĩa trong markdown.
 *
 * CommonMark thoát chúng để `tên_file_dài` không hoá thành gạch chân. Site
 * giải cùng bài toán ấy bằng cách khác — `MARKED` trong `runs.ts` chỉ bắt dấu
 * ở ranh giới chữ — nên `tên_file_dài` vốn đã an toàn, và nó không có luật nào
 * để đọc dấu `\`. Để nguyên thì bạn đọc trang sẽ nhìn thấy `tên\_file\_dài`.
 *
 * Tệ hơn là nó lớn dần: lần ghi sau thoát nốt chính dấu `\` vừa thêm, nên mỗi
 * lần mở bài ra sửa là số gạch chéo nhân đôi.
 */
export function unescapeSite(markdown: string): string {
  return markdown.replace(ESCAPED, '$1')
}

/**
 * The open editor as the site's markdown. Each empty line stands alone between
 * blank lines, as every other block does: Lexical sets it off with single
 * newlines (it counts as an empty paragraph), and read back that way the line
 * would join the paragraph above it.
 */
export function $exportSite(): string {
  const out: string[] = []
  let after = false
  for (const line of unescapeSite($convertToMarkdownString(SITE_TRANSFORMERS)).split('\n')) {
    if (line === EMPTY_LINE) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('')
      out.push(line)
      after = true
      continue
    }
    if (after && line !== '') out.push('')
    after = false
    out.push(line)
  }
  return out.join('\n')
}

/** The site's markdown into the open editor: `EMPTY_LINE` as an empty paragraph, `INDENT_MARK`s as its indent. */
export function $importSite(markdown: string): void {
  $convertFromMarkdownString(markdown, SITE_TRANSFORMERS)
  for (const node of $getRoot().getChildren()) {
    if (!$isParagraphNode(node)) continue
    // Cleared only now: Lexical drops empty paragraphs at the end of an import.
    if (node.getTextContent() === EMPTY_LINE) {
      node.clear()
      continue
    }
    const first = node.getFirstDescendant()
    const marks = $isTextNode(first) ? (MARKS.exec(first.getTextContent())?.[0].length ?? 0) : 0
    if (marks === 0 || !$isTextNode(first)) continue
    const rest = first.getTextContent().slice(marks)
    if (rest === '') first.remove()
    else first.setTextContent(rest)
    node.setIndent(Math.min(3, marks))
  }
}

const MARKS = new RegExp(`^${INDENT_MARK}+`)
