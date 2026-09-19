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
  LINK,
  ORDERED_LIST,
  QUOTE,
  UNORDERED_LIST,
  type TextFormatTransformer,
  type Transformer,
} from '@lexical/markdown'

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
 * Không có gạch ngang, không có tô sáng.
 *
 * `~~x~~` và `==x==` thì site không có gì để vẽ, nên để chúng nằm nguyên làm
 * chữ thường là đúng cái người viết nhìn thấy. Bỏ đi thì an toàn hơn giữ lại:
 * một ký hiệu không có transformer nằm nguyên là chữ thường, còn một
 * transformer không có chỗ ghi thì ăn mất chữ — đúng chuyện đã xảy ra với
 * italic hồi nó chưa có chỗ ghi ra.
 */
export const SITE_TRANSFORMERS: Transformer[] = [
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
  LINK,
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
