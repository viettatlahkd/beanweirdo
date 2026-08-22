import { SPAN_DAYS, dateStr, dayBefore, todayStr, type LogEntry } from '../content/hours'

export const toMin = (t: string) => {
  const p = String(t).split(':')
  return Number(p[0]) * 60 + (Number(p[1]) || 0)
}

/** `95` → `1h 35m`, `120` → `2h`, `40` → `40m`. */
export function fmt(m: number) {
  const h = Math.floor(m / 60)
  const r = m % 60
  if (!h) return r + 'm'
  return r ? h + 'h ' + r + 'm' : h + 'h'
}

export type DayBucket = {
  ds: string
  d: Date
  /** every log on the day, including undone drafts */
  ls: LogEntry[]
  /** minutes from done logs only */
  mins: number
  /**
   * Whether anything is filed on this day at all, ticked or not.
   *
   * Separate from `mins` on purpose: totals should only count work you've
   * confirmed, but the day is *used* the moment something is written down —
   * so the marker lights up on writing, not on ticking.
   */
  hasAny: boolean
  /** 0 = today, `SPAN_DAYS - 1` = oldest day in the span */
  age: number
}

/** The rolling span the screen draws, oldest day first. */
export function buildAllDays(logs: LogEntry[]): DayBucket[] {
  const byDate: Record<string, LogEntry[]> = {}
  for (const l of logs) (byDate[l.date] ||= []).push(l)

  const all: DayBucket[] = []
  for (let i = SPAN_DAYS - 1; i >= 0; i--) {
    const d = dayBefore(i)
    const ds = dateStr(d)
    const ls = byDate[ds] || []
    all.push({
      ds,
      d,
      ls,
      mins: ls.filter((l) => l.done !== false).reduce((a, l) => a + l.mins, 0),
      hasAny: ls.length > 0,
      age: i,
    })
  }
  return all
}

export const maxMins = (all: DayBucket[]) => Math.max(240, ...all.map((x) => x.mins))

/** Consecutive logged days counting back from today. */
export function streak(all: DayBucket[]) {
  let n = 0
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i].mins > 0) n++
    else break
  }
  return n
}

export function chart(all: DayBucket[]) {
  const m = maxMins(all)
  return all.map((x) => ({
    key: x.ds,
    h: Math.max(2, Math.round((x.mins / m) * 132)) + 'px',
    c: x.mins >= 180 ? '#3E7A4E' : x.mins ? '#7FB87E' : '#E3E3DB',
    lab: String(x.d.getDate()).padStart(2, '0'),
  }))
}

export function topNames(logs: LogEntry[]) {
  const totals: Record<string, number> = {}
  for (const l of logs) if (l.done !== false) totals[l.name] = (totals[l.name] || 0) + l.mins
  const ranked = Object.keys(totals).sort((a, b) => totals[b] - totals[a])
  const top = totals[ranked[0]] || 1
  return ranked.slice(0, 5).map((n, i) => ({
    n,
    dur: fmt(totals[n]),
    rank: String(i + 1).padStart(2, '0'),
    w: Math.round((totals[n] / top) * 100) + '%',
  }))
}

export function byKind(
  logs: LogEntry[],
  all: DayBucket[],
  kindList: string[],
  kindColor: Record<string, string>,
) {
  const spanTotal = all.reduce((a, x) => a + x.mins, 0)
  return kindList
    .map((k) => {
      const m = logs.filter((l) => l.kind === k && l.done !== false).reduce((a, l) => a + l.mins, 0)
      let ks = 0
      for (let i = all.length - 1; i >= 0; i--) {
        if (all[i].ls.some((l) => l.kind === k)) ks++
        else break
      }
      const nd = all.filter((x) => x.ls.some((l) => l.kind === k)).length
      const pct = spanTotal ? Math.round((m / spanTotal) * 100) : 0
      return {
        k,
        dur: m ? fmt(m) : '—',
        color: kindColor[k],
        dim: m ? 1 : 0.35,
        w: pct + '%',
        pct: pct + '%',
        streak: ks ? ks + ' ngày liên tiếp' : 'đứt chuỗi',
        days: nd + '/' + SPAN_DAYS + ' ngày',
        _sort: pct,
      }
    })
    .sort((a, b) => b._sort - a._sort)
}

export function spanStats(all: DayBucket[]) {
  const last7 = all.slice(-7)
  const sum7 = last7.reduce((a, x) => a + x.mins, 0)
  const spanTotal = all.reduce((a, x) => a + x.mins, 0)
  const activeDays = all.filter((x) => x.mins > 0).length
  const best = all.slice().sort((a, b) => b.mins - a.mins)[0]
  return {
    sum7: fmt(sum7),
    avg7: fmt(Math.round(sum7 / 7)),
    spanTotalTxt: fmt(spanTotal),
    activeDaysTxt: activeDays + '/' + SPAN_DAYS + ' ngày',
    bestTxt: fmt(best.mins),
    bestDay:
      String(best.d.getDate()).padStart(2, '0') + '.' + String(best.d.getMonth() + 1).padStart(2, '0'),
  }
}

