import type { LogEntry } from '../content/hours'
import { toMin } from './hoursStats'

/**
 * One line of a day: either an ordinary activity, or an activity that was
 * returned to more than once.
 */
export type ActivityGroup = {
  /** The row that carries the name and both tags. */
  row: LogEntry
  /** Its sittings, earliest first. Empty on an ordinary activity. */
  children: LogEntry[]
  /** Total time: the sum of the sittings, or the row's own when it has none. */
  mins: number
  /** Minutes past midnight of the earliest sitting — what the day sorts on. */
  earliest: number
  /** Whether this reads as a group: a heading with sittings under it. */
  grouped: boolean
}

/**
 * A day's activities, grouped and ordered.
 *
 * Two rules decide the order, and the second one is the reason the first is
 * safe. Activities with several sittings come first, ahead of everything else
 * whatever the clock says: an activity worth returning to three times is the
 * day's real work, and burying it between two half-hour rows because it began
 * later would be reading the day by timestamp rather than by weight. Among
 * themselves they go by their earliest sitting, and the ordinary rows below
 * keep the plain chronological order they have always had.
 *
 * A consequence worth knowing: the clock column no longer climbs steadily from
 * top to bottom. That is the trade — importance over sequence — not a sorting
 * bug.
 *
 * A child whose parent is missing from `rows` is treated as an ordinary row,
 * so a filtered view can never make an activity disappear.
 */
export function groupActivities(rows: LogEntry[]): ActivityGroup[] {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const kids = new Map<string, LogEntry[]>()

  for (const r of rows) {
    const pid = r.parentId
    if (!pid || !byId.has(pid)) continue
    const list = kids.get(pid)
    if (list) list.push(r)
    else kids.set(pid, [r])
  }

  const groups: ActivityGroup[] = []
  for (const r of rows) {
    const pid = r.parentId
    if (pid && byId.has(pid)) continue // drawn under its parent instead

    const children = (kids.get(r.id) ?? [])
      .slice()
      .sort((a, b) => toMin(a.at) - toMin(b.at) || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
    groups.push({
      row: r,
      children,
      // The sum of the sittings, never the row's stored `mins` — an edit to a
      // sitting has to move the total the same moment it lands.
      mins: children.length ? children.reduce((a, c) => a + c.mins, 0) : r.mins,
      earliest: children.length ? toMin(children[0].at) : toMin(r.at),
      grouped: children.length > 0,
    })
  }

  return groups.sort((a, b) => {
    if (a.grouped !== b.grouped) return a.grouped ? -1 : 1
    return (
      a.earliest - b.earliest ||
      (a.row.createdAt ?? '').localeCompare(b.row.createdAt ?? '')
    )
  })
}

/**
 * The rows a total may add up: the sittings, and everything that has none.
 *
 * A heading is dropped rather than its sittings, which is the opposite of what
 * it looks like it should be. The alternative — keep the heading, drop the
 * sittings — needs the heading's own `mins` to stay equal to the sum of its
 * sittings, and that equality has to be maintained on every add, edit and
 * delete. Miss one and the day's total quietly disagrees with the number
 * printed on the row itself.
 *
 * Adding up the sittings instead needs nothing kept in step: the minutes are
 * only ever written down once, in the row that actually holds them.
 */
export function countable(logs: LogEntry[]): LogEntry[] {
  const headings = new Set(logs.map((l) => l.parentId).filter(Boolean))
  return logs.filter((l) => !headings.has(l.id))
}

/**
 * The activity above this one that it could be folded into, or null.
 *
 * "Could" is strict on purpose: same day, same name, same project, same kind.
 * Two rows called `đọc paper` in one afternoon are quite possibly two different
 * papers, so the offer only appears when every label the owner chose already
 * matches — at which point folding them is describing what is there, not
 * guessing at it.
 *
 * The target is the nearest match *above*, in the order the day is drawn, so
 * the button can honestly say "gộp vào hàng trên". A row that is already a
 * sitting has nothing to fold — nesting stops at one level.
 */
export function mergeTargetFor(groups: ActivityGroup[], index: number): ActivityGroup | null {
  const here = groups[index]
  if (!here || here.row.parentId) return null

  for (let i = index - 1; i >= 0; i--) {
    const above = groups[i]
    if (
      above.row.name &&
      above.row.name === here.row.name &&
      (above.row.project ?? null) === (here.row.project ?? null) &&
      above.row.kind === here.row.kind
    ) {
      return above
    }
  }
  return null
}
