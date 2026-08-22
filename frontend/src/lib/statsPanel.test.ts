import { describe, expect, it } from 'vitest'
import { KICKOFF, type LogEntry } from '../content/hours'
import {
  NO_PROJECT,
  buildAllDays,
  byProject,
  cloneOf,
  heatmap,
  neglected,
  periodStats,
  realSpanOfDay,
  spanStats,
  usefulRatio,
} from './hoursStats'

const NOW = new Date('2026-08-22T18:00:00')

let seq = 0
const log = (over: Partial<LogEntry> = {}): LogEntry => ({
  id: `l${seq++}`,
  date: '2026-08-22',
  name: 'việc',
  kind: 'đọc',
  project: null,
  mins: 60,
  at: '09:00',
  done: true,
  ...over,
})

describe('realSpanOfDay — overlapping activities count once', () => {
  it('adds up activities that do not touch', () => {
    const day = [log({ at: '09:00', mins: 60 }), log({ at: '14:00', mins: 30 })]
    expect(realSpanOfDay(day)).toBe(90)
  })

  it('merges two activities running at the same time', () => {
    // Two hours of work, one hour of clock.
    const day = [log({ at: '13:00', mins: 60 }), log({ at: '13:00', mins: 60 })]
    expect(realSpanOfDay(day)).toBe(60)
  })

  it('merges a partial overlap into one stretch', () => {
    // 13:00–14:00 and 13:30–15:00 is 13:00–15:00.
    const day = [log({ at: '13:00', mins: 60 }), log({ at: '13:30', mins: 90 })]
    expect(realSpanOfDay(day)).toBe(120)
  })

  it('treats back-to-back activities as one stretch, not two', () => {
    const day = [log({ at: '09:00', mins: 60 }), log({ at: '10:00', mins: 60 })]
    expect(realSpanOfDay(day)).toBe(120)
  })

  it('ignores rows that have not been ticked', () => {
    const day = [log({ at: '09:00', mins: 60 }), log({ at: '14:00', mins: 60, done: false })]
    expect(realSpanOfDay(day)).toBe(60)
  })

  it('is zero for a day with nothing on it', () => {
    expect(realSpanOfDay([])).toBe(0)
  })
})

describe('usefulRatio — the multitasking measure', () => {
  it('is exactly 1 when nothing overlaps', () => {
    const logs = [log({ at: '09:00', mins: 60 }), log({ at: '14:00', mins: 60 })]
    const r = usefulRatio(logs)
    expect(r.useful).toBe(120)
    expect(r.real).toBe(120)
    expect(r.ratioTxt).toBe('1×')
  })

  it('rises above 1 when two things run together', () => {
    // Three hours logged across two hours of clock.
    const logs = [
      log({ at: '13:00', mins: 120 }),
      log({ at: '13:00', mins: 60 }),
    ]
    const r = usefulRatio(logs)
    expect(r.useful).toBe(180)
    expect(r.real).toBe(120)
    expect(r.ratioTxt).toBe('1.5×')
  })

  it('never falls below 1 just because a day was quiet', () => {
    // One activity in a long day: still 1.0, because this measures overlap
    // rather than how much of the day was filled.
    const r = usefulRatio([log({ at: '09:00', mins: 15 })])
    expect(r.ratio).toBe(1)
  })

  it('measures each day on its own clock', () => {
    const logs = [
      log({ date: '2026-08-21', at: '13:00', mins: 60 }),
      log({ date: '2026-08-21', at: '13:00', mins: 60 }),
      log({ date: '2026-08-22', at: '09:00', mins: 60 }),
    ]
    const r = usefulRatio(logs)
    // 180 logged, 120 of clock: the two days are not merged into one span.
    expect(r.real).toBe(120)
    expect(r.ratioTxt).toBe('1.5×')
  })

  it('says nothing rather than dividing by zero', () => {
    expect(usefulRatio([]).ratioTxt).toBe('—')
  })
})

