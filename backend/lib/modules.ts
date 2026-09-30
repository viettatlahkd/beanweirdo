// Row/JSON mapping for `modules`.
//
// Schema source of truth: backend/supabase/migrations/0001_initial_schema.sql
// and 0007_site_settings_and_module_images.sql (img1..3).

export type ModuleLayout = 'band' | 'specimen' | 'sequence'

export const MODULE_LAYOUTS: ModuleLayout[] = ['band', 'specimen', 'sequence']

export interface ModuleRow {
  id: string
  title: string
  accent: string
  on_color: string
  tint: string
  tint2: string
  layout: ModuleLayout
  concept: string
  blurb: string
  long_desc: string
  treatment: string
  layout_note: string
  shot1: string
  shot2: string
  shot3: string
  img1: string | null
  img2: string | null
  img3: string | null
  /**
   * Ghi 01's decorative cells — the photos and words for the images that sit
   * between its posts. An array of `{ n, img, t }`; geometry stays in the
   * frontend's `content/notes.ts`. Empty for every other module.
   */
  feature_cells: unknown
  /**
   * Ảnh trên chính trang module — khác với `img1..3`, vốn là ảnh giới thiệu
   * module ở Trang chủ. Số ô dùng tới tuỳ dàn trang: band 1, specimen 3,
   * sequence 4. Rỗng thì trang module lấy theo ảnh Trang chủ.
   */
  page_img1: string | null
  page_img2: string | null
  page_img3: string | null
  page_img4: string | null
  page_shot1: string
  page_shot2: string
  page_shot3: string
  page_shot4: string
  sort_order: number
  /**
   * The module this one sits inside; null at the top level. See migration
   * 0025 — one self-referencing column is what lets the table of contents be
   * a tree instead of a list.
   *
   * Optional because a database that has not run 0025 answers without the
   * column, and the API must keep serving modules either way.
   */
  parent_id?: string | null
  /** 'normal' = reading module; 'special' = a journal you can file under. */
  kind: 'normal' | 'special'
}

interface Module {
  id: string
  title: string
  accent: string
  on_color: string
  tint: string
  tint2: string
  layout: ModuleLayout
  concept: string
  blurb: string
  long_desc: string
  treatment: string
  layout_note: string
  shot1: string
  shot2: string
  shot3: string
  img1: string | null
  img2: string | null
  img3: string | null
  feature_cells: unknown
  /**
   * Ảnh trên chính trang module — khác với `img1..3`, vốn là ảnh giới thiệu
   * module ở Trang chủ. Số ô dùng tới tuỳ dàn trang: band 1, specimen 3,
   * sequence 4. Rỗng thì trang module lấy theo ảnh Trang chủ.
   */
  page_img1: string | null
  page_img2: string | null
  page_img3: string | null
  page_img4: string | null
  page_shot1: string
  page_shot2: string
  page_shot3: string
  page_shot4: string
  sort_order: number
  parent_id: string | null
  kind: 'normal' | 'special'
}

export function toModule(row: ModuleRow): Module {
  return {
    id: row.id,
    title: row.title,
    accent: row.accent,
    on_color: row.on_color,
    tint: row.tint,
    tint2: row.tint2,
    layout: row.layout,
    concept: row.concept,
    blurb: row.blurb,
    long_desc: row.long_desc,
    treatment: row.treatment,
    layout_note: row.layout_note,
    shot1: row.shot1,
    shot2: row.shot2,
    shot3: row.shot3,
    feature_cells: row.feature_cells,
    page_img1: row.page_img1,
    page_img2: row.page_img2,
    page_img3: row.page_img3,
    page_img4: row.page_img4,
    page_shot1: row.page_shot1,
    page_shot2: row.page_shot2,
    page_shot3: row.page_shot3,
    page_shot4: row.page_shot4,

    img1: row.img1,
    img2: row.img2,
    img3: row.img3,
    sort_order: row.sort_order,
    // `?? null` rather than passing it through: a database without the column
    // answers `undefined`, and a client reading `parent_id` should see "no
    // parent", not "field missing".
    parent_id: row.parent_id ?? null,
    kind: row.kind ?? 'normal',
  }
}

