import { coverStyle } from './imageFocus'
import type { CSSProperties } from 'react'

/**
 * The photos on a module's own page.
 *
 * These are not the module's photos on the homepage, though they used to be the
 * same three columns. The two surfaces want different pictures — and different
 * numbers of them, which is what finally forced them apart:
 *
 *   band     — 1, a 208-tall hero across the top
 *   specimen — 3, beside the contents
 *   sequence — 4, the roast strip, 01 nhân xanh → 04 phát triển
 *
 * Roasting needs four and the homepage has three columns, so its fourth had
 * nowhere to live. Now `page_img1..4` carries them.
 *
 * Left empty, a slot falls back to the homepage photo of the same number. That
 * keeps the common case — one good photo, both surfaces — a single upload, and
 * it is why adding these columns changed nothing on the site.
 */
export type PageImageFields = {
  layout: string
  img1: string | null
  img2: string | null
  img3: string | null
  shot1: string | null
  shot2: string | null
  shot3: string | null
  page_img1: string | null
  page_img2: string | null
  page_img3: string | null
  page_img4: string | null
  page_shot1: string | null
  page_shot2: string | null
  page_shot3: string | null
  page_shot4: string | null
}

export type PageSlot = 1 | 2 | 3 | 4

/** How many photos this layout's page draws. */
export function pageSlotCount(layout: string): number {
  if (layout === 'sequence') return 4
  // Bốn: ô thứ tư của specimen từng là mảng màu đặc chứ không phải chỗ đặt
  // ảnh, nên khung sửa chỉ mời ba.
  if (layout === 'specimen') return 4
  return 1
}

export function pageSlots(layout: string): PageSlot[] {
  return ([1, 2, 3, 4] as PageSlot[]).slice(0, pageSlotCount(layout))
}

/**
 * The photo for one slot: the page's own, or the homepage's when unset.
 *
 * Ba trạng thái, không phải hai:
 * - có đường dẫn → ảnh của riêng ô này
 * - `null` (chưa đặt gì) → mượn ảnh trang chủ cùng số
 * - chuỗi rỗng → **cố ý để trống**: ô này không mượn nữa
 *
 * Trạng thái thứ ba tồn tại vì chủ site cần bỏ được ảnh mượn mà không phải xoá
 * ảnh trang chủ — hai bề mặt dùng chung một tấm là tiện, nhưng "tiện" không
 * được phép thành "không bỏ ra được".
 */
export function pageImage(m: PageImageFields, slot: PageSlot): string | null {
  const own = m[`page_img${slot}` as const]
  if (own) return own
  if (own === '') return null
  // Slot 4 has no homepage counterpart — the band only ever drew three.
  return slot === 4 ? null : m[`img${slot}` as const]
}

/** True when this slot is showing the homepage's photo rather than its own. */
export function isBorrowed(m: PageImageFields, slot: PageSlot): boolean {
  const own = m[`page_img${slot}` as const]
  // Chuỗi rỗng là đã nói "không mượn", nên không phải đang mượn.
  if (own === '') return false
  return !own && Boolean(slot !== 4 && m[`img${slot}` as const])
}

/**
 * The caption for one slot.
 *
 * It borrows only when the photo does. A slot with its own picture and the
 * homepage's words describes something that is not there — which is exactly
 * what happened the first time roasting's strip was given a photo of its own.
 */
export function pageCaption(m: PageImageFields, slot: PageSlot): string {
  const own = m[`page_shot${slot}` as const]
  if (own) return own
  if (!isBorrowed(m, slot) || slot === 4) return ''
  return m[`shot${slot}` as const] ?? ''
}


/** Fill for a page cell: its photo, or the tint the design draws without one. */
export function pageFill(m: PageImageFields, slot: PageSlot, tint: string): CSSProperties {
  const img = pageImage(m, slot)
  return img ? coverStyle(img) : { background: tint }
}