describe('periodStats — the spans a person actually asks about', () => {
  const logs = [
    log({ date: '2026-08-22', mins: 120 }), // today, this week, this month
    log({ date: '2026-08-17', mins: 60 }), // Monday of this week
    log({ date: '2026-08-10', mins: 180 }), // last week, still this month
    log({ date: '2026-07-15', mins: 240 }), // last month
    log({ date: '2026-08-05', mins: 30, done: false }), // never ticked
  ]

  it('counts the month so far, ticked rows only', () => {
    const s = periodStats(logs, NOW)
    expect(s.mtd).toBe(360)
    expect(s.mtdTxt).toBe('6h')
  })

  it('counts the week from Monday', () => {
    // 2026-08-22 is a Saturday; the week starts Monday 2026-08-17.
    const s = periodStats(logs, NOW)
    expect(s.week).toBe(180)
  })

  it('counts a rolling seven days, and how many of them have entries', () => {
    const s = periodStats(logs, NOW)
    expect(s.last7).toBe(180)
    expect(s.last7DaysTxt).toBe('2/7 ngày có ghi')
  })

  it('compares against the same stretch of last month', () => {
    const s = periodStats(logs, NOW)
    // 360 this month against 240 up to the 22nd of last month.
    expect(s.mtdDelta).toBe(120)
  })

  it('offers no comparison when there is no last month to compare', () => {
    const s = periodStats([log({ date: '2026-08-22' })], NOW)
    expect(s.mtdDelta).toBeNull()
  })
})

describe('byProject — the panel’s main table', () => {
  const logs = [
    log({ project: 'Sao đâu', mins: 240, date: '2026-08-22' }),
    log({ project: 'Sao đâu', mins: 20, date: '2026-08-20' }),
    log({ project: 'Cà củng', mins: 100, date: '2026-08-15' }),
    log({ project: null, mins: 40, date: '2026-08-22' }),
  ]
  const colors = { 'Sao đâu': '#102F35', 'Cà củng': '#C25C7C' }

  it('ranks by time and gives each a share', () => {
    const rows = byProject(logs, ['Sao đâu', 'Cà củng'], colors, NOW)
    expect(rows.map((r) => r.name)).toEqual(['Sao đâu', 'Cà củng', NO_PROJECT])
    expect(rows[0].mins).toBe(260)
    expect(rows[0].pct + rows[1].pct + rows[2].pct).toBe(100)
  })

  it('keeps activities with no project as their own row', () => {
    const rows = byProject(logs, ['Sao đâu', 'Cà củng'], colors, NOW)
    const none = rows.find((r) => r.name === NO_PROJECT)!
    expect(none.mins).toBe(40)
  })

  it('says how long since each project was last touched', () => {
    const rows = byProject(logs, ['Sao đâu', 'Cà củng'], colors, NOW)
    expect(rows[0].lastTxt).toBe('gần nhất hôm nay')
    expect(rows[1].lastTxt).toBe('gần nhất 7 ngày trước')
  })

  it('lists a project that has never been used, without a date', () => {
    const rows = byProject(logs, ['Sao đâu', 'Cà củng', 'Mới toanh'], colors, NOW)
    const fresh = rows.find((r) => r.name === 'Mới toanh')!
    expect(fresh.mins).toBe(0)
    expect(fresh.daysAgo).toBeNull()
    expect(fresh.lastTxt).toBe('chưa có hoạt động nào')
  })
})

describe('neglected — what stopped getting time', () => {
  const logs = [
    log({ project: 'Sao đâu', date: '2026-08-22' }),
    log({ project: 'Cà củng', date: '2026-08-01' }),
    log({ project: 'Work', date: '2026-08-14' }),
  ]

  it('names projects quiet for a week or more, longest first', () => {
    const out = neglected(logs, ['Sao đâu', 'Cà củng', 'Work'], NOW)
    expect(out.map((x) => x.name)).toEqual(['Cà củng', 'Work'])
    expect(out[0].txt).toBe('21 ngày')
  })

  it('leaves out a project never used — unused is not neglected', () => {
    const out = neglected(logs, ['Sao đâu', 'Cà củng', 'Work', 'Chưa dùng'], NOW)
    expect(out.map((x) => x.name)).not.toContain('Chưa dùng')
  })

  it('takes the threshold as an argument', () => {
    const out = neglected(logs, ['Sao đâu', 'Cà củng', 'Work'], NOW, 30)
    expect(out).toHaveLength(0)
  })
})