/** Body keys the CMS may write, and the column each lands in. */
export const MODULE_PATCHABLE: Array<{ jsonKey: string; column: keyof ModuleRow }> = [
  { jsonKey: 'title', column: 'title' },
  { jsonKey: 'accent', column: 'accent' },
  { jsonKey: 'on_color', column: 'on_color' },
  { jsonKey: 'tint', column: 'tint' },
  { jsonKey: 'tint2', column: 'tint2' },
  { jsonKey: 'layout', column: 'layout' },
  { jsonKey: 'concept', column: 'concept' },
  { jsonKey: 'blurb', column: 'blurb' },
  { jsonKey: 'long_desc', column: 'long_desc' },
  { jsonKey: 'treatment', column: 'treatment' },
  { jsonKey: 'layout_note', column: 'layout_note' },
  { jsonKey: 'shot1', column: 'shot1' },
  { jsonKey: 'shot2', column: 'shot2' },
  { jsonKey: 'shot3', column: 'shot3' },
  { jsonKey: 'img1', column: 'img1' },
  { jsonKey: 'img2', column: 'img2' },
  { jsonKey: 'img3', column: 'img3' },
  { jsonKey: 'feature_cells', column: 'feature_cells' },
  { jsonKey: 'page_img1', column: 'page_img1' },
  { jsonKey: 'page_img2', column: 'page_img2' },
  { jsonKey: 'page_img3', column: 'page_img3' },
  { jsonKey: 'page_img4', column: 'page_img4' },
  { jsonKey: 'page_shot1', column: 'page_shot1' },
  { jsonKey: 'page_shot2', column: 'page_shot2' },
  { jsonKey: 'page_shot3', column: 'page_shot3' },
  { jsonKey: 'page_shot4', column: 'page_shot4' },
  // Moving a module inside another one is an edit like any other — but the one
  // edit with a rule attached, checked by `canReparent` before it is written.
  { jsonKey: 'parent_id', column: 'parent_id' },
]

/**
 * Defaults for a module created from the CMS's "+ module mới". The reader never
 * sees it until it has a post, so the placeholder copy only has to be legible
 * in the editor.
 */
export function newModuleRow(
  id: string,
  sort_order: number,
): Omit<ModuleRow, 'img1' | 'img2' | 'img3' | 'page_img1' | 'page_img2' | 'page_img3' | 'page_img4'> {
  return {
    id,
    title: 'module mới',
    accent: '#6FA8C0',
    on_color: '#0E2C38',
    tint: '#DDEBF0',
    tint2: '#C6DDE5',
    layout: 'band',
    concept: 'chưa đặt',
    blurb: 'Một dòng giới thiệu ngắn.',
    long_desc: '',
    treatment: '',
    layout_note: '',
    feature_cells: [],
    page_shot1: '',
    page_shot2: '',
    page_shot3: '',
    page_shot4: '',

    shot1: 'ảnh chính',
    shot2: 'ảnh phụ',
    shot3: 'ảnh phụ',
    sort_order: sort_order,
    // A new module starts at the top of the table of contents. Filing it
    // inside another one is a second, deliberate step.
    parent_id: null,
    // Created from the CMS means a reading module; the journals are seeded.
    kind: 'normal',
  }
}

/** The little the one tree rule needs to know about a module. */
export type ParentedRow = { id: string; parent_id?: string | null }

/**
 * Everything filed anywhere beneath `id`, including `id` itself.
 *
 * Breadth-first with a seen-set rather than recursion: this exists to *stop*
 * cycles being written, so it must not itself hang on data that already
 * contains one.
 */
function descendantIds(rows: readonly ParentedRow[], id: string): Set<string> {
  const out = new Set<string>()
  const queue = [id]

  while (queue.length > 0) {
    const next = queue.shift() as string
    if (out.has(next)) continue
    out.add(next)
    for (const r of rows) if (r.parent_id && r.parent_id === next) queue.push(r.id)
  }

  return out
}

/**
 * Whether a module may be filed inside another — the only rule the tree has.
 *
 * A module inside itself, directly or round a longer loop, makes a branch with
 * no top: no walk up it ever reaches the front page, and no walk down it ever
 * ends. Nothing in the schema forbids it, because one small rule reads more
 * plainly in code than in a trigger and the refusal here can say which loop it
 * found — the same call migration 0019 made for hour-log sittings.
 *
 * The frontend answers this question too, in `lib/contentTree.ts`, because the
 * CMS should grey the option out rather than let the owner find out by being
 * refused. `moduleTree.contract.test.ts` runs both against the same cases.
 */
export function canReparent(
  rows: readonly ParentedRow[],
  childId: string,
  parentId: string | null,
): { ok: true } | { ok: false; reason: string } {
  if (parentId === null) return { ok: true }
  if (parentId === childId) return { ok: false, reason: 'a module cannot sit inside itself' }
  if (!rows.some((r) => r.id === parentId)) {
    return { ok: false, reason: `no module with id "${parentId}"` }
  }
  if (descendantIds(rows, childId).has(parentId)) {
    return { ok: false, reason: 'a module cannot sit inside one of its own descendants' }
  }
  return { ok: true }
}
