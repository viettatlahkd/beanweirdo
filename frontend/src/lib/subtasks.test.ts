import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../content/hours'
import { countable, groupActivities, mergeTargetFor } from './subtasks'

let seq = 0
const log = (over: Partial<LogEntry> = {}): LogEntry => ({
  id: `log-${++seq}`,
  date: '2026-08-22',
  name: 'việc',
  kind: 'thực hành',
  project: null,
  mins: 30,
  at: '09:00',
  done: true,
  ...over,
})

describe('groupActivities — một hoạt động nhiều lần', () => {
  it('leaves an ordinary day exactly as it was', () => {
    const a = log({ id: 'a', at: '12:55' })
    const b = log({ id: 'b', at: '09:10' })

    const out = groupActivities([a, b])
    expect(out.map((g) => g.row.id)).toEqual(['b', 'a'])
    expect(out.every((g) => !g.grouped)).toBe(true)
    expect(out.every((g) => g.children.length === 0)).toBe(true)
  })

  it('draws a sitting under its parent, never as a row of its own', () => {
    const p = log({ id: 'p', name: 'web code', mins: 260, at: '13:42' })
    const c1 = log({ id: 'c1', parentId: 'p', mins: 180, at: '13:42' })
    const c2 = log({ id: 'c2', parentId: 'p', mins: 80, at: '23:10' })

    const out = groupActivities([p, c1, c2])
    expect(out).toHaveLength(1)
    expect(out[0].children.map((c) => c.id)).toEqual(['c1', 'c2'])
  })

  it('totals the sittings rather than trusting the parent row', () => {
    const p = log({ id: 'p', mins: 999 }) // stale on purpose
    const out = groupActivities([p, log({ parentId: 'p', mins: 180 }), log({ parentId: 'p', mins: 80 })])

    // An edit to a sitting has to move the total the same moment it lands.
    expect(out[0].mins).toBe(260)
  })

  it('puts activities with several sittings above everything else', () => {
    const early = log({ id: 'early', at: '09:10' })
    const p = log({ id: 'p', at: '14:00' })
    const c = log({ id: 'c', parentId: 'p', at: '14:00' })

    const out = groupActivities([early, p, c])
    // The clock says `early` comes first; the day's real work does not.
    expect(out.map((g) => g.row.id)).toEqual(['p', 'early'])
  })

  it('orders the groups by their earliest sitting', () => {
    const p1 = log({ id: 'p1', at: '15:00' })
    const p2 = log({ id: 'p2', at: '07:00' })
    const groups = [
      p1,
      log({ parentId: 'p1', at: '15:00' }),
      log({ parentId: 'p1', at: '22:00' }),
      p2,
      log({ parentId: 'p2', at: '09:00' }),
      log({ parentId: 'p2', at: '11:00' }),
    ]

    expect(groupActivities(groups).map((g) => g.row.id)).toEqual(['p2', 'p1'])
  })

  it('keeps the plain rows in clock order below the groups', () => {
    const p = log({ id: 'p', at: '20:00' })
    const out = groupActivities([
      log({ id: 'late', at: '18:00' }),
      log({ id: 'noon', at: '12:00' }),
      p,
      log({ parentId: 'p', at: '20:00' }),
      log({ parentId: 'p', at: '21:00' }),
    ])

    expect(out.map((g) => g.row.id)).toEqual(['p', 'noon', 'late'])
  })

  it('sorts the sittings inside a group by their own clock', () => {
    const p = log({ id: 'p' })
    const out = groupActivities([
      p,
      log({ id: 'evening', parentId: 'p', at: '23:10' }),
      log({ id: 'afternoon', parentId: 'p', at: '13:42' }),
    ])

    expect(out[0].children.map((c) => c.id)).toEqual(['afternoon', 'evening'])
    expect(out[0].earliest).toBe(13 * 60 + 42)
  })

  it('shows a sitting as an ordinary row when its parent is not here', () => {
    // A tag filter can hide the parent. Better a row out of its group than an
    // activity that vanished from the day.
    const orphan = log({ id: 'orphan', parentId: 'gone', at: '10:00' })

    const out = groupActivities([orphan])
    expect(out.map((g) => g.row.id)).toEqual(['orphan'])
    expect(out[0].grouped).toBe(false)
  })

  it('does not treat a parent with one sitting left as a group', () => {
    const p = log({ id: 'p', at: '08:00' })
    const out = groupActivities([p, log({ parentId: 'p', at: '08:00', mins: 45 })])

    // One sitting is still a group — it has a child. The flat case is a row
    // with no children at all.
    expect(out[0].grouped).toBe(true)
    expect(out[0].mins).toBe(45)
  })
})

