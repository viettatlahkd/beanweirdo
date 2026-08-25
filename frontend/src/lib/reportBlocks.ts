import type { ReportBlock, ReportChartPoint, ReportMetric, ReportTableRow } from 'post-renderer'

/**
 * The stored shape of a report's blocks, and how it becomes the drawn one.
 *
 * Templates were written with short keys — `{t:'h', v:'…'}`, `{m:[…]}`,
 * `{th:[…], tr:[…]}` — while the renderer switches on `block.type` and reads
 * `block.text`. Nothing translated between them: `toReportData` cast the array
 * straight across, so every block arrived with `type` undefined, fell through
 * the switch, and drew nothing.
 *
 * The Field report template has nine blocks of real sample content — a metrics
 * row, a roast curve, two tables — and all nine were invisible. The template
 * page showed a coloured band over an empty page, and a post started from that
 * template inherited the same silence: the editor drew ten empty rows because
 * it could not read what it had been given.
 */
type StoredBlock = {
  t?: string
  v?: string
  /** metrics: `[{ k: label, v: value }]` */
  m?: { k?: string; v?: string }[]
  /** chart: `[{ l: label, v: height }]` */
  c?: { l?: string; v?: number }[]
  /** table head and rows */
  th?: string[]
  tr?: string[][]
}

/** True when a block is already in the drawn shape — posts written since. */
function drawn(b: unknown): b is ReportBlock {
  return typeof (b as { type?: unknown })?.type === 'string'
}

function one(b: StoredBlock): ReportBlock | null {
  if (Array.isArray(b.m)) {
    const items: ReportMetric[] = b.m.map((x) => ({ label: x.k ?? '', value: x.v ?? '' }))
    return { type: 'metrics', items }
  }
  if (Array.isArray(b.c)) {
    const points: ReportChartPoint[] = b.c.map((x) => ({ label: x.l ?? '', heightPct: x.v ?? 0 }))
    return { type: 'chart', points }
  }
  if (b.t === 'table') {
    const rows: ReportTableRow[] = (b.tr ?? []).map((cells) => ({ cells }))
    return { type: 'table', table: { columns: b.th ?? [], rows } }
  }
  switch (b.t) {
    case 'meta':
      return { type: 'meta', text: b.v ?? '' }
    case 'h':
      return { type: 'heading', text: b.v ?? '' }
    case 'p':
      return { type: 'paragraph', text: b.v ?? '' }
    case 'image':
      return { type: 'image', caption: b.v ?? '' }
    default:
      return null
  }
}

/**
 * A report's blocks in the shape the renderer draws.
 *
 * Takes either shape, so a template written years ago and a post written today
 * both arrive readable. A block in neither shape is dropped rather than drawn
 * empty — an empty row on the page says "write here", which is a lie about
 * content that exists and cannot be read.
 */
export function toReportBlocks(body: unknown): ReportBlock[] {
  if (!Array.isArray(body)) return []
  return body.flatMap((b) => {
    if (drawn(b)) return [b]
    const out = one(b as StoredBlock)
    return out ? [out] : []
  })
}
