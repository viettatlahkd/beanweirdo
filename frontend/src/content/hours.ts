export type LogEntry = {
  id: number
  /** ISO-ish `YYYY-MM-DD` */
  date: string
  name: string
  kind: string
  mins: number
  /** clock time the activity started, `HH:MM` */
  at: string
  /**
   * `false` marks a draft row added via "thêm hoạt động" that hasn't been
   * ticked yet. Undefined/true both read as done — the seed data omits the
   * field entirely and still counts.
   */
  done?: boolean
}

/** The four kinds the journal ships with — users can add more from the timer rail. */
export const KINDS = ['đọc', 'thực hành', 'viết', 'quan sát']

/**
 * Kind colour is assigned by position, not by name, so a newly-typed kind
 * gets a colour for free. Cycles once every 7 kinds.
 */
export const KIND_PALETTE = [
  '#3E7A4E',
  'oklch(0.50 0.135 14)',
  '#8A6420',
  '#102F35',
  '#5E7F52',
  'oklch(0.60 0.115 14)',
  '#6E5A2A',
]

export function kindColorMap(kinds: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  kinds.forEach((k, i) => {
    map[k] = KIND_PALETTE[i % KIND_PALETTE.length]
  })
  return map
}

export const STORAGE_KEY = 'cs_practice_logs_v1'
export const KINDS_STORAGE_KEY = 'cs_practice_kinds_v1'

/**
 * The journal is a prototype with a fixed "today" — the seeded streak, the
 * day grid and the stats are all anchored to this date.
 */
export const TODAY = '2026-02-14'

/** How far back the streak, stats and month grouping reach. */
export const SPAN_DAYS = 21

/** Of that span, only the most recent 7 days are editable/draggable. */
export const RECENT_DAYS = 7

/** Of that span, only the most recent 12 days render as day rows at all. */
export const SHOWN_DAYS = 12

const pool: [string, string, number][] = [
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

/** Which activities happened on each of the 21 seeded days, newest day first. */
const plan: number[][] = [
  [0, 1, 2], [3, 4], [5, 6, 7], [8], [1, 3, 5], [0, 2], [6, 9],
  [4, 7, 1], [2, 8], [3, 0], [5], [7, 9, 4], [1, 6], [0, 3, 8],
  [2, 5], [7, 1], [0, 4, 9], [3, 6], [8, 2], [1, 5, 7], [4, 0],
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
        done: true,
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

/**
 * The header quote rotates daily. Real quotes only — a made-up line under a
 * real name is worse than no quote (System conventions, rule 06). Add new ones
 * to the end; the index wraps, so the rotation just gets longer.
 */
export const QUOTES: { t: string; w: string }[] = [
  { t: '“We are what we repeatedly do.”', w: 'Will Durant' },
  { t: '“Small daily improvements are the key to staggering long-term results.”', w: 'Robin Sharma' },
  {
    t: '“Amateurs sit and wait for inspiration, the rest of us just get up and go to work.”',
    w: 'Stephen King',
  },
  { t: '“What gets measured gets managed.”', w: 'Peter Drucker' },
  { t: '“It is not that we have a short time to live, but that we waste a lot of it.”', w: 'Seneca' },
  {
    t: '“Discipline is choosing between what you want now and what you want most.”',
    w: 'Abraham Lincoln',
  },
  { t: '“Nothing will work unless you do.”', w: 'Maya Angelou' },
]

/** Days since the epoch, in local terms — same day ⇒ same quote. */
export function dayIndex(now: Date = new Date()) {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000)
}

export function quoteOfTheDay(now: Date = new Date()) {
  return QUOTES[dayIndex(now) % QUOTES.length]
}
