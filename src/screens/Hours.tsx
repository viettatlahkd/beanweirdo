import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  LOG_KINDS,
  STORAGE_KEY,
  TODAY,
  seedLogs,
  type LogEntry,
  type LogKind,
} from '../content/hours'
import { hoursTheme, sans } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { hoursStats, toMin } from '../lib/hoursStats'

const eyebrow: CSSProperties = {
  fontSize: 10,
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  color: hoursTheme.muted,
}

const smallLabel: CSSProperties = {
  fontSize: 9.5,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: hoursTheme.muted,
}

const tabular: CSSProperties = { fontVariantNumeric: 'tabular-nums' }

function loadLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // storage unavailable — fall through to the seed
  }
  return seedLogs()
}

/**
 * Practice — 01 / Hours. A reward-first streak view, not a 24h timeline: the
 * headline is how many days in a row something got logged. Entry form and
 * today's list sit to the right, out of the way of the thing that's supposed
 * to feel good to look at.
 */
export function Hours() {
  const [logs, setLogs] = useState<LogEntry[]>(loadLogs)
  const [statsOpen, setStatsOpen] = useState(false)
  const [dName, setDName] = useState('')
  const [dStart, setDStart] = useState('')
  const [dEnd, setDEnd] = useState('')
  const [dKind, setDKind] = useState<LogKind>('đọc')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
    } catch {
      // best effort — logs still work for this session without persistence
    }
  }, [logs])

  const stats = useMemo(() => hoursStats(logs), [logs])

  const addLog = () => {
    if (!dName.trim() || !dStart || !dEnd) return
    const mins = toMin(dEnd) - toMin(dStart)
    if (mins <= 0) return
    setLogs((ls) => [
      ...ls,
      { id: Date.now(), date: TODAY, name: dName.trim(), kind: dKind, mins, at: dStart },
    ])
    setDName('')
    setDStart('')
    setDEnd('')
  }

  const removeLog = (id: number) => setLogs((ls) => ls.filter((l) => l.id !== id))

  return (
    <div
      style={{
        background: hoursTheme.bg,
        color: hoursTheme.ink,
        minHeight: '100vh',
        padding: '44px 56px 96px',
        fontFamily: sans,
        fontWeight: 300,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 40,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 420px' }}>
          <div style={{ ...eyebrow, marginBottom: 18 }}>Practice — 01 / Hours</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22 }}>
            <div style={{ fontSize: 132, lineHeight: 0.78, letterSpacing: '-.05em', ...tabular }}>
              {stats.streakNum}
            </div>
            <div style={{ paddingBottom: 12 }}>
              <div style={{ fontSize: 19, lineHeight: 1.15 }}>ngày liên tiếp có ghi</div>
              <div style={{ fontSize: 13, color: hoursTheme.muted, marginTop: 5 }}>
                Hôm nay đã ghi {stats.todayTotal} · {stats.todayCount}
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: '0 1 300px', display: 'flex', gap: 28, paddingTop: 34 }}>
          <div>
            <div style={{ ...smallLabel, marginBottom: 6 }}>Tuần này</div>
            <div style={{ fontSize: 28, lineHeight: 1, ...tabular }}>{stats.sum7}</div>
          </div>
          <div>
            <div style={{ ...smallLabel, marginBottom: 6 }}>Trung bình / ngày</div>
            <div style={{ fontSize: 28, lineHeight: 1, ...tabular }}>{stats.avg7}</div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 40,
          alignItems: 'flex-start',
          marginTop: 44,
        }}
      >
        <div style={{ flex: '3 1 560px', minWidth: 440 }}>
          <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: hoursTheme.muted, marginBottom: 14 }}>
            Ba tuần gần nhất
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 8 }}>
            {stats.dayCells.map((d) => (
              <div
                key={d.key}
                style={{
                  background: d.bg,
                  border: d.border,
                  padding: '10px 10px 11px',
                  minHeight: 104,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: hoursTheme.muted }}>
                    {d.dow}
                  </div>
                  <div style={{ fontSize: 15, ...tabular }}>{d.num}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 10 }}>
                  {d.ticks.map((t, i) => (
                    <div key={i} title={t.n} style={{ height: 5, background: t.c }} />
                  ))}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 10, fontSize: 11, color: hoursTheme.soft, ...tabular }}>
                  {d.dur}
                </div>
              </div>
            ))}
          </div>

          <Hover
            onClick={() => setStatsOpen((v) => !v)}
            style={{
              display: 'inline-block',
              marginTop: 22,
              fontSize: 11,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              borderBottom: `1px solid #B9BDB0`,
              paddingBottom: 4,
              cursor: 'pointer',
              color: '#4A5047',
            }}
            hoverStyle={{ color: hoursTheme.accent, borderColor: hoursTheme.accent }}
          >
            {statsOpen ? 'Thu gọn ↑' : 'Mở thống kê chi tiết ↓'}
          </Hover>
        </div>

        <div style={{ flex: '1 1 280px', minWidth: 262, maxWidth: 330 }}>
          <div style={{ background: hoursTheme.card, border: `1px solid ${hoursTheme.border}`, padding: 20 }}>
            <div style={{ ...smallLabel, letterSpacing: '.18em', fontSize: 10, marginBottom: 16 }}>
              Ghi hoạt động hôm nay
            </div>
            <input
              value={dName}
              onChange={(e) => setDName(e.target.value)}
              placeholder="Làm gì"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'transparent',
                border: 0,
                borderBottom: `1px solid ${hoursTheme.borderSoft}`,
                color: hoursTheme.ink,
                fontFamily: sans,
                fontWeight: 300,
                fontSize: 15,
                padding: '8px 0 9px',
                outline: 'none',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <div style={{ ...smallLabel, marginBottom: 5 }}>Bắt đầu</div>
                <input
                  type="time"
                  value={dStart}
                  onChange={(e) => setDStart(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    border: `1px solid ${hoursTheme.border}`,
                    color: hoursTheme.ink,
                    fontFamily: sans,
                    fontWeight: 300,
                    fontSize: 14,
                    padding: '7px 8px',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <div style={{ ...smallLabel, marginBottom: 5 }}>Kết thúc</div>
                <input
                  type="time"
                  value={dEnd}
                  onChange={(e) => setDEnd(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    border: `1px solid ${hoursTheme.border}`,
                    color: hoursTheme.ink,
                    fontFamily: sans,
                    fontWeight: 300,
                    fontSize: 14,
                    padding: '7px 8px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
            <div style={{ ...smallLabel, marginBottom: 8 }}>Loại</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
              {LOG_KINDS.map((k) => (
                <Hover
                  key={k}
                  onClick={() => setDKind(k)}
                  style={{
                    fontSize: 12,
                    padding: '5px 11px',
                    border: `1px solid ${k === dKind ? hoursTheme.ink : hoursTheme.border}`,
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    color: '#4A5047',
                  }}
                  hoverStyle={{ borderColor: hoursTheme.ink }}
                >
                  {k}
                </Hover>
              ))}
            </div>
            <Hover
              onClick={addLog}
              style={{
                textAlign: 'center',
                fontSize: 12,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                padding: 12,
                background: hoursTheme.ink,
                color: hoursTheme.onInk,
                cursor: 'pointer',
              }}
              hoverStyle={{ background: hoursTheme.accent }}
            >
              Tick xong
            </Hover>
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: hoursTheme.muted, marginBottom: 10 }}>
              Đã tick hôm nay
            </div>
            {stats.logRows.map((r) => (
              <div key={r.id} style={{ borderTop: `1px solid ${hoursTheme.border}`, padding: '10px 0' }}>
                <div style={{ display: 'flex', gap: 9, alignItems: 'baseline' }}>
                  <div style={{ width: 6, height: 6, background: r.color, flex: 'none' }} />
                  <div style={{ fontSize: 14, lineHeight: 1.25, flex: 1 }}>{r.name}</div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 5,
                    paddingLeft: 15,
                    fontSize: 11,
                    color: hoursTheme.muted,
                    ...tabular,
                  }}
                >
                  <div>
                    {r.at} · {r.kind}
                  </div>
                  <Hover
                    as="div"
                    onClick={() => removeLog(r.id)}
                    style={{ cursor: 'pointer' }}
                    hoverStyle={{ color: '#C25438' }}
                  >
                    {r.dur} ✕
                  </Hover>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {statsOpen && (
        <div style={{ marginTop: 56, borderTop: `2px solid ${hoursTheme.ink}`, paddingTop: 34 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 56, marginBottom: 46 }}>
            <div>
              <div style={{ ...eyebrow, marginBottom: 8 }}>Tổng 21 ngày</div>
              <div style={{ fontSize: 44, lineHeight: 1, ...tabular }}>{stats.spanTotalTxt}</div>
            </div>
            <div>
              <div style={{ ...eyebrow, marginBottom: 8 }}>Ngày có ghi</div>
              <div style={{ fontSize: 44, lineHeight: 1, ...tabular }}>{stats.activeDaysTxt}</div>
            </div>
            <div>
              <div style={{ ...eyebrow, marginBottom: 8 }}>Ngày nhiều nhất — {stats.bestDay}</div>
              <div style={{ fontSize: 44, lineHeight: 1, ...tabular }}>{stats.bestTxt}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'flex-start' }}>
            <div style={{ flex: '2 1 460px', minWidth: 400 }}>
              <div style={{ ...eyebrow, marginBottom: 16 }}>Giờ theo ngày</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 5,
                  height: 140,
                  borderBottom: `1px solid ${hoursTheme.borderSoft}`,
                }}
              >
                {stats.chart.map((c) => (
                  <div
                    key={c.key}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}
                  >
                    <div style={{ height: c.h, background: c.c }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                {stats.chart.map((c) => (
                  <div key={c.key} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: hoursTheme.dim, ...tabular }}>
                    {c.lab}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: hoursTheme.muted, margin: '36px 0 14px' }}>
                Việc chiếm nhiều thời gian nhất
              </div>
              {stats.topNames.map((t) => (
                <div key={t.n} style={{ borderTop: `1px solid ${hoursTheme.border}`, padding: '11px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                    <div style={{ fontSize: 10, color: hoursTheme.dim, ...tabular }}>{t.rank}</div>
                    <div style={{ fontSize: 15, flex: 1 }}>{t.n}</div>
                    <div style={{ fontSize: 13, color: hoursTheme.soft, ...tabular }}>{t.dur}</div>
                  </div>
                  <div style={{ height: 3, background: hoursTheme.track, marginTop: 8 }}>
                    <div style={{ height: 3, width: t.w, background: hoursTheme.ink }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ flex: '1 1 320px', minWidth: 300 }}>
              <div style={{ ...eyebrow, marginBottom: 16 }}>Thói quen theo loại</div>
              {stats.byKind.map((b) => (
                <div key={b.k} style={{ borderTop: `1px solid ${hoursTheme.border}`, padding: '14px 0', opacity: b.dim }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <div style={{ width: 8, height: 8, background: b.color, flex: 'none' }} />
                    <div style={{ fontSize: 16, flex: 1 }}>{b.k}</div>
                    <div style={{ fontSize: 15, ...tabular }}>{b.dur}</div>
                  </div>
                  <div style={{ height: 4, background: hoursTheme.track, margin: '10px 0 8px' }}>
                    <div style={{ height: 4, width: b.w, background: b.color }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: hoursTheme.muted }}>
                    <div>{b.streak}</div>
                    <div>
                      {b.days} · {b.pct}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