describe('heatmap — the shape of the habit', () => {
  it('lays out a full rectangle — every week, every day', () => {
    const grid = heatmap([log({ date: '2026-08-22', mins: 60 })], 4, NOW)
    // Four complete weeks. Days past today are drawn as outside the record
    // rather than dropped, so the current week is not a row with a bite out
    // of it.
    expect(grid.cells).toHaveLength(4 * 7)
    expect(grid.cells.filter((c) => c.ds > '2026-08-22').every((c) => c.outside)).toBe(true)
  })

  it('scales the shades against the busiest day in the window', () => {
    const grid = heatmap(
      [
        log({ date: '2026-08-22', mins: 480 }),
        log({ date: '2026-08-21', mins: 60 }),
        log({ date: '2026-08-20', mins: 0 }),
      ],
      4,
      NOW,
    )
    const at = (ds: string) => grid.cells.find((c) => c.ds === ds)!
    expect(at('2026-08-22').level).toBe(4)
    expect(at('2026-08-21').level).toBe(1)
    expect(at('2026-08-20').level).toBe(0)
  })

  it('counts the current streak back from today', () => {
    const grid = heatmap(
      [
        log({ date: '2026-08-22', mins: 30 }),
        log({ date: '2026-08-21', mins: 30 }),
        log({ date: '2026-08-19', mins: 30 }),
      ],
      4,
      NOW,
    )
    expect(grid.current).toBe(2)
  })

  it('does not break the streak just because today is still empty', () => {
    const grid = heatmap(
      [log({ date: '2026-08-21', mins: 30 }), log({ date: '2026-08-20', mins: 30 })],
      4,
      NOW,
    )
    expect(grid.current).toBe(2)
  })

  it('remembers the longest run in the window', () => {
    const grid = heatmap(
      [
        log({ date: '2026-08-10', mins: 30 }),
        log({ date: '2026-08-11', mins: 30 }),
        log({ date: '2026-08-12', mins: 30 }),
        log({ date: '2026-08-22', mins: 30 }),
      ],
      4,
      NOW,
    )
    expect(grid.best).toBe(3)
  })
})

describe('heatmap — days the journal did not exist for', () => {
  it('marks squares before the journal opened as outside the record', () => {
    // The grid opens on Monday the 17th; the journal opened Thursday the 20th,
    // so the first three squares predate the journal itself.
    const grid = heatmap([log({ date: '2026-08-20', mins: 60 })], 4, NOW)
    const early = grid.cells.find((c) => c.ds === '2026-08-18')!
    const first = grid.cells.find((c) => c.ds === KICKOFF)!

    // Nothing was written before the 20th because there was no journal yet —
    // a different fact from "that day went unlogged".
    expect(early.outside).toBe(true)
    expect(first.outside).toBe(false)
  })

  it('separates an unlogged day inside the record from one outside it', () => {
    const grid = heatmap(
      [log({ date: '2026-08-20', mins: 60 }), log({ date: '2026-08-22', mins: 60 })],
      4,
      NOW,
    )
    const gap = grid.cells.find((c) => c.ds === '2026-08-21')!
    const before = grid.cells.find((c) => c.ds === '2026-08-17')!

    expect(gap.outside).toBe(false)
    expect(gap.level).toBe(0)
    expect(before.outside).toBe(true)
  })

  it('keeps future days in the grid instead of leaving a hole in the week', () => {
    const grid = heatmap([log({ date: '2026-08-20', mins: 60 })], 4, NOW)

    // Every square of every week is present — 2026-08-22 is a Saturday, so
    // Sunday still has to be drawn, just drawn as absent.
    expect(grid.cells).toHaveLength(4 * 7)
    const tomorrow = grid.cells.find((c) => c.ds === '2026-08-23')!
    expect(tomorrow.outside).toBe(true)
    expect(tomorrow.mins).toBe(0)
  })

  it('an empty journal still owns the days since it opened', () => {
    const grid = heatmap([], 4, NOW)
    const inside = grid.cells.filter((c) => !c.outside).map((c) => c.ds)

    // Opened on the 20th, today is the 22nd: three days on the record with
    // nothing written on any of them. That is a lapse, not an absence, and the
    // grid has to be able to say so.
    expect(inside).toEqual(['2026-08-20', '2026-08-21', '2026-08-22'])
    expect(grid.cells.filter((c) => c.level > 0)).toHaveLength(0)
  })
})

