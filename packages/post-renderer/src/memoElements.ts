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
 * A memo's whole body as one flat run of elements.
 *
 * A section used to be a container with the heading as one of its properties,
 * which made the heading un-draggable on its own: taking hold of it took hold
 * of everything filed under it, and there was no way to say otherwise. That
 * container was a leftover of the old storage, not a decision.
 *
 * Flat, a heading is an element like any other — its own handle, moved on its
 * own, and every element in the post obeys one rule instead of two. Wanting to
 * move a heading *together with* what follows it is a real wish, but it is a
 * thing the writer should say out loud with a `group` element, not something
 * the system decides for them by wrapping everything.
 */
export function flatElements(post: { sections?: MemoSection[]; elements?: unknown[] }): StoredElement[] {
  if (Array.isArray(post.elements)) return toElements(post.elements)
  return (post.sections ?? []).flatMap((section) => [
    ...(section.h ? [{ type: 'heading', text: section.h, level: 2 } as StoredElement] : []),
    ...sectionElements(section),
  ])
}
