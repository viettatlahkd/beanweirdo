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
  /** accent color for the left bar and the TOC dot */
  hue: string
  /** filter-bar group this card belongs to, e.g. "hoa" (flower) */
  group: string
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
  /** intro copy lines under the header title (design source shows two) */
  intro: string[]
  cards: CardData[]
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
