/**
 * A memo section, read as elements out of the store.
 *
 * A section used to be four named slots — a conclusion, some bullets, some
 * numbered phases, a table — each with its own shape, none of them writable and
 * none of them reusable anywhere else. They are the store's `callout`, `list`,
 * `list` again with numbering on, and `table`. The same four things, already
 * defined once.
 *
 * Reading is one-way and lossless. A section that has been written since keeps
 * its elements; one written before is converted on the way in, in the order it
 * has always drawn, so a memo published months ago opens looking the same.
 */
import { toElements, type StoredElement } from './elements'
import type { ListItem } from './elements/list'
import type { MemoItem, MemoSection } from './types'

function toListItem(item: MemoItem): ListItem {
  return {
    runs: item.runs,
    ...(item.cont && item.cont.length > 0 ? { sub: item.cont } : null),
    ...(item.children && item.children.length > 0 ? { children: item.children.map(toListItem) } : null),
  }
}

/**
 * The elements of one section, in the order the page has always drawn them.
 *
 * A phase's own number is dropped: numbering is the template's job now, which
 * is why nobody has to keep them in step by hand after moving one.
 */
export function sectionElements(section: MemoSection): StoredElement[] {
  if (Array.isArray(section.elements)) return toElements(section.elements)

  const out: StoredElement[] = []
  if (section.callout) {
    out.push({ type: 'callout', heading: section.callout.h, text: section.callout.lines.join('\n') })
  }
  if (section.items && section.items.length > 0) {
    out.push({ type: 'list', ordered: false, items: section.items.map(toListItem) })
  }
  if (section.phases && section.phases.length > 0) {
    out.push({
      type: 'list',
      ordered: true,
      items: section.phases.map((p) => ({
        runs: [{ t: p.label }],
        ...(p.lines.length > 0 ? { sub: p.lines } : null),
      })),
    })
  }
  if (section.table) {
    out.push({
      type: 'table',
      table: { columns: section.table.head, rows: section.table.rows.map((cells) => ({ cells })) },
    })
  }
  return out
}

/**
 * A section holding elements, whichever way it arrived.
 *
 * Writing always produces `elements`; the old slots are left where they are
 * rather than deleted, so a post half-migrated still reads on an older deploy.
 */
export function withElements(section: MemoSection): MemoSection {
  return { ...section, elements: sectionElements(section) }
}
