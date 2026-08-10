import {
  LOG_KINDS,
  SPAN_DAYS,
  TODAY,
  dateStr,
  dayBefore,
  kindColor,
  type LogEntry,
} from '../content/hours'
import { hoursTheme } from '../design/tokens'

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

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

/**
 * Everything the Hours screen shows is derived from the flat log list: the
 * streak that headlines the page, the 21-day grid, today's rows, and the
 * stats panel. Kept as one pure pass so the two views can never disagree.
 */
export function hoursStats(logs: LogEntry[]) {
  const byDate: Record<string, LogEntry[]> = {}
  for (const l of logs) (byDate[l.date] ||= []).push(l)

  const days: { ds: string; d: Date; ls: LogEntry[]; mins: number }[] = []
  for (let i = SPAN_DAYS - 1; i >= 0; i--) {
    const d = dayBefore(i)
    const ds = dateStr(d)
    const ls = byDate[ds] || []
    days.push({ ds, d, ls, mins: ls.reduce((a, l) => a + l.mins, 0) })
  }

  // Floor of 240 keeps a light week from inflating its own bars to full height.
  const maxMins = Math.max(240, ...days.map((x) => x.mins))

  const dayCells = days.map((x) => ({
    key: x.ds,
    dow: DOW[x.d.getDay()],
    num: String(x.d.getDate()).padStart(2, '0'),
    dur: x.mins ? fmt(x.mins) : '',
    bg: x.mins
      ? x.mins >= 180
        ? hoursTheme.cellStrong
        : hoursTheme.cellDone
      : hoursTheme.cellIdle,
    border: x.ds === TODAY ? `2px solid ${hoursTheme.ink}` : `1px solid ${hoursTheme.border}`,
    ticks: x.ls.map((l) => ({ c: kindColor[l.kind] ?? '#C9821F', n: l.name })),
  }))

  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].mins > 0) streak++
    else break
  }

  const todayLogs = byDate[TODAY] || []
  const todayTotal = todayLogs.reduce((a, l) => a + l.mins, 0)
  const logRows = todayLogs
    .slice()
    .sort((a, b) => toMin(a.at) - toMin(b.at))
    .map((l) => ({
      id: l.id,
      name: l.name,
      kind: l.kind,
      at: l.at,
      dur: fmt(l.mins),
      color: kindColor[l.kind] ?? '#C9821F',
    }))

  const spanTotal = days.reduce((a, x) => a + x.mins, 0)

  const byKind = LOG_KINDS.map((k) => {
    const m = logs.filter((l) => l.kind === k).reduce((a, l) => a + l.mins, 0)
    let ks = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].ls.some((l) => l.kind === k)) ks++
      else break
    }
    const nd = days.filter((x) => x.ls.some((l) => l.kind === k)).length
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
  }).sort((a, b) => b._sort - a._sort)

  const nameTotals: Record<string, number> = {}
  for (const l of logs) nameTotals[l.name] = (nameTotals[l.name] || 0) + l.mins
  const ranked = Object.keys(nameTotals).sort((a, b) => nameTotals[b] - nameTotals[a])
  const top = nameTotals[ranked[0]] || 1
  const topNames = ranked.slice(0, 5).map((n, i) => ({
    n,
    dur: fmt(nameTotals[n]),
    rank: String(i + 1).padStart(2, '0'),
    w: Math.round((nameTotals[n] / top) * 100) + '%',
  }))

  const last7 = days.slice(-7)
  const sum7 = last7.reduce((a, x) => a + x.mins, 0)
  const activeDays = days.filter((x) => x.mins > 0).length
  const best = days.slice().sort((a, b) => b.mins - a.mins)[0]

  const chart = days.map((x) => ({
    key: x.ds,
    h: Math.max(2, Math.round((x.mins / maxMins) * 132)) + 'px',
    c:
      x.mins >= 180
        ? hoursTheme.accent
        : x.mins
          ? hoursTheme.chartMid
          : hoursTheme.chartIdle,
    lab: String(x.d.getDate()).padStart(2, '0'),
  }))

  return {
    dayCells,
    chart,
    topNames,
    byKind,
    logRows,
    streakNum: String(streak),
    todayTotal: todayTotal ? fmt(todayTotal) : '0m',
    todayCount: todayLogs.length + ' hoạt động',
    sum7: fmt(sum7),
    avg7: fmt(Math.round(sum7 / 7)),
    spanTotalTxt: fmt(spanTotal),
    activeDaysTxt: activeDays + '/' + SPAN_DAYS + ' ngày',
    bestTxt: fmt(best.mins),
    bestDay:
      String(best.d.getDate()).padStart(2, '0') +
      '.' +
      String(best.d.getMonth() + 1).padStart(2, '0'),
  }
}
