

/*
 * Mực của bốn tag đầu tiên — bốn dạng ghi bên design đặt tên từ đầu. Tag chủ
 * site tự thêm sau này không có mặt ở đây; `lib/notesFilter` chọn màu cho chúng
 * từ vườn. Nên bảng này tra bằng chữ bất kỳ, không phải bằng một kiểu đóng.
 */
export const noteColor: Record<string, string> = {
  'quan sát': '#B65A3C',
  video: '#172124',
  'cảm nhận': '#285E5B',
  'liên ngành': '#163F42',
}

/** The wash that reveals behind a hovered title, and backs a media tile. */
export const noteBlock: Record<string, string> = {
  'quan sát': '#E9B79C',
  video: '#8CBAB4',
  'cảm nhận': '#AFC8BC',
  'liên ngành': '#9DBBD4',
}

/**
 * Ghi 01 holds two kinds of thing, and they are not the same kind of thing.
 *
 *   POSTS          are what the owner publishes into the module. They fill
 *                  fixed blocks of eight slots — see `lib/notesBlocks.ts`.
 *   FEATURE CELLS  are the page's decoration — photos and a quotation. They
 *                  are set up with the page, not with any post; each block
 *                  shows at most one photo and the page one quotation, in
 *                  places of their own that no post uses.
 */
export type FeatureCell = {
  /** F1…F7 — this cell's own number, independent of the posts. */
  n: number
  /** The width it was drawn at, as a span of the design's twelve columns. */
  col: string
  kind: 'slot' | 'quote'
  bg: string
  /** The height it was drawn at. With `col`, fixes the photo's proportions. */
  h: string
  t: string
}

/**
 * The page's decoration — photo slots and a quote. The numbers are stored
 * with the owner's photos (`modules.feature_cells`), so F4, once a post
 * tally, stays unused rather than renumbering the cells after it.
 */
export const featureCells: FeatureCell[] = [
  { n: 1, col: 'span 3', kind: 'slot', bg: '#9DBBD4', h: '330px', t: 'ảnh dọc — bàn làm việc, dụng cụ bày ra' },
  { n: 2, col: 'span 3', kind: 'quote', bg: '', h: '', t: 'Ghi lại thì mới thấy mình đã nghĩ gì.' },
  { n: 3, col: 'span 3', kind: 'slot', bg: '#E9B79C', h: '210px', t: 'ảnh vụn — mảnh cắt nhỏ, chèn đè lên bài bên cạnh' },
  { n: 5, col: 'span 4', kind: 'slot', bg: '#AFC8BC', h: '268px', t: 'ảnh cận cảnh — kết cấu, bề mặt, chất liệu' },
  { n: 6, col: 'span 3', kind: 'slot', bg: '#9DBBD4', h: '242px', t: 'ảnh dọc hẹp — một vật thể đơn lẻ' },
  { n: 7, col: 'span 3', kind: 'slot', bg: '#E9B79C', h: '176px', t: 'ảnh vụn — chi tiết nhỏ lặp lại' },
]

/**
 * A slot's width over its height, from the design's own numbers: `col` is a
 * span of the twelve-column grid the page was laid out on at 1128px, `h` a
 * fixed height. The CMS crops each photo to this proportion, so wherever the
 * photo is drawn it has to keep it or the crop lands off-centre.
 */
export function cellRatio(c: Pick<FeatureCell, 'col' | 'h'>): number {
  const span = Number(/span (\d+)/.exec(c.col)?.[1] ?? 3)
  const width = ((1128 - 20 * 11) / 12) * span + 20 * (span - 1)
  const height = Number.parseFloat(c.h) || 240
  return width / height
}

/**
 * What the CMS may change about one feature cell.
 *
 * Only content moves: the photo and the words. Where a cell sits, how tall it
 * is and which tint it wears stay in `featureCells` above, because those are
 * the drawing, not the writing, and the photo's crop is cut to that shape. Stored on `modules.feature_cells` for Ghi 01.
 */
export type FeatureOverride = {
  n: number
  /** Photo for a `slot` cell; a cell without one stays a colour box. */
  img?: string | null
  /** Caption for a `slot`, or the sentence for a `quote`. */
  t?: string
}

/** Design cells with the admin's words and photos folded in. */
export function withOverrides(
  cells: readonly FeatureCell[],
  overrides: readonly FeatureOverride[] | null | undefined,
): (FeatureCell & { img?: string | null })[] {
  if (!overrides?.length) return cells.map((c) => ({ ...c }))
  return cells.map((c) => {
    const o = overrides.find((x) => x.n === c.n)
    if (!o) return { ...c }
    return { ...c, t: o.t ?? c.t, img: o.img ?? null }
  })
}


/**
 * One cell's override replaced, the rest kept, sorted by `n`.
 *
 * Two screens write into the same `feature_cells` array — the Ghi 01 module
 * form and the page's own section under Cấu hình — so the merge lives here
 * rather than being re-spelled in each.
 */
export function patchOverride(
  overrides: readonly FeatureOverride[] | null | undefined,
  n: number,
  patch: Partial<FeatureOverride>,
): FeatureOverride[] {
  const list = overrides ?? []
  const current = list.find((o) => o.n === n) ?? { n }
  return [...list.filter((o) => o.n !== n), { ...current, ...patch, n }].sort((a, b) => a.n - b.n)
}

/** The page's one quotation cell — the line the owner calls the page's pin. */
export const QUOTE_CELL = featureCells.find((c) => c.kind === 'quote')!
