export type LogEntry = {
  /** uuid from `hour_logs` */
  id: string
  /** The project this hour was for — null when it belongs to none. */
  project?: string | null
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
 * Where an activity lands when the tag it wore was deleted and nothing was
 * chosen to replace it.
 *
 * Lower-case, like every other tag in the journal — `đọc`, `thực hành`,
 * `viết`. It sits in the same row of chips as those and reads as one of them,
 * so capitalising it made it look like a proper noun rather than the absence
 * of a choice.
 *
 * Not a tag anyone creates, and not something the tag bar offers to file new
 * work under — it exists so the reports can say "this happened, and it was
 * never classified" instead of dropping the hours or refusing the deletion.
 */
export const UNCLASSIFIED = 'khác'

/**
 * `kinds` for the statistics: the tag list, plus the unclassified bucket when
 * anything is actually sitting in it. The bucket has no row in
 * `activity_kinds`, so it would otherwise be missing from every total.
 */
export function withUnclassified(kinds: string[], logs: LogEntry[]): string[] {
  if (kinds.includes(UNCLASSIFIED)) return kinds
  return logs.some((l) => l.kind === UNCLASSIFIED) ? kinds.concat([UNCLASSIFIED]) : kinds
}

/**
 * Project tags read as hashtags — `#Sao đâu` — but the `#` is punctuation, not
 * part of the name, so it is added when drawn and never stored.
 */
export const hashtag = (name: string) => '#' + name

/**
 * Projects get a filled chip with a pale dot; tasks keep the outlined chip with
 * a saturated dot. Two systems sitting side by side have to be told apart at a
 * glance, and colour alone won't do it — the shape has to differ too.
 */
export const PROJECT_PALETTE = [
  '#102F35',
  '#C25C7C',
  '#3E7A4E',
  '#8A6420',
  '#5E4B8B',
  '#B3543A',
]

export function projectColorMap(projects: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  projects.forEach((p, i) => {
    map[p] = PROJECT_PALETTE[i % PROJECT_PALETTE.length]
  })
  return map
}

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
  // The bucket is grey wherever it appears: it is the absence of a choice, and
  // giving it a colour of its own would make it look like one.
  map[UNCLASSIFIED] = '#A2A296'
  return map
}

/** How far back the streak, stats and month grouping reach. */
/**
 * The day this journal opened. Nothing was written before it and nothing ever
 * will be, so a square or a row for an earlier date is not "a day nobody
 * logged" — it is a day that never belonged to the journal at all, and showing
 * it as an empty row reads as a lapse that didn't happen.
 *
 * Everything that walks backwards through dates stops here.
 */
export const KICKOFF = '2026-08-20'

export const SPAN_DAYS = 21

/**
 * How much history the statistics ask the server for: twenty-six weeks.
 *
 * The day list still draws the recent span; this is the window the heatmap,
 * the month-to-date figures and the "last touched" column need behind it. A
 * personal journal at a few entries a day is a few hundred rows over this
 * span — small enough to fetch in one go, and fetching less would leave the
 * heatmap looking like an empty grid.
 *
 * Twenty-six rather than twelve because the grid is one column per week: at
 * twelve columns a square that fills the panel's width is 58px across and the
 * grid stands 400px tall, which is a wall rather than a glance. At twenty-six
 * the square is 27px and the grid 188px — and a year, the Anki default, would
 * be mostly empty for a journal this young.
 */
export const STATS_DAYS = 182

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