export function todayLogs(logs: LogEntry[], today: string = todayStr()) {
  return logs.filter((l) => l.date === today)
}

// ── The statistics panel ────────────────────────────────────────────────────

/** The row for activities filed under no project at all. */
export const NO_PROJECT = 'không project'

const done = (l: LogEntry) => l.done !== false
const minutes = (ls: LogEntry[]) => ls.filter(done).reduce((a, l) => a + l.mins, 0)

/** Midnight of the Monday on or before `d`. */
function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  // getDay() is 0 for Sunday; the journal's week runs Monday to Sunday.
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

/**
 * The four headline figures.
 *
 * The old panel led with "total over 21 days", a window nobody chose — it was
 * whatever the day list happened to fetch. These are the spans a person
 * actually asks about: the month so far, the week so far, and the rolling
 * seven days.
 */
export function periodStats(logs: LogEntry[], now: Date = new Date()) {
  const inRange = (from: Date, to: Date) =>
    logs.filter((l) => l.date >= dateStr(from) && l.date <= dateStr(to))

  const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  // The same day-of-month last month, so a comparison mid-month is fair.
  const prevMonthTo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

  const mtd = minutes(inRange(monthFrom, now))
  const prevMtd = minutes(inRange(prevMonthFrom, prevMonthTo))

  const wkFrom = weekStart(now)
  const week = minutes(inRange(wkFrom, now))
  const daysIntoWeek = Math.round((+new Date(now.getFullYear(), now.getMonth(), now.getDate()) - +wkFrom) / 86400000) + 1

  const sevenFrom = dayBefore(6, now)
  const last7Logs = inRange(sevenFrom, now)
  const last7 = minutes(last7Logs)
  const daysWithin7 = new Set(last7Logs.filter(done).map((l) => l.date)).size

  return {
    mtd,
    mtdTxt: fmt(mtd),
    /** Difference against the same stretch of last month; null when there is no last month to compare. */
    mtdDelta: prevMtd > 0 ? mtd - prevMtd : null,
    week,
    weekTxt: fmt(week),
    weekPerDayTxt: fmt(Math.round(week / Math.max(1, daysIntoWeek))),
    last7,
    last7Txt: fmt(last7),
    last7DaysTxt: daysWithin7 + '/7 ngày có ghi',
  }
}

/**
 * How long one day actually took, counting overlapping activities once.
 *
 * Two activities from 13:00 to 14:00 are two hours of work but one hour of
 * clock. Intervals are merged before measuring, so this is the length of the
 * time in which *something* was happening.
 */
export function realSpanOfDay(dayLogs: LogEntry[]): number {
  const spans = dayLogs
    .filter(done)
    .map((l) => [toMin(l.at), toMin(l.at) + l.mins] as const)
    .sort((a, b) => a[0] - b[0])

  let total = 0
  let start: number | null = null
  let end = 0
  for (const [s, e] of spans) {
    if (start === null) {
      start = s
      end = e
      continue
    }
    if (s <= end) {
      end = Math.max(end, e)
    } else {
      total += end - start
      start = s
      end = e
    }
  }
  return start === null ? 0 : total + (end - start)
}

/**
 * Useful hours over real hours — the user's own measure.
 *
 * Logged minutes counts every activity; real minutes counts the clock they
 * happened on. The ratio is how many things were running at once on average,
 * so it starts at 1.0 and rises with genuine multitasking — the passive kind
 * that suits listening, reading around, or something fermenting while you work.
 * It cannot fall below 1.0, and a quiet afternoon does not push it down: this
 * measures overlap, not diligence.
 */
export function usefulRatio(logs: LogEntry[]) {
  const byDate: Record<string, LogEntry[]> = {}
  for (const l of logs) (byDate[l.date] ||= []).push(l)

  const useful = minutes(logs)
  const real = Object.values(byDate).reduce((a, ls) => a + realSpanOfDay(ls), 0)

  return {
    useful,
    real,
    usefulTxt: fmt(useful),
    realTxt: fmt(real),
    ratio: real > 0 ? useful / real : 0,
    ratioTxt: real > 0 ? (useful / real).toFixed(2).replace(/\.?0+$/, '') + '×' : '—',
  }
}

/**
 * Hours by project — the panel's main table.
 *
 * Which project the time went to answers "am I spending too long on this, or
 * not enough on that"; which *kind* of work it was is a secondary reading, so
 * this leads and `byKind` follows. Activities with no project are counted as
 * their own row rather than dropped, or the percentages would not add up.
 */
