/**
 * The module page layouts, and everything that differs between them.
 *
 * Adding a fourth used to mean editing seven places: two copies of the union
 * type, a list in the backend, an `if (m.layout === …)` chain on the module
 * page, another on the homepage, a hand-typed `<option>` list in the CMS, a
 * slot count in `lib/modulePageImages`, a names table in `admin/moduleForm` —
 * and a `check` constraint in SQL, which needs a migration on the live
 * database.
 *
 * Nine edits, one of them DDL. So when a fourth layout was genuinely needed,
 * twice, nobody added one: `Notes.tsx` and `Hours.tsx` were written as pages
 * of their own and wired in through a hand-kept id table in
 * `lib/moduleTarget.ts`. Two escapes, no fix.
 *
 * A layout is a row here. What it draws stays with the screens that draw it —
 * a component map keyed by `key`, checked by the compiler for completeness —
 * because a layout's markup belongs with the other markup, not in a data file.
 */

type LayoutSpec = {
  key: string
  /** What the CMS offers in its dropdown. */
  label: string
  /**
   * Names for the photo cells on the module's own page, in order.
   *
   * The count is the length of this list: a layout that draws four cells and
   * names three of them is a layout whose two facts had drifted apart, which
   * is what a separate `pageSlotCount` made possible.
   */
  pageImageNames: readonly string[]
}

export const MODULE_LAYOUTS = [
  {
    key: 'band',
    label: 'band — dải màu, một ảnh hero, mục lục hai cột',
    pageImageNames: ['Ảnh hero'],
  },
  {
    key: 'specimen',
    label: 'specimen — nửa màu nửa khay ảnh, mục lục ba cột',
    // The fourth cell was once a solid colour block rather than a place for a
    // photo, which is why the editor used to offer only three.
    pageImageNames: ['Ảnh lớn', 'Ảnh giữa', 'Ảnh dưới trái', 'Ảnh dưới phải'],
  },
  {
    key: 'sequence',
    label: 'sequence — tiêu đề lớn, dải rang, mục lục hàng số',
    pageImageNames: ['01 — nhân xanh', '02 — vàng', '03 — first crack', '04 — phát triển'],
  },
] as const satisfies readonly LayoutSpec[]

export type ModuleLayout = (typeof MODULE_LAYOUTS)[number]['key']

/** Just the keys — what the database stores, and what the API validates against. */
export const MODULE_LAYOUT_KEYS: readonly ModuleLayout[] = MODULE_LAYOUTS.map((l) => l.key)

/**
 * The row for a layout, falling back to the first one.
 *
 * A module row arrives from the database, so its `layout` is whatever is
 * stored there — including a value written before this list knew about it.
 * Falling back keeps the page drawing rather than blank, which is the same
 * thing `formShapeOf` has always done with `m.layout ?? 'band'`.
 */
export function layoutSpec(key: string): LayoutSpec {
  return MODULE_LAYOUTS.find((l) => l.key === key) ?? MODULE_LAYOUTS[0]
}

/** How many photos this layout's page draws. */
export const pageSlotCountOf = (key: string): number => layoutSpec(key).pageImageNames.length
