import { useState, type CSSProperties } from 'react'
import { hashtag, type LogEntry } from '../content/hours'
import { serif, space } from '../design/tokens'
import {
  NO_PROJECT,
  byProject,
  fmt,
  heatmap,
  neglected,
  periodStats,
  usefulRatio,
} from '../lib/hoursStats'

const label: CSSProperties = {
  fontWeight: 500,
  fontSize: 9,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: '#A2A296',
}

const figure: CSSProperties = {
  fontFamily: serif,
  fontSize: 30,
  lineHeight: 1,
  letterSpacing: '-.02em',
  fontVariantNumeric: 'tabular-nums',
}

/** Pale to deep, matching the journal's green. Index 0 is a day left unlogged. */
const HEAT = ['#EDEDE6', '#D6E4DA', '#A9CBB4', '#7FB292', '#3E7A4E']

/**
 * A day the journal did not exist for: before the first entry, or later than
 * today. Barely there — it has to read as "not counted" rather than as a
 * lighter shade of "nothing done", or a young journal looks like a long lapse.
 */
const OUTSIDE: CSSProperties = { background: 'transparent', border: '1px solid #F1F0EA' }

const DOW = ['T2', '', 'T4', '', 'T6', '', 'CN']

/**
 * A day square, at most this wide.
 *
 * The grid used to take whatever width the column gave it, which on a wide
 * screen blew one day up to seventy pixels — squares the size of buttons,
 * reading as a wall rather than as a habit.
 *
 * The first fix capped them at fourteen and kept half a year of columns, which
 * overcorrected: a quarter of the width went to weeks that predate the journal,
 * and each square was too small to tell two shades apart. Thirteen weeks at
 * this size fills the column instead — see HEAT_WEEKS.
 *
 * It is a cap, not a fixed size — the squares still shrink on a narrow screen.
 */
const CELL = 24
const GAP = 4

/**
 * The panel reads as two bands: the project ranking across the top, then the
 * heatmap beside the kinds of work.
 *
 * The heatmap used to have the whole width to itself, which pushed everything
 * that answers *where did the time go* below the fold — and the grid never
 * wanted that width anyway.
 *
 * Written as a stylesheet rather than inline styles because the widths have to
 * respond to the viewport, and `style={}` cannot hold a media query. The column
 * count steps down before the rows get too narrow to read a name and a figure
 * on one line.
 */
const CSS = `
/*
 * Everything here counts in the house rhythm — 8 / 20 / 40 / 64, the space
 * scale in design/tokens. The panel had been written in numbers of its own — 26,
 * 34, 13, 4 — which is why the bands kept reading as crowded no matter which
 * one got nudged: they were near the rhythm without ever landing on it.
 */
.sp-list { display: grid; gap: 20px; grid-template-columns: 1fr; }
.sp-lower {
  display: grid;
  gap: 40px;
  grid-template-columns: 1fr;
  align-items: start;
  /* The same step the tiles take down to the project heading — one gap for one
     kind of break, so the panel has a single rhythm rather than a hierarchy of
     its own. No rule: a line here made the band above look closed off. */
  margin-top: 40px;
}
@media (min-width: 560px) {
  .sp-list { grid-template-columns: 1fr 1fr; column-gap: 40px; }
}
@media (min-width: 860px) {
  /* The heatmap has a ceiling of its own, so the kinds column takes whatever
     is left rather than splitting the row down the middle. */
  .sp-lower { grid-template-columns: minmax(0, auto) minmax(220px, 1fr); column-gap: 64px; }
}
`

function Tile({
  caption,
  value,
  note,
  background,
  ink,
  border,
}: {
  caption: string
  value: string
  note?: string
  background: string
  ink: string
  border?: string
}) {
  return (
    <div style={{ background, color: ink, border: border ?? 'none', padding: '14px 16px 16px' }}>
      <div style={{ ...label, color: 'currentColor', opacity: 0.72, marginBottom: 8 }}>{caption}</div>
      <div style={figure}>{value}</div>
      {note && <div style={{ fontSize: 10.5, opacity: 0.68, marginTop: 5 }}>{note}</div>}
    </div>
  )
}

/**
 * The statistics panel.
 *
 * The old one led with "total over 21 days" — a window nobody chose, being
 * however much history the day list happened to fetch — and ranked activities
 * by name, which is the journal read back rather than anything learned from it.
 *
 * What replaced it answers three questions the owner actually asks: where is
 * the time going (by project, because that is the unit of intent — the kind of
 * work is a secondary reading), is the habit steady (the heatmap), and how much
 * is being done at once (useful over real).
 */
