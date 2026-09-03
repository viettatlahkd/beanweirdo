/**
 * Định dạng trong một dòng long-form, và cách nó sống sót qua một ô nhập thường.
 *
 * Cùng một bài toán như `elements/runs.ts` của memo, khác bộ dấu: long-form ghi
 * độ đậm (`w`) và độ nghiêng (`s`) chứ không ghi nhấn/gạch chân. Bài đã xuất
 * bản có 572 span, trong đó 77 span đậm và 171 span nghiêng — san dòng thành
 * chuỗi trơn để sửa là xoá sạch chỗ đó, và xoá không kêu một tiếng.
 *
 * Nên ô nhập hiện `chữ *đậm* chữ _nghiêng_`, đi và về không mất gì.
 *
 * Dấu lẻ được để lại làm một ký tự thường: bài đang có ba chỗ viết `FD*`, và
 * chúng phải đọc ra đúng `FD*`.
 */

import type { LongformRun } from './types'

const BOLD = '600'
const PLAIN = '300'

/** Runs thành một dòng chữ. */
export function runsToText(runs: LongformRun[] | undefined): string {
  return (runs ?? [])
    .map((r) => {
      let t = r.t
      if (r.s === 'italic') t = `_${t}_`
      if (r.w === BOLD) t = `*${t}*`
      return t
    })
    .join('')
}

/**
 * Một dòng chữ về lại runs.
 *
 * `w` và `s` luôn được ghi ra, kể cả giá trị thường — dữ liệu trong kho đang
 * như vậy ở cả 572 span, và một nửa ghi một nửa không thì khó đọc hơn là dài.
 */
export function textToRuns(text: string): LongformRun[] {
  const out: LongformRun[] = []
  const marked = (part: string): LongformRun | null => {
    let t = part
    let bold = false
    let italic = false
    if (t.length > 2 && t.startsWith('*') && t.endsWith('*')) {
      bold = true
      t = t.slice(1, -1)
    }
    if (t.length > 2 && t.startsWith('_') && t.endsWith('_')) {
      italic = true
      t = t.slice(1, -1)
    }
    if (!bold && !italic) return null
    return { t, w: bold ? BOLD : PLAIN, s: italic ? 'italic' : 'normal' }
  }

  for (const part of text.split(/(\*[^*]+\*|_[^_]+_)/g)) {
    if (!part) continue
    const run = marked(part)
    if (run) {
      out.push(run)
      continue
    }
    // Chữ thường nhập vào chữ thường đứng trước nó, để một dấu lẻ chỉ là một
    // ký tự giữa câu thay vì cắt dòng làm hai.
    const last = out[out.length - 1]
    if (last && last.w === PLAIN && last.s === 'normal') out[out.length - 1] = { ...last, t: last.t + part }
    else out.push({ t: part, w: PLAIN, s: 'normal' })
  }
  return out.length > 0 ? out : [{ t: '', w: PLAIN, s: 'normal' }]
}
