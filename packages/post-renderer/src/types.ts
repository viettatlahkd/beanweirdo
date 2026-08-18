/**
 * Content shapes for the site's 3 real post templates.
 *
 * `posts.template` in the database is a fixed enum: 'article' | 'cards' | 'report'.
 * These are structurally distinct layouts, not a color-mix on one shape — each
 * gets its own body-content type below, matching what `posts.body` (jsonb)
 * holds for a post of that template.
 */

export type Template = 'article' | 'cards' | 'report'

// ---------------------------------------------------------------------------
// article — ported 1:1 from frontend/src/screens/Article.tsx
// ---------------------------------------------------------------------------

/** A figure plate beside a section's marginal note (no photo — a tinted swatch). */
export type FigureData = {
  /** small caps label above the note, e.g. "fig-1" */
  label: string
  /** the marginal note text next to the plate */
  note: string
  /** caption printed inside the plate itself */
  caption: string
  w: string
  h: string
  tint: string
  margin: string
  /** optional real photo; when absent the plate renders as a flat `tint` swatch */
  imageUrl?: string | null
}

/** A body section — this shape is the DB's posts.body jsonb shape and is kept unchanged. */
export type SectionData = {
  h: string
  p: string
  fig?: FigureData
}

export type ArticlePlateData = {
  caption: string
  tint: string
  imageUrl?: string | null
}

export type ArticleRelatedItem = {
  label: string
}

export type ArticlePostData = {
  eyebrow: string
  moduleTitle: string
  title: string
  titleItalic?: string
  lead: string
  /** two-plate opener under the hero: a wide primary plate + a shorter secondary plate */
  platePrimary: ArticlePlateData
  plateSecondary: ArticlePlateData
  /** hero plate along the top-right of the color band */
  heroPlate: ArticlePlateData
  sections: SectionData[]
  pull: string
  relatedHeading: string
  related: ArticleRelatedItem[]
  /** small square plate at the foot of the sticky rail */
  detailPlate: ArticlePlateData
  furtherReadingHeading: string
  furtherReading: string[]
}

// ---------------------------------------------------------------------------
// cards — glossary accordion, per the "isCards" section of the design source
// ---------------------------------------------------------------------------

export type CardDetailRow = {
  label: string
  score: string
  note?: string
}

/** One expandable block inside a card's body. */
export type CardPart =
  | { type: 'method'; heading: string; body: string }
  | { type: 'detail'; heading: string; rows: CardDetailRow[] }
  | { type: 'callout'; heading: string; lines: string[] }

export type CardData = {
  /** index label, e.g. "01" */
  n: string
  /** accent color for the left bar and the TOC dot — the first group's hue */
  hue: string
  /**
   * Every flavour group this card belongs to. A note usually sits in several
   * at once — an apple is Other Fruit *and* Green/Vegetative *and* Sour — and
   * the tag bar counts it under each. The card's own colour comes from the
   * first (System conventions, rule 12).
   */
  groups: string[]
  /** the glossary term */
  title: string
  /** short one-line definition shown under the term */
  sub: string
  /** italic tag line, e.g. "hương hoa · sourness" */
  tag: string
  parts: CardPart[]
}

export type CardsPostData = {
  title: string
  /** intro copy lines beside the header title (design source shows two) */
  intro: string[]
  cards: CardData[]
  /**
   * The colour block at the head of the page.
   *
   * A template is a blank; a post is that blank filled in under a module, and
   * it takes the module's colours with it — never the template's own
   * (System conventions, rule 09). Omitted only by the standalone samples
   * under Admin › Templates, which are free to keep their own.
   */
  band?: { bg: string; fg: string }
  /** Group → hue, so the filter bar can colour groups this card set doesn't lead with. */
  groupHues?: Record<string, string>
}

// ---------------------------------------------------------------------------
// report — block sequence, per the "isReport" section of the design source
// ---------------------------------------------------------------------------

export type ReportMetric = {
  label: string
  value: string
}

export type ReportChartPoint = {
  label: string
  /** bar height, 0–100 */
  heightPct: number
}

export type ReportTableRow = {
  cells: string[]
}

export type ReportTable = {
  columns: string[]
  rows: ReportTableRow[]
}

export type ReportBlock =
  | { type: 'meta'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'metrics'; items: ReportMetric[] }
  | { type: 'chart'; points: ReportChartPoint[] }
  | { type: 'table'; table: ReportTable }
  | { type: 'image'; caption: string; imageUrl?: string | null }

export type ReportPostData = {
  title: string
  blurb?: string
  blocks: ReportBlock[]
}

// ---------------------------------------------------------------------------
// longform — the very long translated piece, per the "isLongform" section of
// the design source. Blocks come pre-parsed from a Notion export.
// ---------------------------------------------------------------------------

/** A span of text with its own weight and slant. */
export type LongformRun = {
  t: string
  /** CSS font-weight as a string, e.g. "300" / "600" */
  w?: string
  /** "normal" | "italic" */
  s?: string
}

export type LongformBlockKind =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'p'
  /** a continuation line — same paragraph, tighter and quieter */
  | 'cont'
  | 'li'
  | 'fig'
  | 'note'
  | 'aside'
  | 'formula'
  | 'meta'

export type LongformBlock = {
  k: LongformBlockKind
  runs?: LongformRun[]
  /** li nesting, 1–3 */
  lvl?: number
  /** p/cont indent flag */
  ind?: boolean
  /** fig */
  src?: string
  ar?: string
  /** formula */
  v?: string
  /** aside carries its own blocks */
  items?: LongformBlock[]
}

export type LongformPostData = {
  /** Shown as the opening h1 — the post's title, not the export's. */
  title: string
  /** Italic line under the title; empty on the standalone sample. */
  subtitle?: string
  blocks: LongformBlock[]
}

// ---------------------------------------------------------------------------
// memo — the tasting write-up, per the "isTaste" section of the design source.
// Unlike the other templates this one belongs to Ghi 01, not to a module.
// ---------------------------------------------------------------------------

/** A span inside a memo line; `em` is the design's amber emphasis. */
export type MemoRun = { t: string; em?: boolean }

export type MemoItem = {
  runs: MemoRun[]
  /** Quieter lines hanging under the item — the design's "—" continuations. */
  cont?: string[]
  children?: MemoItem[]
}

/** One numbered stage of the pour. */
export type MemoPhase = { n: string; label: string; lines: string[] }

export type MemoSection = {
  h: string
  items?: MemoItem[]
  phases?: MemoPhase[]
  table?: { head: string[]; rows: string[][] }
}

export type MemoPostData = {
  title: string
  subtitle?: string
  /** The bean / water / pour readings that open the page. */
  specs?: { k: string; v: string }[]
  /** Hero photograph, and what it shows. */
  img?: string | null
  imgCaption?: string
  sections: MemoSection[]
}
