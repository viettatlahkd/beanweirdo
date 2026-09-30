/**
 * Định dạng trong một dòng long-form, và cách nó sống sót qua một ô nhập thường.
 *
 * Cùng một bài toán như `elements/runs.ts` của memo, khác cách lưu: long-form
 * ghi độ đậm (`w`) và độ nghiêng (`s`) chứ không ghi nhấn/gạch chân. Bài đã
 * xuất bản có 572 span, trong đó 77 span đậm và 171 span nghiêng — san dòng
 * thành chuỗi trơn để sửa là xoá sạch chỗ đó, và xoá không kêu một tiếng.
 *
 * Ký hiệu là markdown chuẩn, **đúng bộ mặt soạn dùng** (`liveMarkdown.ts`):
 * `*nghiêng*`, `**đậm**`, `***cả hai***`. Trước 2026-09-24 chỗ này có bộ riêng
 * — `*đậm*`, `_nghiêng_` — trong khi mặt soạn đọc `*x*` là nghiêng và `_x_` là
 * số đo. Hai bên đọc ngược nhau: chữ đậm mở ra thành nghiêng, `Cmd+B` ghi ra
 * `**x**` thì long-form đọc thành một dấu sao lẻ, chữ đậm, rồi một dấu sao lẻ
 * nữa — hiện nguyên `*` trên trang.
 *
 * Dấu lẻ được để lại làm một ký tự thường: bài đang có ba chỗ viết `FD*`, và
 * chúng phải đọc ra đúng `FD*`.
 */

import { parseStars, writeStars } from './elements/stars'
import type { LongformRun } from './types'

const BOLD = '600'
const PLAIN = '300'

/** Runs thành một dòng chữ. */
export function runsToText(runs: LongformRun[] | undefined): string {
  return writeStars((runs ?? []).map((r) => ({ t: r.t, b: r.w === BOLD, i: r.s === 'italic' })))
}

/**
 * `_x_` và `__x__` là cách viết thứ hai của CommonMark: dán từ nơi khác vào
 * thì vẫn ra nghiêng và đậm. Chỉ bắt ở ranh giới chữ để `tên_file_dài` nằm yên.
 */
const SCORED = /((?<![\p{L}\p{N}])__[^_\n]+__(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])_[^_\n]+_(?![\p{L}\p{N}]))/u

/**
 * Một dòng chữ về lại runs.
 *
 * `w` và `s` luôn được ghi ra, kể cả giá trị thường — dữ liệu trong kho đang
 * như vậy ở cả 572 span, và một nửa ghi một nửa không thì khó đọc hơn là dài.
 */
export function textToRuns(text: string): LongformRun[] {
  const out: LongformRun[] = []
  const push = (t: string, bold: boolean, italic: boolean) => {
    if (!t) return
    const run = { t, w: bold ? BOLD : PLAIN, s: italic ? 'italic' : 'normal' }
    // Đoạn liền nhau cùng định dạng nhập làm một, để một dấu lẻ chỉ là một ký
    // tự giữa câu thay vì cắt dòng làm hai.
    const last = out[out.length - 1]
    if (last && last.w === run.w && last.s === run.s) out[out.length - 1] = { ...last, t: last.t + t }
    else out.push(run)
  }

  for (const seg of parseStars(text)) {
    for (const part of seg.t.split(new RegExp(SCORED.source, 'gu'))) {
      if (part.length > 4 && part.startsWith('__') && part.endsWith('__')) push(part.slice(2, -2), true, seg.i)
      else if (part.length > 2 && part.startsWith('_') && part.endsWith('_')) push(part.slice(1, -1), seg.b, true)
      else push(part, seg.b, seg.i)
    }
  }
  return out.length > 0 ? out : [{ t: '', w: PLAIN, s: 'normal' }]
}