describe('heatmap — the grid runs forward from the day the journal opened', () => {
  it('opens on the week the journal did, not six months before today', () => {
    // KICKOFF is 2026-08-20, a Thursday; its week starts Monday the 17th.
    const grid = heatmap([log({ date: '2026-08-20', mins: 60 })], 26, NOW)
    const earliest = grid.cells.map((c) => c.ds).sort()[0]
    expect(earliest).toBe('2026-08-17')
  })

  it('leaves the rest of the window ahead, ready to be filled', () => {
    const grid = heatmap([log({ date: '2026-08-20', mins: 60 })], 26, NOW)
    const latest = grid.cells.map((c) => c.ds).sort().slice(-1)[0]
    // Twenty-six weeks from the opening Monday, so the far edge is in the future.
    expect(latest > '2027-02-01').toBe(true)
    expect(grid.cells.filter((c) => !c.outside)).toHaveLength(3) // 20, 21, 22
  })

  it('slides the window once the record outgrows it', () => {
    // A year on from the opening day: the grid should end on the current week
    // rather than stopping short of today, back near the journal's beginning.
    const later = new Date('2027-08-21T18:00:00') // a Saturday
    const grid = heatmap([log({ date: '2026-08-20', mins: 60 })], 26, later)
    const dates = grid.cells.map((c) => c.ds).sort()

    expect(dates[0] > '2027-01-01').toBe(true)
    expect(dates.slice(-1)[0]).toBe('2027-08-22') // the Sunday closing that week
  })

  it('opens in the same place whether or not anything has been written yet', () => {
    // The anchor is the opening day, not the first entry — so an untouched
    // journal and a journal written in on day one draw the same grid.
    const empty = heatmap([], 26, NOW)
    const written = heatmap([log({ date: '2026-08-22', mins: 60 })], 26, NOW)

    expect(empty.cells.map((c) => c.ds).sort()[0]).toBe('2026-08-17')
    expect(empty.cells.map((c) => c.ds)).toEqual(written.cells.map((c) => c.ds))
  })
})

describe('buildAllDays — the journal has no days before it opened', () => {
  it('stops the day list at the opening day', () => {
    const all = buildAllDays([log({ date: '2026-08-22', mins: 60 })], NOW)
    expect(all.map((x) => x.ds)).toEqual(['2026-08-20', '2026-08-21', '2026-08-22'])
  })

  it('counts active days against the days that exist, not a fixed span', () => {
    const all = buildAllDays([log({ date: '2026-08-22', mins: 60 })], NOW)
    // Three days on the record, one of them written on — not "1/21 ngày",
    // which would count eighteen days that were never the journal's to miss.
    expect(spanStats(all).activeDaysTxt).toBe('1/3 ngày')
  })
})

describe('cloneOf — nhân đôi một hoạt động', () => {
  const original = (over: Partial<LogEntry> = {}) =>
    log({ name: 'beanweirdo: web code', kind: 'thực hành', project: 'Work', mins: 200, at: '13:42', done: true, ...over })

  it('carries the name, both tags and the duration', () => {
    const copy = cloneOf(original(), NOW)

    expect(copy.name).toBe('beanweirdo: web code')
    expect(copy.kind).toBe('thực hành')
    expect(copy.project).toBe('Work')
    expect(copy.mins).toBe(200)
    expect(copy.date).toBe(original().date)
  })

  it('stamps the moment the copy was made, not a slot after the last row', () => {
    // NOW is 18:00 — the copy starts then, whatever time the original ran at.
    expect(cloneOf(original({ at: '13:42' }), NOW).at).toBe('18:00')
    expect(cloneOf(original({ at: '23:10' }), NOW).at).toBe('18:00')
  })

  it('arrives unticked even when the original was done', () => {
    // A copy is a claim about work nobody has checked yet. Ticking it here
    // would put minutes into the day's total that the owner never confirmed.
    expect(cloneOf(original({ done: true }), NOW).done).toBe(false)
    expect(cloneOf(original({ done: false }), NOW).done).toBe(false)
  })

  it('pads the clock time to two digits on both sides', () => {
    expect(cloneOf(original(), new Date('2026-08-22T09:05:00')).at).toBe('09:05')
  })
})
