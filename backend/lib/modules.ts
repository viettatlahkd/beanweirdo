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
  sort_order: number
  /** 'normal' = reading module; 'special' = a journal you can file under. */
  kind: 'normal' | 'special'
}

export interface Module {
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
  sort_order: number
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
    img1: row.img1,
    img2: row.img2,
    img3: row.img3,
    sort_order: row.sort_order,
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
]

/**
 * Defaults for a module created from the CMS's "+ module mới". The reader never
 * sees it until it has a post, so the placeholder copy only has to be legible
 * in the editor.
 */
export function newModuleRow(id: string, sort_order: number): Omit<ModuleRow, 'img1' | 'img2' | 'img3'> {
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
    shot1: 'ảnh chính',
    shot2: 'ảnh phụ',
    shot3: 'ảnh phụ',
    sort_order: sort_order,
    // Created from the CMS means a reading module; the journals are seeded.
    kind: 'normal',
  }
}