export function StatsPanel({
  logs,
  projects,
  projectColor,
  kindColor,
  kinds,
}: {
  logs: LogEntry[]
  projects: string[]
  projectColor: Record<string, string>
  kindColor: Record<string, string>
  kinds: string[]
}) {
  const [allKinds, setAllKinds] = useState(false)

  const period = periodStats(logs)
  const ratio = usefulRatio(logs)
  const grid = heatmap(logs)
  const rows = byProject(logs, projects, projectColor)
  const quiet = neglected(logs, projects)

  const totalMins = rows.reduce((a, r) => a + r.mins, 0)
  const kindRows = kinds
    .map((k) => ({
      k,
      mins: logs.filter((l) => l.kind === k && l.done !== false).reduce((a, l) => a + l.mins, 0),
    }))
    .filter((x) => x.mins > 0)
    .sort((a, b) => b.mins - a.mins)

  /**
   * The kinds that get read, and the rest behind a click.
   *
   * The list runs as long as the tag system does — a dozen kinds turn a glance
   * into a scan, and the tail of it is minutes, not hours. Seven is where the
   * ranking stops telling you anything you did not already have.
   */
  const KIND_TOP = 7
  const shownKinds = allKinds ? kindRows : kindRows.slice(0, KIND_TOP)
  const hiddenKinds = kindRows.length - shownKinds.length

  const deltaTxt =
    period.mtdDelta === null
      ? undefined
      : period.mtdDelta === 0
        ? 'ngang tháng trước'
        : `${period.mtdDelta > 0 ? '▲' : '▼'} ${fmt(Math.abs(period.mtdDelta))} so tháng trước`

  return (
    <div style={{ margin: '30px 0 6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: space.gap, marginBottom: space.column }}>
        <Tile caption="Tháng này" value={period.mtdTxt} note={deltaTxt} background="#102F35" ink="#F4F4EF" />
        <Tile
          caption="Tuần này"
          value={period.weekTxt}
          note={`${period.weekPerDayTxt} mỗi ngày`}
          background="oklch(0.50 0.135 14)"
          ink="#FFF5F2"
        />
        <Tile caption="7 ngày qua" value={period.last7Txt} note={period.last7DaysTxt} background="#F2A0A5" ink="#3B2A2B" />
        <Tile
          caption="Hữu ích / Thực tế"
          value={ratio.ratioTxt}
          note={`${ratio.usefulTxt} / ${ratio.realTxt}`}
          background="#EAF1EF"
          ink="#143C43"
          border="1px solid #D2E0DD"
        />
      </div>

      <style>{CSS}</style>

      {/* Where the time went, first — the ranking the owner asked to lead
          with. Two columns, so eight projects cost four rows of height
          instead of eight. */}
      <div>
        <div style={{ ...label, marginBottom: space.inner }}>Theo project</div>
        {totalMins === 0 ? (
          <div style={{ fontSize: 12.5, color: '#A2A296' }}>Chưa có giờ nào được ghi.</div>
        ) : (
          <div className="sp-list">
            {rows.map((r) => (
              <div key={r.name} style={{ opacity: r.mins ? 1 : 0.45 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      flex: 'none',
                      background: r.name === NO_PROJECT ? 'transparent' : r.color,
                      border: r.name === NO_PROJECT ? '1px dashed #A2A296' : 'none',
                    }}
                  />
                  <span style={{ fontSize: 12.5, flex: 1, minWidth: 0 }}>
                    {r.name === NO_PROJECT ? r.name : hashtag(r.name)}
                  </span>
                  <span style={{ fontFamily: serif, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>
                    {r.durTxt}
                  </span>
                  <span style={{ fontSize: 10, color: '#8A8A7C', width: 32, textAlign: 'right' }}>
                    {r.pct}%
                  </span>
                </div>
                <div style={{ height: 4, background: '#EDEDE6' }}>
                  <div style={{ height: 4, width: r.pct + '%', background: r.color }} />
                </div>
                <div style={{ fontSize: 9.5, color: '#A2A296', marginTop: 4 }}>
                  {r.count} hoạt động · {r.lastTxt}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Then the shape of the habit, beside the kinds of work. The grid
          is 439px wide at most (see CELL), so giving it a neighbour costs
          nothing and saves a full screenful of scrolling. */}
      <div className="sp-lower">
        <div>
          {/* One square per day. The shades are cut against the busiest day in the
              window rather than fixed hour marks, so a quiet stretch still shows
              its own rhythm instead of washing out to a single pale tone. */}
          <div style={{ ...label, marginBottom: space.inner }}>Đều đặn · {grid.weeks} tuần</div>
          <div
            style={{
              display: 'flex',
              gap: 5,
              marginBottom: 8,
              maxWidth: 21 + grid.weeks * CELL + (grid.weeks - 1) * GAP,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateRows: 'repeat(7,1fr)',
                gap: GAP,
                fontSize: 8.5,
                color: '#B4B2A9',
                flex: 'none',
                width: 16,
              }}
            >
              {DOW.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                  {d}
                </div>
              ))}
            </div>
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: `repeat(${grid.weeks},minmax(0,1fr))`,
                gridTemplateRows: 'repeat(7,1fr)',
                gridAutoFlow: 'column',
                gap: GAP,
              }}
            >
              {grid.cells.map((c) => (
                <div
                  key={c.ds}
                  title={
                    c.outside
                      ? `${c.ds.slice(5)} · ngoài khoảng ghi`
                      : `${c.ds.slice(5)} · ${c.mins ? fmt(c.mins) : 'không ghi'}`
                  }
                  style={{
                    ...(c.outside ? OUTSIDE : { background: HEAT[c.level] }),
                    boxSizing: 'border-box',
                    aspectRatio: '1',
                    gridColumn: c.week + 1,
                    gridRow: c.day + 1,
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: space.inner, fontSize: 10.5, color: '#8A8A7C', marginBottom: 0, flexWrap: 'wrap', rowGap: space.gap }}>
            <span>
              chuỗi hiện tại <strong style={{ fontWeight: 500, color: '#172124' }}>{grid.current} ngày</strong>
            </span>
            <span>
              dài nhất <strong style={{ fontWeight: 500, color: '#172124' }}>{grid.best} ngày</strong>
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ ...OUTSIDE, width: 9, height: 9, display: 'inline-block', boxSizing: 'border-box' }} />
              <span style={{ marginRight: 8 }}>chưa ghi nhật ký</span>
              ít
              {HEAT.map((c) => (
                <span key={c} style={{ width: 9, height: 9, background: c, display: 'inline-block' }} />
              ))}
              nhiều
            </span>
          </div>

        </div>

        <div className="sp-kind">
          <div style={{ ...label, marginBottom: space.inner }}>Theo loại việc</div>
          {kindRows.length === 0 ? (
            <div style={{ fontSize: 12.5, color: '#A2A296' }}>—</div>
          ) : (
            <div style={{ display: 'grid', gap: 11, fontSize: 12.5 }}>
              {shownKinds.map((r) => (
                <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, background: kindColor[r.k] ?? '#A2A296', flex: 'none' }} />
                  <span style={{ flex: 1, minWidth: 0 }}>{r.k}</span>
                  <span style={{ color: '#6A6F63', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.mins)}</span>
                </div>
              ))}
              {(hiddenKinds > 0 || allKinds) && (
                <div
                  onClick={() => setAllKinds((v) => !v)}
                  style={{ fontSize: 11, color: '#A2A296', cursor: 'pointer', marginTop: 2 }}
                >
                  {allKinds ? 'thu gọn ↑' : `còn ${hiddenKinds} loại nữa ↓`}
                </div>
              )}
            </div>
          )}

          {/* A total says where the time went; it says nothing about what
              stopped getting any. */}
          {quiet.length > 0 && (
            <>
              <div style={{ ...label, margin: `${space.column}px 0 ${space.inner}px` }}>Lâu chưa đụng tới</div>
              <div style={{ display: 'grid', gap: 11, fontSize: 12.5 }}>
                {quiet.map((q) => (
                  <div key={q.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        background: projectColor[q.name] ?? '#A2A296',
                        flex: 'none',
                        opacity: 0.5,
                      }}
                    />
                    <span style={{ flex: 1, minWidth: 0, color: '#6A6F63' }}>{hashtag(q.name)}</span>
                    <span style={{ color: '#A2A296', fontVariantNumeric: 'tabular-nums' }}>{q.txt}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
