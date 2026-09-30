/**
 * Reading the table of contents as a tree.
 *
 * `modules` used to be a flat list, and every surface that walks the site —
 * breadcrumbs, the sidebar, the CMS site map, the address bar — wrote the
 * depth of two into itself by hand. So a third level was not a hard thing to
 * build, it was a thing with no way of being said.
 *
 * Migration 0025 gives a module a `parent_id`. These functions are the only
 * place that knows how to read it, so nothing above has to count levels: ask
 * for the children, ask for the ancestors, and the answer is as deep as the
 * data is.
 *
 * Everything here is a pure function over an array the caller already has.
 * That is not a style preference — `useModules` loads the whole table in one
 * query for every screen, so walking it in memory costs nothing and spares the
 * schema a `path` or `depth` column that would have to be kept in step with
 * `parent_id` and would one day disagree with it.
 *
 * The input order is the output order: `useModules` returns rows sorted the
 * way the owner arranged them, and re-sorting here would quietly overrule
 * that. A caller wanting a different order sorts before calling.
 */

/**
 * The little a tree walk needs to know about a row.
 *
 * Structural, so `ModuleRow` satisfies it without importing anything, and a
 * test can pass `{ id: 'a', parent_id: null }` instead of building a module.
 */
export type TreeRow = {
  id: string
  /**
   * Absent, not just null, because a row read before migration 0025 has run
   * has no such column at all. Reading it as "no parent" keeps every surface
   * working against a database that has not been migrated yet.
   */
  parent_id?: string | null
}

type TreeNode<T extends TreeRow> = {
  row: T
  children: TreeNode<T>[]
  /** 0 for a top-level entry. */
  depth: number
}

/** A parent id that actually names another row; anything else reads as a root. */
function parentIdOf<T extends TreeRow>(rows: readonly T[], row: T): string | null {
  const parent = row.parent_id
  if (!parent || parent === row.id) return null
  // A parent that is not in the list — filtered out as private, or deleted
  // from under us — would orphan the row and hide it from every surface. A row
  // whose parent is not here is shown at the top rather than not at all.
  return rows.some((r) => r.id === parent) ? parent : null
}

/** The rows with no parent — the first level of the table of contents. */
export const rootsOf = <T extends TreeRow>(rows: readonly T[]): T[] =>
  rows.filter((r) => parentIdOf(rows, r) === null)

/** The rows sitting directly inside `id`, in the order they were given. */
export const childrenOf = <T extends TreeRow>(rows: readonly T[], id: string): T[] =>
  rows.filter((r) => parentIdOf(rows, r) === id)

/** Whether anything sits inside this row. */
export const hasChildren = <T extends TreeRow>(rows: readonly T[], id: string): boolean =>
  rows.some((r) => parentIdOf(rows, r) === id)

/**
 * The walk from the top down to `id`, not including `id` itself.
 *
 * This is what a breadcrumb trail is: ask for it and the trail is as long as
 * the branch is deep, which is the whole point of the column.
 *
 * The step count is bounded by the number of rows. The API refuses to write a
 * cycle, but a walk that trusts that and is wrong hangs the browser, and a
 * hang says nothing about what went wrong.
 */
export function ancestorsOf<T extends TreeRow>(rows: readonly T[], id: string): T[] {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const trail: T[] = []
  const seen = new Set<string>([id])

  let current = byId.get(id)
  while (current) {
    const parent = parentIdOf(rows, current)
    if (!parent || seen.has(parent)) break
    seen.add(parent)
    const row = byId.get(parent)
    if (!row) break
    trail.push(row)
    current = row
  }

  return trail.reverse()
}

/** How far down `id` sits. 0 is a top-level entry. */
export const depthOf = <T extends TreeRow>(rows: readonly T[], id: string): number =>
  ancestorsOf(rows, id).length

/**
 * `id` and everything filed anywhere beneath it.
 *
 * This is the answer to "every post under bean weirdo", which a flat table
 * could not be asked: the caller hands these ids to one `in (…)` on `posts`
 * instead of one query per module.
 */
export function descendantIds<T extends TreeRow>(rows: readonly T[], id: string): string[] {
  const out: string[] = []
  const queue: string[] = [id]
  const seen = new Set<string>()

  while (queue.length > 0) {
    const next = queue.shift() as string
    if (seen.has(next)) continue
    seen.add(next)
    out.push(next)
    for (const child of childrenOf(rows, next)) queue.push(child.id)
  }

  return out
}

/** The whole table of contents, roots first, each node carrying its own depth. */
export function buildTree<T extends TreeRow>(rows: readonly T[]): TreeNode<T>[] {
  const build = (row: T, depth: number, seen: Set<string>): TreeNode<T> => {
    // A cycle would recurse forever; the same bound as `ancestorsOf`, for the
    // same reason.
    const next = new Set(seen).add(row.id)
    return {
      row,
      depth,
      children: childrenOf(rows, row.id)
        .filter((c) => !next.has(c.id))
        .map((c) => build(c, depth + 1, next)),
    }
  }

  return rootsOf(rows).map((r) => build(r, 0, new Set()))
}

/** Every node of the tree, parents before their own children. */
export function flattenTree<T extends TreeRow>(nodes: readonly TreeNode<T>[]): TreeNode<T>[] {
  const out: TreeNode<T>[] = []
  for (const node of nodes) {
    out.push(node)
    out.push(...flattenTree(node.children))
  }
  return out
}

/**
 * Whether `parent` may be given to `child` — the one rule the tree has.
 *
 * A module inside itself, directly or round a longer loop, makes a branch with
 * no top: the trail never reaches the front page and the walk never ends.
 * Checked here so the frontend and the API agree on the answer, and so the
 * refusal can name the reason.
 */
export function canReparent<T extends TreeRow>(
  rows: readonly T[],
  childId: string,
  parentId: string | null,
): { ok: true } | { ok: false; reason: string } {
  if (parentId === null) return { ok: true }
  if (parentId === childId) return { ok: false, reason: 'a module cannot sit inside itself' }
  if (!rows.some((r) => r.id === parentId)) {
    return { ok: false, reason: `no module with id "${parentId}"` }
  }
  if (descendantIds(rows, childId).includes(parentId)) {
    return { ok: false, reason: 'a module cannot sit inside one of its own descendants' }
  }
  return { ok: true }
}

/**
 * Every row that could become `id`'s parent, in the order it was given.
 *
 * The complement of `canReparent`, for the picker in the CMS: rather than
 * offering every module and refusing four of them after the click, offer the
 * ones that would be accepted. Itself and everything already inside it are
 * what drop out — a module cannot be filed inside its own contents.
 */
export function possibleParents<T extends TreeRow>(rows: readonly T[], id: string): T[] {
  const inside = new Set(descendantIds(rows, id))
  return rows.filter((r) => !inside.has(r.id))
}
