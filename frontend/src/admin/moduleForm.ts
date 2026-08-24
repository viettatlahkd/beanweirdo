/**
 * The image columns, described structurally so both shapes of the module row
 * satisfy it — the admin client's `Module` and the public `ModuleRow` are two
 * types over one table, and this editor should not care which it is handed.
 */
export type ModuleImageFields = {
  layout: string
  shot1: string | null
  shot2: string | null
  shot3: string | null
  img1: string | null
  img2: string | null
  img3: string | null
}

/** Just enough to decide a module's form shape. */
export type ModuleIdentity = { id: string; kind: 'normal' | 'special' }

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
  /** Image group, or `null` when the module has no images to edit. */
  images: ImageGroup | null
  /** Ghi 01 only: the F1…F7 cells woven between its posts. */
  featureCells: boolean
}

export type ImageGroup = {
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
  slots: readonly (1 | 2 | 3)[]
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

export type PreviewKind = 'homepage-band' | 'module-header' | 'notes-footer'

/** Homepage gallery: one tall photo, two stacked beside it. Design v4 draws no fourth. */
const HOMEPAGE_IMAGES: ImageGroup = {
  label: 'Ảnh module',
  slots: [1, 2, 3],
  names: ['Ảnh 1', 'Ảnh 2', 'Ảnh 3'],
  preview: ['homepage-band', 'module-header'],
}

/** Ghi 01 closes with two images — a small one, then a larger one. */
const NOTES_FOOTER_IMAGES: ImageGroup = {
  label: 'Ảnh chân trang',
  slots: [1, 2],
  names: ['Ảnh trái', 'Ảnh phải'],
  preview: ['notes-footer'],
}

const NORMAL: ModuleFormShape = {
  featureCells: false,
  concept: true,
  blurb: true,
  longDesc: true,
  layout: true,
  designNotes: true,
  images: HOMEPAGE_IMAGES,
}

/** Ghi 01 — its own page. No card anywhere, so no card copy and no card photos. */
const NOTES: ModuleFormShape = {
  featureCells: true,
  concept: false,
  blurb: false,
  longDesc: false,
  layout: false,
  designNotes: false,
  images: NOTES_FOOTER_IMAGES,
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
  images: null,
}

/** Ghi 01 and Ghi 02 are told apart by id — they are the only special modules. */
export function formShapeOf(m: ModuleIdentity): ModuleFormShape {
  if (m.kind !== 'special') return NORMAL
  return m.id === 'ghi01' ? NOTES : HOURS
}

/**
 * A slot with no photo is not an empty slot — it is a colour box, and it does
 * not count as an image. That is what the public screens already do, and it is
 * why the editor never reflows: the layout keeps its shape, each cell just
 * switches between a photo and its tint.
 */
export function imageCount(m: ModuleImageFields, group: ImageGroup): number {
  return group.slots.filter((s) => m[`img${s}` as const]).length
}
