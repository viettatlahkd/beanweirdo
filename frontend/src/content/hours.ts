export type LogEntry = {
  /** uuid from `hour_logs` */
  id: string
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

/** How far back the streak, stats and month grouping reach. */
export const SPAN_DAYS = 21

/** Of that span, only the most recent 7 days are editable/draggable. */
export const RECENT_DAYS = 7

/** Of that span, only the most recent 12 days render as day rows at all. */
export const SHOWN_DAYS = 12

export const dateStr = (d: Date) =>
  d.getFullYear() +
  '-' +
  String(d.getMonth() + 1).padStart(2, '0') +
  '-' +
  String(d.getDate()).padStart(2, '0')

/**
 * The journal runs on the real calendar.
 *
 * It was anchored to a fixed 2026-02-14 while it was a prototype full of
 * seeded days; now that it holds real entries, "today" has to be today.
 * Both helpers take an explicit `now` so tests can pin a date without
 * touching the clock.
 */
export const todayStr = (now: Date = new Date()) => dateStr(now)

/** `i` days before today, as a local date. */
export function dayBefore(i: number, now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  d.setDate(d.getDate() - i)
  return d
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
