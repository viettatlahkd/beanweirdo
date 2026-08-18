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
