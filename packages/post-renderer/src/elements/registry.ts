/**
 * The store: every element a post can be built out of.
 *
 * Until now each template carried its own idea of what a paragraph, a table or
 * a list was. The same table was written three times under three names — once
 * as a report block, once as a card's `detail` rows, once as a memo section's
 * `table` — and adding one element meant editing four files that only one
 * template could see.
 *
 * A template is now a *layout over elements*, not a shape of its own. Adding an
 * element means adding one entry here, and every template can reach it.
 *
 * The shape of an entry is WordPress's, deliberately. Their block registration
 * has had a decade of argument behind it and answers exactly what is needed:
 * `attributes` records the format so it can be looked up, `keywords` is how it
 * is found, `category` is how it is filed for the next layout. Where an element
 * exists in their vocabulary it keeps their name — `paragraph`, `heading`,
 * `list`, `quote`, `table`, `image` — so nobody has to learn a private
 * dictionary. What is ours is ours: `metrics`, `chart`, `notes`, `callout`,
 * `meta`. Their rendering is not borrowed; every template here is a deliberate
 * layout, and a shared block renderer would flatten the thing that makes them
 * worth having.
 */
import type { ReactNode } from 'react'
import type { Palette } from '../palette'

/** WordPress's three content categories; the insert menu groups by these. */
export type ElementCategory = 'text' | 'data' | 'media'

/**
 * One field of an element's stored format.
 *
 * Written down rather than inferred so the format can be looked up — by the
 * insert menu, by a future importer, and by whoever next asks what a block of
 * this kind is allowed to hold.
 */
export type AttributeSpec = {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  /** What it holds, in words. */
  note: string
  optional?: boolean
}

export type ElementRenderOverrides = {
  renderMeta?: (text: string, index: number) => ReactNode
  renderHeading?: (text: string, index: number) => ReactNode
  renderParagraph?: (text: string, index: number) => ReactNode
  renderMetric?: (metric: { label: string; value: string }, index: number, metricIndex: number) => ReactNode
  renderTableCell?: (text: string, index: number, rowIndex: number, colIndex: number) => ReactNode
  renderImageCaption?: (caption: string, index: number) => ReactNode
  /**
   * One line of a list. `path` is the indices from the top — `[1]` is the
   * second item, `[1, 0]` its first child — so an editor can write back to a
   * nested line without the element flattening its own shape to say where.
   */
  renderListLine?: (text: string, path: number[]) => ReactNode
  renderListSub?: (text: string, path: number[], subIndex: number) => ReactNode
  /** Drawn under the last line — where an editor puts "add a line". */
  renderAfterList?: () => ReactNode
}

export type ElementViewProps<A> = {
  attributes: A
  palette: Palette
  /** Where this element sits in its list. */
  index: number
  /**
   * What the surrounding page calls this element in tests. Templates name their
   * own; the element does not assume it is only ever inside a report.
   */
  testId?: string
  /** Lets an editor make a field editable where it sits on the page. */
  render?: ElementRenderOverrides
}

export type ElementDefinition<A = never> = {
  /** The look-up key, and what is stored in `type`. */
  name: string
  title: string
  category: ElementCategory
  description: string
  /** Anything the writer might type looking for it. */
  keywords: string[]
  attributes: Record<string, AttributeSpec>
  /** A fresh one, including its `type` — what the insert menu hands over. */
  blank: () => A
  View: (props: ElementViewProps<A>) => ReactNode
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Map<string, ElementDefinition<any>>()

export function registerElement<A>(definition: ElementDefinition<A>): ElementDefinition<A> {
  store.set(definition.name, definition)
  return definition
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getElement(name: string): ElementDefinition<any> | undefined {
  return store.get(name)
}

/** Everything in the store, in the order it was registered. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function allElements(): ElementDefinition<any>[] {
  return [...store.values()]
}

/**
 * What an insert menu offers, filed by category.
 *
 * `query` matches the title and the keywords, so "gạch đầu dòng" finds `list`
 * without the writer knowing the English name it is stored under.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findElements(query = ''): ElementDefinition<any>[] {
  const q = query.trim().toLowerCase()
  if (!q) return allElements()
  return allElements().filter(
    (e) => e.title.toLowerCase().includes(q) || e.name.includes(q) || e.keywords.some((k) => k.toLowerCase().includes(q)),
  )
}
