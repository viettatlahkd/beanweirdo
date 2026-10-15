/**
 * Thứ tự module, dùng chung cho cả site lẫn khu quản trị.
 *
 * Tách riêng khỏi `data/useModules` vì CMS cần đúng luật này mà không cần kéo
 * theo Supabase client — và vì một luật hai nơi cùng đọc thì phải ở một chỗ.
 */

/** Phần nhỏ nhất của một module mà luật xếp thứ tự cần biết. */
type Banded = { kind: 'normal' | 'special'; sort_order: number }

/**
 * Whatever order the CMS set, journals included.
 *
 * This used to put every `special` module below every `normal` one, and the
 * CMS refused a drag that would interleave them. The owner asked on 2026-09-24
 * to drag Ghi 01 up among the reading modules, so the band is gone as a rule.
 * It survives only as the tie-break: two modules sharing a number (data written
 * before any drag renumbered it 1..N) still come out in the old band order
 * rather than whichever the database happened to return first.
 */
export const bySiteOrder = (a: Banded, b: Banded) =>
  a.sort_order - b.sort_order || Number(a.kind === 'special') - Number(b.kind === 'special')
