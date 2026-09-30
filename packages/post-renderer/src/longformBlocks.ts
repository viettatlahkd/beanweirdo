/**
 * Bậc lùi lề của long-form, và cái kết của khối `cont`.
 *
 * Trang từng có hai loại đoạn văn: `p`, và `cont` — "dòng tiếp", vẽ nhỏ hơn
 * nửa cỡ chữ và nhạt hơn một tông. Bài đã xuất bản có 159 khối `cont`; đếm lại
 * thì **cả 159** đều mở đầu bằng một dấu người viết tự gõ vào câu (145 dấu `—`,
 * 11 mũi tên `→`, 3 dòng đánh số). Không khối nào là câu viết tiếp thật.
 *
 * Chủ site chốt: `cont` chỉ là một đoạn văn được lùi lề vào trong. Nên nó
 * không còn là một loại khối; nó về `p` mang theo một bậc lùi.
 *
 * Dữ liệu cũ nằm trong kho không sửa được bằng một lần chạy — bài chỉ ghi lại
 * khi chủ site sửa nó. Vì vậy chỗ này nhận cả hai dạng và luôn trả ra dạng mới:
 * cửa duy nhất mà cả trang công khai và CMS đều đi qua.
 */

import { runsToText, textToRuns } from './longformText'
import type { LongformBlock, LongformRun } from './types'

/** Số bậc lùi sâu nhất. Bậc 4 thì lề đã ăn hết bề rộng cột chữ. */
export const MAX_INDENT = 3

/** Bậc lùi của một khối, nhận cả `ind: true` của dữ liệu cũ. */
export function indentOf(b: { ind?: number | boolean }): number {
  if (b.ind === true) return 1
  if (typeof b.ind !== 'number') return 0
  return Math.max(0, Math.min(MAX_INDENT, Math.round(b.ind)))
}

/** Khối đã lùi thêm/bớt một bậc, hoặc chính nó nếu đã ở đầu/cuối. */
export function stepIndent(b: LongformBlock, by: 1 | -1): LongformBlock {
  const next = indentOf(b) + by
  if (next < 0 || next > MAX_INDENT) return b
  // Không giữ `ind: 0` lại trong dữ liệu — không lùi là mặc định, không phải
  // một trạng thái phải ghi ra.
  if (next === 0) {
    const { ind: _drop, ...rest } = b
    return rest
  }
  return { ...b, ind: next }
}

/**
 * Một danh sách khối ở dạng mới: `cont` thành `p` có bậc lùi, cờ đúng/sai
 * thành số, và `aside` được xử lý y như thế bên trong nó.
 */
export function normalizeBlocks(blocks: readonly LongformBlock[] | undefined): LongformBlock[] {
  return (blocks ?? []).map((b) => {
    // Khối lấy từ kho không có `k` và không có `ind` — để nguyên, đừng nắn nó
    // theo từ vựng của long-form.
    if ((b as { k?: string }).k === undefined) return b as LongformBlock
    const legacy = (b as { k: string }).k === 'cont'
    // `cont` luôn được vẽ lùi vào, kể cả khi không mang cờ nào — bậc của nó là
    // một, chứ không phải không.
    const step = legacy ? Math.max(1, indentOf(b)) : indentOf(b)
    const out: LongformBlock = {
      ...b,
      ...(legacy ? { k: 'p' as const } : null),
      ...(step > 0 ? { ind: step } : null),
    }
    if (step === 0) delete out.ind
    if (out.items) out.items = normalizeBlocks(out.items)
    if (TEXT_KINDS.has(out.k) && out.runs) out.runs = readMarks(out.runs)
    if (out.k === 'p' && !out.quote) liftQuote(out)
    return out
  })
}

const TEXT_KINDS = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4'])

const plainOf = (runs: readonly LongformRun[]) => runs.map((r) => r.t).join('')

/**
 * Dấu sao bị lưu thành chữ thì đọc lại chúng.
 *
 * Trước 2026-09-24 long-form đọc `**x**` của mặt soạn thành một dấu sao lẻ,
 * chữ đậm, rồi một dấu sao lẻ nữa — và **lưu nguyên như thế**. Mở bài ra sửa
 * thì mặt soạn ghép lại thành `***x***` và vẽ đúng, nhưng trang đăng vẽ thẳng
 * từ runs nên hiện nguyên dấu. Đọc lại ở đây là để trang và mặt soạn thấy cùng
 * một thứ, không đợi chủ site mở từng bài ra lưu lại.
 *
 * Chỉ nhận kết quả khi nó thật sự ăn mất dấu: dòng không có cặp dấu nào (kể cả
 * `FD*` lẻ) giữ nguyên runs gốc, cùng mọi độ đậm lạ mà bản xuất Notion mang.
 */
function readMarks(runs: LongformRun[]): LongformRun[] {
  if (!runs.some((r) => /[*_]/.test(r.t))) return runs
  const read = textToRuns(runsToText(runs))
  return plainOf(read) === plainOf(runs) ? runs : read
}

/** `> ` lưu thành chữ ở đầu đoạn — cùng một lỗi, với dấu trích dẫn. */
function liftQuote(b: LongformBlock) {
  const runs = b.runs ?? []
  const head = /^>\s?/.exec(runs[0]?.t ?? '')
  if (!head) return
  b.quote = true
  const first = { ...runs[0], t: runs[0].t.slice(head[0].length) }
  b.runs = first.t === '' && runs.length > 1 ? runs.slice(1) : [first, ...runs.slice(1)]
}