export function byProject(
  logs: LogEntry[],
  projects: string[],
  projectColor: Record<string, string>,
  now: Date = new Date(),
) {
  const total = minutes(logs)
  const today = dateStr(now)

  const rows = projects.concat([NO_PROJECT]).map((name) => {
    const mine = logs.filter(
      (l) => done(l) && (name === NO_PROJECT ? !l.project : l.project === name),
    )
    const mins = minutes(mine)
    const last = mine.map((l) => l.date).sort().slice(-1)[0]
    const daysAgo = last
      ? Math.round((+new Date(today) - +new Date(last)) / 86400000)
      : null

    return {
      name,
      mins,
      durTxt: mins ? fmt(mins) : '—',
      pct: total ? Math.round((mins / total) * 100) : 0,
      color: name === NO_PROJECT ? '#A2A296' : (projectColor[name] ?? '#102F35'),
      count: mine.length,
      daysAgo,
      lastTxt:
        daysAgo === null
          ? 'chưa có hoạt động nào'
          : daysAgo === 0
            ? 'gần nhất hôm nay'
            : daysAgo === 1
              ? 'gần nhất hôm qua'
              : `gần nhất ${daysAgo} ngày trước`,
    }
  })

  return rows.sort((a, b) => b.mins - a.mins)
}

/**
 * Projects that have gone quiet — the thing a total hides.
 *
 * A bar chart shows where the time went; it says nothing about what stopped
 * getting any. Only projects that were used at least once appear: one never
 * touched is not neglected, it is unused.
 */
export function neglected(
  logs: LogEntry[],
  projects: string[],
  now: Date = new Date(),
  afterDays = 7,
) {
  const today = +new Date(dateStr(now))
  return projects
    .map((name) => {
      const last = logs
        .filter((l) => done(l) && l.project === name)
        .map((l) => l.date)
        .sort()
        .slice(-1)[0]
      if (!last) return null
      const days = Math.round((today - +new Date(last)) / 86400000)
      return { name, days, txt: days === 1 ? '1 ngày' : `${days} ngày` }
    })
    .filter((x): x is { name: string; days: number; txt: string } => !!x && x.days >= afterDays)
    .sort((a, b) => b.days - a.days)
}

/** One square of the heatmap. */
export type HeatCell = {
  ds: string
  mins: number
  /** 0 = a day inside the record with nothing on it, 4 = the heaviest days. */
  level: 0 | 1 | 2 | 3 | 4
  /**
   * Outside the journal's own life: before the first entry was ever written,
   * or later than today. An empty square inside the record means "that day
   * went unlogged", which is a fact about the person; one of these means
   * "there was no journal yet", which is a fact about the calendar. Drawing
   * them the same way would make a new journal look like a long lapse.
   */
  outside: boolean
  /** Column within the grid, 0 = oldest week. */
  week: number
  /** Row, 0 = Monday. */
  day: number
}

/**
 * An Anki-style grid: one square per day, twenty-six weeks of them.
 *
 * The point is the shape of the habit rather than any single day's total, so
 * the levels are cut against the busiest day in the window instead of fixed
 * hour marks — a quiet month still shows its own rhythm rather than a uniform
 * pale wash.
 */
export function heatmap(logs: LogEntry[], weeks = 26, now: Date = new Date()) {
  const byDate: Record<string, number> = {}
  for (const l of logs) if (done(l)) byDate[l.date] = (byDate[l.date] || 0) + l.mins

  // The record runs from the first entry ever written to today. Squares
  // outside it are drawn as absent rather than as empty days, and future ones
  // stay in the grid instead of leaving a hole in the current week.
  const firstEntry = Object.keys(byDate).sort()[0] ?? null
  const todayStr_ = dateStr(now)

  // The grid is anchored to the first entry and runs forward, not backwards
  // from today. A journal a few days old should show its opening week at the
  // left with room ahead of it to fill in — winding back six months instead
  // would bury that week in the last column behind a wall of squares that
  // never had a chance to hold anything.
  //
  // Once the record outgrows the window, the anchor moves: the grid then ends
  // on the current week and shows the most recent stretch.
  const thisWeek = weekStart(now)
  const openingWeek = firstEntry ? weekStart(new Date(firstEntry)) : thisWeek
  const weeksLived = Math.round((+thisWeek - +openingWeek) / (7 * 86400000)) + 1

  const start = new Date(openingWeek)
  if (weeksLived > weeks) start.setTime(+thisWeek - (weeks - 1) * 7 * 86400000)

  const cells: HeatCell[] = []
  const peak = Math.max(60, ...Object.values(byDate))
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(day.getDate() + w * 7 + d)
      const ds = dateStr(day)
      const mins = byDate[ds] || 0
      const outside = firstEntry === null || ds < firstEntry || ds > todayStr_
      const share = mins / peak
      const level: HeatCell['level'] =
        mins === 0 ? 0 : share > 0.75 ? 4 : share > 0.5 ? 3 : share > 0.25 ? 2 : 1
      cells.push({ ds, mins, level, outside, week: w, day: d })
    }
  }

  // Streaks are counted over the whole window, not just the grid.
  const logged = Object.keys(byDate).filter((d) => byDate[d] > 0).sort()
  let best = 0
  let run = 0
  let prev: number | null = null
  for (const ds of logged) {
    const t = +new Date(ds)
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1
    best = Math.max(best, run)
    prev = t
  }

  let current = 0
  for (let i = 0; ; i++) {
    const ds = dateStr(dayBefore(i, now))
    if (byDate[ds] > 0) current++
    else if (i > 0) break
    // Today being empty does not end a streak that ran until yesterday.
    else continue
  }

  return { cells, weeks, current, best }
}
