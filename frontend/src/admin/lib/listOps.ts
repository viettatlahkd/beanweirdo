/**
 * Moving, copying and dropping items in a list.
 *
 * Every template keeps its body as a list of something — an article's sections,
 * a card set's cards, a memo's sections, a report's blocks — and the writer
 * wants the same four things from all of them. Doing that four times would mean
 * four chances to get "drop it in at the new index" subtly wrong, in four
 * places nobody would think to compare.
 */

/** Lifts the item out and puts it back in at `to`, rather than swapping a pair. */
export function move<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items as T[]
  const next = [...items]
  const [lifted] = next.splice(from, 1)
  next.splice(to, 0, lifted)
  return next
}

export function insertAt<T>(items: readonly T[], index: number, item: T): T[] {
  const next = [...items]
  next.splice(Math.max(0, Math.min(index, next.length)), 0, item)
  return next
}

/**
 * Removes one item — unless it is the last one and the list is not allowed to
 * empty. A body with nothing in it draws as a blank page, which the writer
 * cannot tell apart from a page that failed to load.
 */
export function removeAt<T>(items: readonly T[], index: number, keepLast = false): T[] {
  if (keepLast && items.length <= 1) return items as T[]
  return items.filter((_, i) => i !== index)
}

/**
 * One level deep, which is what a list of records needs and no more.
 *
 * Spreading blindly would turn a string into an object of numbered characters —
 * a copy that looks right in the array and draws as nothing on the page. Items
 * with their own nested lists pass their own copier instead.
 */
function shallow<T>(item: T): T {
  if (Array.isArray(item)) return [...item] as unknown as T
  if (item !== null && typeof item === 'object') return { ...item }
  return item
}

/** A copy directly beneath the original, so it is found where it was made. */
export function duplicateAt<T>(items: readonly T[], index: number, copy: (item: T) => T = shallow): T[] {
  const source = items[index]
  if (source === undefined) return items as T[]
  return insertAt(items, index + 1, copy(source))
}
