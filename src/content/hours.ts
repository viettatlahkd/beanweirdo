export type LogKind = 'đọc' | 'thực hành' | 'viết' | 'quan sát'

export type LogEntry = {
  id: number
  /** ISO-ish `YYYY-MM-DD` */
  date: string
  name: string
  kind: LogKind
  mins: number
  /** clock time the activity started, `HH:MM` */
  at: string
}

export const LOG_KINDS: LogKind[] = ['đọc', 'thực hành', 'viết', 'quan sát']

/** Colour codes the kind of work — the only decorative use of colour on Hours. */
export const kindColor: Record<LogKind, string> = {
  đọc: '#C9821F',
  'thực hành': '#2E8C74',
  viết: '#6E5AA8',
  'quan sát': '#C25438',
}

/**
 * The journal is a prototype with a fixed "today" — the seeded streak, the
 * 21-day grid and the stats are all anchored to this date. Move it and the
 * sample data no longer lines up behind the grid.
 */
export const TODAY = '2026-02-14'

export const STORAGE_KEY = 'cs_practice_logs_v1'

/** How far back the day grid and the stats panel reach. */
export const SPAN_DAYS = 21

const pool: [string, LogKind, number][] = [
  ['Cupping 6 mẫu Sơn La', 'thực hành', 90],
  ['Đọc chương CGA — Illy', 'đọc', 85],
  ['Viết lại ghi chú rang', 'viết', 70],
  ['Rang thử 3 mức phát triển', 'thực hành', 105],
  ["Đọc Coffee Roaster's Companion", 'đọc', 55],
  ['Ghi chú vị sau buổi nếm', 'viết', 40],
  ['Quan sát quán — cách kéo shot', 'quan sát', 60],
  ['Nếm mù 4 mẫu robusta', 'thực hành', 75],
  ['Đọc paper về acid quinic', 'đọc', 45],
  ['Xem lại video rang tuần trước', 'quan sát', 35],
]

/** Which activities happened on each of the last 14 days, newest day first. */
const plan: number[][] = [
  [0, 1, 2], [3, 4], [5, 6, 7], [8], [1, 3, 5], [0, 2], [6, 9],
  [4, 7, 1], [2, 8], [3, 0], [5], [7, 9, 4], [1, 6], [0, 3, 8],
]

export const dateStr = (d: Date) =>
  d.getFullYear() +
  '-' +
  String(d.getMonth() + 1).padStart(2, '0') +
  '-' +
  String(d.getDate()).padStart(2, '0')

/** Feb 2026, counted back from `TODAY`. */
export const dayBefore = (i: number) => new Date(2026, 1, 14 - i)

export function seedLogs(): LogEntry[] {
  const out: LogEntry[] = []
  let id = 1
  for (let i = 0; i < plan.length; i++) {
    const ds = dateStr(dayBefore(i))
    let clock = 6 * 60 + 30
    for (const pi of plan[i]) {
      const [name, kind, mins] = pool[pi]
      out.push({
        id: id++,
        date: ds,
        name,
        kind,
        mins,
        at:
          String(Math.floor(clock / 60)).padStart(2, '0') +
          ':' +
          String(clock % 60).padStart(2, '0'),
      })
      // 55 minutes of not-logged life between activities
      clock += mins + 55
    }
  }
  return out
}
