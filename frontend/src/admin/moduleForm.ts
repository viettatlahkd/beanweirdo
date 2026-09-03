import { pageSlotCount } from '../lib/modulePageImages'

/**
 * The image columns, described structurally so both shapes of the module row
 * satisfy it — the admin client's `Module` and the public `ModuleRow` are two
 * types over one table, and this editor should not care which it is handed.
 */
export type ModuleImageFields = {
  layout: string
  /** The module's own tint, which a cell wears until a photo covers it. */
  tint?: string
  shot1: string | null
  shot2: string | null
  shot3: string | null
  img1: string | null
  img2: string | null
  img3: string | null
  page_img1: string | null
  page_img2: string | null
  page_img3: string | null
  page_img4: string | null
  page_shot1: string | null
  page_shot2: string | null
  page_shot3: string | null
  page_shot4: string | null
}

/** The column a group writes for one slot — the homepage's, or the page's own. */
export function imageColumn(group: Pick<ImageGroup, 'columns'>, slot: number): string {
  return group.columns === 'homepage' ? `img${slot}` : `page_img${slot}`
}

export function captionColumn(group: Pick<ImageGroup, 'columns'>, slot: number): string {
  return group.columns === 'homepage' ? `shot${slot}` : `page_shot${slot}`
}

/** Just enough to decide a module's form shape. */
export type ModuleIdentity = { id: string; kind: 'normal' | 'special'; layout?: string }

/**
 * Which fields the Sửa nội dung editor shows for one module.
 *
 * The editor used to draw the same ten fields for every module, so Ghi 01 —
 * a page, never a card on the homepage — was asked for a concept, a blurb, a
 * treatment and three homepage photos it has no place to put. Every one of
 * those columns is empty in the database for both special modules, because
 * nothing renders them.
 *
 * So the shape is declared, not assumed: a module shows a field when one of
 * its own screens reads that field. Adding a module kind means adding a row
 * here, not editing the editor.
 */
export type ModuleFormShape = {
  /** Presentation copy — only modules that appear as a card need these. */
  concept: boolean
  blurb: boolean
  longDesc: boolean
  /** Layout picker plus the two Design system notes that describe it. */
  layout: boolean
  designNotes: boolean
  /** Image groups, in the order the editor draws them. Empty when a module has none. */
  images: readonly ImageGroup[]
  /** Ghi 01 only: the F1…F7 cells woven between its posts. */
  featureCells: boolean
}

export type ImageGroup = {
  /** Which set of columns this group writes: the homepage's or the page's own. */
  columns: 'homepage' | 'module-page'
  /** Heading over the group. */
  label: string
  /**
   * How many slots, and which `img{n}` / `shot{n}` column each one is.
   *
   * Special modules reuse the same columns for a different picture: on Ghi 01
   * `img1` and `img2` are the two images that close the page, not homepage
   * photos. Nothing else reads those columns for a special module, so this
   * costs no migration.
   */
  slots: readonly (1 | 2 | 3 | 4)[]
  /** Per-slot name shown above each row of the upload list. */
  names: readonly string[]
  /**
   * The layouts these photos land in. More than one, because today the same
   * three images serve both the homepage band and the module page's own
   * header — see ledger D11, which will split them. Until it does, the owner
   * needs to see both crops, since a photo that reads well in a 2.3:1 band can
   * lose its subject entirely in a 16:5 hero.
   */
  preview: readonly PreviewKind[]
}

export type PreviewKind = 'homepage-band' | 'module-page' | 'notes-footer'

/** Homepage gallery: one tall photo, two stacked beside it. Design v4 draws no fourth. */
const HOMEPAGE_IMAGES: ImageGroup = {
  columns: 'homepage',
  label: 'Ảnh ở Trang chủ',
  slots: [1, 2, 3],
  names: ['Ảnh 1', 'Ảnh 2', 'Ảnh 3'],
  preview: ['homepage-band'],
}

/**
 * The module's own page. How many photos it draws is decided by its layout, not
 * by a number picked once: a band page has a single hero, a specimen page three
 * cells, a sequence page the four-stage roast strip. Offering three to all of
 * them left sensory with two slots it could not use and roasting one short.
 */
function modulePageImages(layout: string): ImageGroup {
  const slots = ([1, 2, 3, 4] as const).slice(0, pageSlotCount(layout))
  return {
    columns: 'module-page',
    label: 'Ảnh trên trang module',
    slots,
    names: NAMES_BY_LAYOUT[layout] ?? slots.map((n) => `Ảnh ${n}`),
    preview: ['module-page'],
  }
}

/** The design names these cells; the editor should call them the same thing. */
const NAMES_BY_LAYOUT: Record<string, readonly string[]> = {
  band: ['Ảnh hero'],
  specimen: ['Ảnh lớn', 'Ảnh giữa', 'Ảnh dưới trái', 'Ảnh dưới phải'],
  sequence: ['01 — nhân xanh', '02 — vàng', '03 — first crack', '04 — phát triển'],
}

/** Ghi 01 closes with two images — a small one, then a larger one. */
const NOTES_FOOTER_IMAGES: ImageGroup = {
  columns: 'homepage',
  label: 'Ảnh chân trang',
  slots: [1, 2],
  names: ['Ảnh trái', 'Ảnh phải'],
  preview: ['notes-footer'],
}

function normalShape(layout: string): ModuleFormShape {
  return { ...NORMAL, images: [HOMEPAGE_IMAGES, modulePageImages(layout)] }
}

const NORMAL: ModuleFormShape = {
  featureCells: false,
  concept: true,
  blurb: true,
  longDesc: true,
  layout: true,
  designNotes: true,
  images: [HOMEPAGE_IMAGES],
}

/** Ghi 01 — its own page. No card anywhere, so no card copy and no card photos. */
const NOTES: ModuleFormShape = {
  featureCells: true,
  concept: false,
  blurb: false,
  longDesc: false,
  layout: false,
  designNotes: false,
  images: [NOTES_FOOTER_IMAGES],
}

/**
 * Ghi 02 — `Hours.tsx` reads nothing from the database, so every field here
 * would save a value no screen ever shows. Until the page is wired up, the
 * editor offers only what genuinely applies: the name, the colour, the posts.
 * Ledger row D13.
 */
const HOURS: ModuleFormShape = {
  featureCells: false,
  concept: false,
  blurb: false,
  longDesc: false,
  layout: false,
  designNotes: false,
  images: [],
}

/** Ghi 01 and Ghi 02 are told apart by id — they are the only special modules. */
export function formShapeOf(m: ModuleIdentity): ModuleFormShape {
  if (m.kind !== 'special') return normalShape(m.layout ?? 'band')
  return m.id === 'ghi01' ? NOTES : HOURS
}

/**
 * A slot with no photo is not an empty slot — it is a colour box, and it does
 * not count as an image. That is what the public screens already do, and it is
 * why the editor never reflows: the layout keeps its shape, each cell just
 * switches between a photo and its tint.
 */
export function imageCount(m: ModuleImageFields, group: ImageGroup): number {
  const row = m as unknown as Record<string, unknown>
  return group.slots.filter((s) => row[imageColumn(group, s)]).length
}
