/**
 * Thứ tự module, dùng chung cho cả site lẫn khu quản trị.
 *
 * Tách riêng khỏi `data/useModules` vì CMS cần đúng luật này mà không cần kéo
 * theo Supabase client — và vì một luật hai nơi cùng đọc thì phải ở một chỗ.
 */

/** Phần nhỏ nhất của một module mà luật xếp thứ tự cần biết. */
export type Banded = { kind: 'normal' | 'special'; sort_order: number }

/**
 * Normal modules always sort above special ones; inside each band the order is
 * whatever the CMS set. Sorting on `sort_order` alone would let a renumbered
 * reading module fall below the journals.
 *
 * The CMS arranges its drag list by exactly this rule too. It used to list
 * modules on `sort_order` alone, so a journal sat in one place in the editor
 * and another on the site, and dragging it moved a number the page ignored.
 */
export const byBandThenOrder = (a: Banded, b: Banded) => {
  const band = Number(a.kind === 'special') - Number(b.kind === 'special')
  return band !== 0 ? band : a.sort_order - b.sort_order
}