describe('countable — cái gì được cộng vào tổng', () => {
  it('adds up the sittings and drops the heading above them', () => {
    const rows = [log({ id: 'p', mins: 260 }), log({ parentId: 'p', mins: 180 }), log({ parentId: 'p', mins: 80 })]

    // Counting all three would report 520 minutes for a 260-minute afternoon.
    expect(countable(rows).map((l) => l.mins)).toEqual([180, 80])
  })

  it('ignores what the heading happens to have stored', () => {
    // The heading's own `mins` is whatever it was before the sittings existed.
    // Nothing keeps it in step, and nothing has to: the minutes are only ever
    // written down once, in the rows that actually hold them.
    const rows = [log({ id: 'p', mins: 30 }), log({ parentId: 'p', mins: 90 }), log({ parentId: 'p', mins: 45 })]

    expect(countable(rows).reduce((a, l) => a + l.mins, 0)).toBe(135)
  })

  it('leaves a day without any sittings untouched', () => {
    const rows = [log(), log(), log()]
    expect(countable(rows)).toHaveLength(3)
  })
})

describe('mergeTargetFor — gộp vào hàng trên', () => {
  const day = (rows: LogEntry[]) => groupActivities(rows)

  it('offers the row above when name and both tags match', () => {
    const rows = [
      log({ id: 'a', name: 'web code', kind: 'thực hành', project: 'Work', at: '09:00' }),
      log({ id: 'b', name: 'web code', kind: 'thực hành', project: 'Work', at: '14:00' }),
    ]
    const groups = day(rows)

    expect(mergeTargetFor(groups, 1)?.row.id).toBe('a')
    // Nothing above the first row to fold into.
    expect(mergeTargetFor(groups, 0)).toBeNull()
  })

  it('stays quiet when the tags differ', () => {
    // Two rows called "đọc paper" in one afternoon are quite possibly two
    // different papers. Only fold when every label already agrees.
    const groups = day([
      log({ id: 'a', name: 'đọc paper', kind: 'đọc', project: 'Sao đâu', at: '09:00' }),
      log({ id: 'b', name: 'đọc paper', kind: 'đọc', project: 'Cà củng', at: '14:00' }),
    ])

    expect(mergeTargetFor(groups, 1)).toBeNull()
  })

  it('stays quiet when only the name differs', () => {
    const groups = day([
      log({ id: 'a', name: 'web code', kind: 'thực hành', at: '09:00' }),
      log({ id: 'b', name: 'web design', kind: 'thực hành', at: '14:00' }),
    ])

    expect(mergeTargetFor(groups, 1)).toBeNull()
  })

  it('never offers to fold an unnamed row', () => {
    const groups = day([log({ id: 'a', name: '', at: '09:00' }), log({ id: 'b', name: '', at: '14:00' })])
    expect(mergeTargetFor(groups, 1)).toBeNull()
  })

  it('folds into a group that already has sittings', () => {
    const rows = [
      log({ id: 'p', name: 'web code', kind: 'thực hành', at: '09:00' }),
      log({ id: 's', name: '', parentId: 'p', at: '09:00' }),
      log({ id: 'b', name: 'web code', kind: 'thực hành', at: '14:00' }),
    ]
    const groups = day(rows)

    // Groups sort to the top, so the plain row is second in the day.
    expect(groups.map((g) => g.row.id)).toEqual(['p', 'b'])
    expect(mergeTargetFor(groups, 1)?.row.id).toBe('p')
  })
})
