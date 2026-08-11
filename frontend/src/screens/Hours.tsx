import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  KINDS,
  KINDS_STORAGE_KEY,
  RECENT_DAYS,
  STORAGE_KEY,
  TODAY,
  kindColorMap,
  seedLogs,
  type LogEntry,
} from '../content/hours'
import { serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import {
  buildAllDays,
  byKind as computeByKind,
  chart as computeChart,
  spanStats,
  streak as computeStreak,
  toMin,
  topNames as computeTopNames,
  fmt,
} from '../lib/hoursStats'

const label: CSSProperties = {
  fontWeight: 500,
  fontSize: 9.5,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: '#7C7C70',
}

const clockFmt = (s: number) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((v) => String(v).padStart(2, '0'))
    .join(':')

function loadLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return seedLogs()
}

function loadExtraKinds(): string[] {
  try {
    const raw = localStorage.getItem(KINDS_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return []
}

function persistLogs(logs: LogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch {
    /* ignore */
  }
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx()
    ;[0, 0.45, 0.9].forEach((t) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 660
      g.gain.setValueAtTime(0, ctx.currentTime + t)
      g.gain.linearRampToValueAtTime(0.22, ctx.currentTime + t + 0.03)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.34)
      o.connect(g)
      g.connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.36)
    })
  } catch {
    /* ignore */
  }
}

/**
 * Practice — 01 / Ghi. A daily activity journal: a stopwatch/countdown rail
 * that logs straight to today, and a scrollable history of days (grouped by
 * month) where the last 7 days stay editable — rename, retime, re-kind,
 * drag between days — while everything older is a locked record.
 */
export function Hours() {
  const [logs, setLogsState] = useState<LogEntry[]>(loadLogs)
  const [extraKinds, setExtraKinds] = useState<string[]>(loadExtraKinds)
  const [statsOpen, setStatsOpen] = useState(false)
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({})
  const [kindAdding, setKindAdding] = useState(false)
  const [kindDraft, setKindDraft] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [newId, setNewId] = useState<number | null>(null)
  const [editFocus, setEditFocus] = useState<'at' | 'dur'>('dur')
  const [eName, setEName] = useState('')
  const [eMins, setEMins] = useState('')
  const [eAt, setEAt] = useState('')
  const [dKind, setDKind] = useState<string>(KINDS[0])
  const [tMode, setTMode] = useState<'up' | 'down'>('up')
  const [tRunning, setTRunning] = useState(false)
  const [tSec, setTSec] = useState(0)
  const [tTarget, setTTarget] = useState(1500)
  const [tName, setTName] = useState('')

  const modeRef = useRef(tMode)
  modeRef.current = tMode
  const tickRef = useRef<number | null>(null)

  function disarm() {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }
  function arm() {
    disarm()
    tickRef.current = window.setInterval(() => {
      if (modeRef.current === 'up') {
        setTSec((s) => s + 1)
        return
      }
      setTSec((s) => {
        const next = s - 1
        if (next <= 0) {
          disarm()
          beep()
          setTRunning(false)
          return 0
        }
        return next
      })
    }, 1000)
  }
  useEffect(() => disarm, [])

  function persist(next: LogEntry[]) {
    persistLogs(next)
    setLogsState(next)
  }

  const allKinds = useMemo(() => KINDS.concat(extraKinds), [extraKinds])
  const kindColor = useMemo(() => kindColorMap(allKinds), [allKinds])

  function addKind() {
    const v = kindDraft.trim()
    if (!v || allKinds.includes(v)) {
      setKindAdding(false)
      setKindDraft('')
      return
    }
    const extra = extraKinds.concat([v])
    try {
      localStorage.setItem(KINDS_STORAGE_KEY, JSON.stringify(extra))
    } catch {
      /* ignore */
    }
    setExtraKinds(extra)
    setKindAdding(false)
    setKindDraft('')
    setDKind(v)
  }

  function bump(id: number, n: number) {
    const cur = logs.find((x) => x.id === id)
    if (!cur) return
    const next = Math.max(5, cur.mins + n)
    persist(logs.map((x) => (x.id === id ? { ...x, mins: next } : x)))
    setEMins(String(next))
  }

  function addRow(ds: string) {
    const onDay = logs.filter((l) => l.date === ds)
    const last = onDay.slice().sort((a, b) => toMin(a.at) - toMin(b.at)).slice(-1)[0]
    const startMin = last ? Math.min(23 * 60 + 30, toMin(last.at) + last.mins + 15) : 8 * 60
    const id = Date.now()
    const at = String(Math.floor(startMin / 60)).padStart(2, '0') + ':' + String(startMin % 60).padStart(2, '0')
    persist(logs.concat([{ id, date: ds, name: '', kind: dKind, mins: 30, done: false, at }]))
    setNewId(id)
    setEditId(null)
    setEName('')
  }

  function saveTimer(mins: number) {
    if (!mins || mins < 1) return
    disarm()
    const now = new Date()
    const at = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    persist(
      logs.concat([
        { id: Date.now(), date: TODAY, name: tName.trim() || 'Phiên không tên', kind: dKind, mins, at, done: true },
      ]),
    )
    setTName('')
    setTRunning(false)
    setTSec(tMode === 'down' ? tTarget : 0)
  }

  const all = useMemo(() => buildAllDays(logs), [logs])
  const maxMins = Math.max(240, ...all.map((x) => x.mins))
  const streak = computeStreak(all)
  const todayList = logs.filter((l) => l.date === TODAY)
  const todayTotal = todayList.filter((l) => l.done !== false).reduce((a, l) => a + l.mins, 0)
  const { avg7, spanTotalTxt, activeDaysTxt, bestTxt, bestDay } = spanStats(all)
  const chart = computeChart(all)
  const topNames = computeTopNames(logs)
  const byKind = computeByKind(logs, all, allKinds, kindColor)

  const atInputRef = useRef<HTMLInputElement>(null)
  const durInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editId !== null) (editFocus === 'at' ? atInputRef : durInputRef).current?.focus()
  }, [editId, editFocus])
  useEffect(() => {
    if (newId !== null) nameInputRef.current?.focus()
  }, [newId])

  // Most recent 12 days, newest first — the window this screen renders.
  const shownDays = all.slice().reverse().slice(0, 12)

  const dayViews = shownDays.map((x) => {
    const recent = x.age < RECENT_DAYS
    const rows = (recent ? x.ls : x.ls.filter((l) => l.done !== false))
      .slice()
      .sort((a, b) => toMin(a.at) - toMin(b.at))
    const isToday = x.ds === TODAY
    return {
      ds: x.ds,
      dow: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][x.d.getDay()],
      num: String(x.d.getDate()).padStart(2, '0'),
      isToday,
      recent,
      total: x.mins ? fmt(x.mins) : '—',
      bar: x.mins ? Math.max(3, Math.round((x.mins / maxMins) * 100)) + '%' : '0%',
      dotBg: x.mins ? '#7FB87E' : '#FFFFFF',
      dotBorder: x.mins ? '#3E7A4E' : '#CFCFC4',
      pad: isToday ? '20px 16px 18px 10px' : '14px 16px 13px 10px',
      bg: isToday ? '#FCFBF7' : 'transparent',
      edge: isToday ? '#F2A0A5' : x.mins ? '#E3E3DB' : '#EDEDE6',
      labelOp: x.mins ? 1 : 0.4,
      rows,
    }
  })

  // Month groups, in the order their days first appear (newest month first).
  const monthKeys: string[] = []
  const monthDays: Record<string, typeof dayViews> = {}
  dayViews.forEach((d) => {
    const k = d.ds.slice(0, 7)
    if (!monthDays[k]) {
      monthDays[k] = []
      monthKeys.push(k)
    }
    monthDays[k].push(d)
  })
  const months = monthKeys.map((k) => {
    const inMonth = all.filter((x) => x.ds.slice(0, 7) === k)
    const mins = inMonth.reduce((a, x) => a + x.mins, 0)
    const nDays = inMonth.filter((x) => x.mins > 0).length
    const daysInMonth = new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)), 0).getDate()
    const isCur = k === '2026-02'
    const open = isCur || !!openMonths[k]
    return {
      key: k,
      label: 'Tháng ' + String(Number(k.slice(5, 7))),
      year: k.slice(0, 4),
      total: mins ? fmt(mins) : '—',
      nDays: nDays + '/' + daysInMonth + ' ngày có ghi',
      isCur,
      open,
      cue: open ? 'thu gọn ↑' : 'xổ ra ↓',
      days: monthDays[k],
    }
  })

  const tUsedSec = tMode === 'up' ? tSec : Math.max(0, tTarget - tSec)
  const tArc =
    tMode === 'down' && tTarget
      ? Math.round((1 - tSec / tTarget) * 100) + '%'
      : tSec
        ? Math.min(100, Math.round((tSec / 3600) * 100)) + '%'
        : '0%'

  function onDropDay(e: React.DragEvent, ds: string) {
    e.preventDefault()
    const id = Number(e.dataTransfer.getData('text/plain'))
    if (!id) return
    persist(logs.map((l) => (l.id === id ? { ...l, date: ds } : l)))
  }

  return (
    <div
      style={{
        background: '#FCFCFA',
        color: '#172124',
        minHeight: '100vh',
        padding: '52px 60px 110px',
      }}
    >
      <div style={{ borderBottom: '1px solid #102F35', paddingBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 56, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9.5, letterSpacing: '.34em', textTransform: 'uppercase', color: '#7C7C70', marginBottom: 18 }}>
              beӕn weirdo — 01
            </div>
            <h1
              style={{
                fontFamily: serif,
                fontWeight: 400,
                fontSize: 104,
                lineHeight: 0.8,
                letterSpacing: '-.045em',
                margin: 0,
                display: 'flex',
                alignItems: 'baseline',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ color: '#102F35' }}>Ghi</span>
              <span
                style={{
                  fontFamily: "'Be Vietnam Pro',sans-serif",
                  fontWeight: 500,
                  fontStyle: 'italic',
                  fontSize: 62,
                  letterSpacing: '-.03em',
                  color: 'oklch(0.50 0.135 14)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                2026
              </span>
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9.5, letterSpacing: '.28em', textTransform: 'uppercase', color: '#7C7C70', marginBottom: 8 }}>
              Hôm nay
            </div>
            <div style={{ fontFamily: serif, fontSize: 84, lineHeight: 0.8, letterSpacing: '-.045em', fontVariantNumeric: 'tabular-nums', color: '#102F35' }}>
              {todayTotal ? fmt(todayTotal) : '0m'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 56, flexWrap: 'wrap', marginTop: 22 }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 34, height: 8, background: '#F2A0A5', marginBottom: 5 }} />
              <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 24, lineHeight: 1.3, color: '#3E7A4E' }}>
                "We are what we repeatedly do."
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 0 46px' }}>
              <div style={{ width: 15, height: 1, background: '#A2A296' }} />
              <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 12, color: '#A2A296' }}>Will Durant</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'flex-end', alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: serif, fontSize: 38, lineHeight: 1, letterSpacing: '-.03em', color: '#3E7A4E', fontVariantNumeric: 'tabular-nums' }}>
                {streak}
              </div>
              <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#7C7C70', marginTop: 5 }}>ngày liền</div>
            </div>
            <div style={{ width: 5, height: 5, background: '#F2A0A5', marginBottom: 22 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: serif, fontSize: 38, lineHeight: 1, letterSpacing: '-.03em', color: '#8A6420', fontVariantNumeric: 'tabular-nums' }}>
                {avg7}
              </div>
              <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#7C7C70', marginTop: 5 }}>mỗi ngày</div>
            </div>
          </div>
        </div>
      </div>

      <Hover
        onClick={() => setStatsOpen((s) => !s)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 11,
          marginTop: 26,
          fontWeight: 600,
          fontSize: 11.5,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          background: statsOpen ? 'oklch(0.50 0.135 14)' : '#F2A0A5',
          color: statsOpen ? '#FFFFFF' : '#3B2A2B',
          border: `1px solid ${statsOpen ? 'oklch(0.50 0.135 14)' : '#F2A0A5'}`,
          padding: '13px 20px',
          cursor: 'pointer',
          transition: 'background .25s ease, color .25s ease',
        }}
        hoverStyle={{ background: '#102F35', color: '#F4F4EF', border: '1px solid #102F35' }}
      >
        <div style={{ width: 6, height: 6, background: 'currentColor' }} />
        <div>{statsOpen ? 'Thu gọn thống kê' : 'Mở thống kê chi tiết'}</div>
      </Hover>

      {statsOpen && (
        <div style={{ margin: '30px 0 6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 26 }}>
            <div style={{ background: '#102F35', color: '#F4F4EF', padding: '18px 20px 20px' }}>
              <div style={{ fontWeight: 500, fontSize: 9.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(244,244,239,.72)', marginBottom: 8 }}>
                Tổng 21 ngày
              </div>
              <div style={{ fontFamily: serif, fontSize: 46, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{spanTotalTxt}</div>
            </div>
            <div style={{ background: 'oklch(0.50 0.135 14)', color: 'oklch(0.97 0.018 14)', padding: '18px 20px 20px' }}>
              <div style={{ fontWeight: 500, fontSize: 9.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'oklch(0.97 0.018 14 / .8)', marginBottom: 8 }}>
                Ngày có ghi
              </div>
              <div style={{ fontFamily: serif, fontSize: 46, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{activeDaysTxt}</div>
            </div>
            <div style={{ background: '#F2A0A5', color: '#3B2A2B', padding: '18px 20px 20px' }}>
              <div style={{ fontWeight: 500, fontSize: 9.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,246,236,.75)', marginBottom: 8 }}>
                Ngày nhiều nhất — {bestDay}
              </div>
              <div style={{ fontFamily: serif, fontSize: 46, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{bestTxt}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'flex-start' }}>
            <div style={{ flex: '2 1 440px', minWidth: 0, background: '#F6F6F1', padding: '20px 22px 24px' }}>
              <div style={{ ...label, marginBottom: 16 }}>Giờ theo ngày</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 140, borderBottom: '1px solid #CFCFC4' }}>
                {chart.map((c) => (
                  <div key={c.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{ height: c.h, background: c.c }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                {chart.map((c) => (
                  <div key={c.key} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#A2A296', fontVariantNumeric: 'tabular-nums' }}>
                    {c.lab}
                  </div>
                ))}
              </div>

              <div style={{ ...label, margin: '36px 0 14px' }}>Việc chiếm nhiều thời gian nhất</div>
              {topNames.map((t) => (
                <div key={t.n} style={{ borderTop: '1px solid #E3E3DB', padding: '11px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                    <div style={{ fontSize: 10, color: '#A2A296', fontVariantNumeric: 'tabular-nums' }}>{t.rank}</div>
                    <div style={{ fontSize: 15, flex: 1 }}>{t.n}</div>
                    <div style={{ fontSize: 13, color: '#414A42', fontVariantNumeric: 'tabular-nums' }}>{t.dur}</div>
                  </div>
                  <div style={{ height: 3, background: '#E6E6DE', marginTop: 8 }}>
                    <div style={{ height: 3, width: t.w, background: '#102F35' }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ flex: '1 1 300px', minWidth: 280, background: '#F6F6F1', padding: '20px 22px 24px' }}>
              <div style={{ ...label, marginBottom: 16 }}>Thói quen theo loại</div>
              {byKind.map((b) => (
                <div key={b.k} style={{ borderTop: '1px solid #E3E3DB', padding: '14px 0', opacity: b.dim }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <div style={{ width: 8, height: 8, background: b.color, flex: 'none' }} />
                    <div style={{ fontSize: 16, flex: 1 }}>{b.k}</div>
                    <div style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{b.dur}</div>
                  </div>
                  <div style={{ height: 4, background: '#E6E6DE', margin: '10px 0 8px' }}>
                    <div style={{ height: 4, width: b.w, background: b.color }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#6A6F63' }}>
                    <div>{b.streak}</div>
                    <div>{b.days} · {b.pct}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 36, alignItems: 'flex-start', marginTop: 38, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          {months.map((mo) => (
            <div key={mo.key}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '0 0 10px', borderBottom: '2px solid #102F35' }}>
                <div style={{ fontFamily: serif, fontSize: 23, letterSpacing: '-.02em' }}>{mo.label}</div>
                <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#A2A296' }}>{mo.year}</div>
                <div style={{ flex: '1 1 0' }} />
                <div style={{ fontSize: 11.5, color: '#7C7C70' }}>{mo.nDays}</div>
                <div style={{ fontSize: 14, color: '#172124', fontVariantNumeric: 'tabular-nums' }}>{mo.total}</div>
                {!mo.isCur && (
                  <Hover
                    onClick={() => setOpenMonths((s) => ({ ...s, [mo.key]: !s[mo.key] }))}
                    style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#A2A296', cursor: 'pointer' }}
                    hoverStyle={{ color: '#102F35' }}
                  >
                    {mo.cue}
                  </Hover>
                )}
              </div>

              {mo.open &&
                mo.days.map((d) => (
                  <div
                    key={d.ds}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDropDay(e, d.ds)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '86px minmax(0,1fr)',
                      gap: 16,
                      borderTop: `1px solid ${d.edge}`,
                      background: d.bg,
                      padding: d.pad,
                    }}
                  >
                    <div style={{ opacity: d.labelOp }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.dotBg, border: `1px solid ${d.dotBorder}`, flex: 'none', marginBottom: 2 }} />
                        <div style={{ fontFamily: serif, fontSize: 31, lineHeight: 0.9, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums' }}>{d.num}</div>
                        <div style={{ fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7C7C70' }}>{d.dow}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#414A42', fontVariantNumeric: 'tabular-nums', margin: '7px 0 6px 13px' }}>{d.total}</div>
                      <div style={{ height: 2, background: '#E6E6DE', marginLeft: 13 }}>
                        <div style={{ height: 2, width: d.bar, background: '#102F35' }} />
                      </div>
                    </div>

                    <div>
                      {d.rows.length === 0 && (
                        <div style={{ fontSize: 12.5, color: '#AFAFA2', fontStyle: 'italic', padding: '6px 0' }}>chưa ghi gì</div>
                      )}
                      {d.rows.map((l) => {
                        const editing = editId === l.id
                        const naming = newId === l.id
                        const color = kindColor[l.kind] || '#163F42'
                        const done = l.done !== false
                        const cursor = d.recent ? 'pointer' : 'default'
                        return (
                          <div
                            key={l.id}
                            draggable={d.recent}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', String(l.id))
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            style={{ padding: '6px 0', borderBottom: '1px solid #EAE7DA' }}
                          >
                            {!editing && (
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <div
                                  onClick={() => {
                                    if (!d.recent) return
                                    persist(logs.map((x) => (x.id === l.id ? { ...x, done: x.done === false } : x)))
                                  }}
                                  style={{
                                    width: 15,
                                    height: 15,
                                    flex: 'none',
                                    marginTop: 14,
                                    border: `1px solid ${done ? color : '#B9B6A6'}`,
                                    background: done ? color : 'transparent',
                                    color: '#F6F2E6',
                                    fontSize: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor,
                                  }}
                                >
                                  {done ? '✓' : ''}
                                </div>
                                <div style={{ flex: '1 1 auto', minWidth: 120 }}>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 11, flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color }}>{l.kind}</div>
                                    <Hover
                                      onClick={() => {
                                        if (!d.recent) return
                                        setEditId(l.id)
                                        setNewId(null)
                                        setEditFocus('at')
                                        setEMins(String(l.mins))
                                        setEAt(l.at)
                                      }}
                                      style={{ fontSize: 12, color: '#414A42', fontVariantNumeric: 'tabular-nums', cursor, padding: '1px 4px', marginLeft: -4 }}
                                      hoverStyle={d.recent ? { background: '#EDE9D6' } : undefined}
                                    >
                                      {l.at}
                                    </Hover>
                                    {!d.recent && <div style={{ fontSize: 10.5, color: '#AFAFA2' }}>✓ chốt</div>}
                                  </div>
                                  {!naming && (
                                    <div
                                      onClick={() => {
                                        if (!d.recent) return
                                        setNewId(l.id)
                                        setEditId(null)
                                        setEName(l.name)
                                      }}
                                      style={{
                                        fontSize: 15,
                                        lineHeight: 1.3,
                                        marginTop: 2,
                                        color: l.done === false ? '#8A8A7C' : '#172124',
                                        fontStyle: l.done === false ? 'italic' : 'normal',
                                        cursor,
                                      }}
                                    >
                                      {l.name || '(chưa đặt tên)'}
                                    </div>
                                  )}
                                  {naming && (
                                    <input
                                      ref={nameInputRef}
                                      value={eName}
                                      onChange={(e) => setEName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                        if (e.key === 'Escape') setNewId(null)
                                      }}
                                      onBlur={() => {
                                        if (newId !== l.id) return
                                        const nm = eName.trim()
                                        persist(
                                          nm
                                            ? logs.map((x) => (x.id === l.id ? { ...x, name: nm } : x))
                                            : logs.filter((x) => x.id !== l.id),
                                        )
                                        setNewId(null)
                                      }}
                                      placeholder="Hoạt động gì"
                                      style={{
                                        display: 'block',
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        background: 'transparent',
                                        border: 0,
                                        borderBottom: '1px solid #102F35',
                                        color: '#172124',
                                        fontFamily: "'Be Vietnam Pro',sans-serif",
                                        fontWeight: 200,
                                        fontSize: 15,
                                        lineHeight: 1.3,
                                        marginTop: 2,
                                        padding: '0 0 3px',
                                        outline: 'none',
                                      }}
                                    />
                                  )}
                                </div>
                                <Hover
                                  onClick={() => {
                                    if (!d.recent) return
                                    setEditId(l.id)
                                    setNewId(null)
                                    setEditFocus('dur')
                                    setEMins(String(l.mins))
                                    setEAt(l.at)
                                  }}
                                  style={{ flex: 'none', marginTop: 11, fontSize: 16, color: '#172124', fontVariantNumeric: 'tabular-nums', textAlign: 'right', cursor, padding: '2px 4px' }}
                                  hoverStyle={d.recent ? { background: '#EDE9D6' } : undefined}
                                >
                                  {fmt(l.mins)}
                                </Hover>
                              </div>
                            )}
                            {editing && (
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ width: 15, flex: 'none' }} />
                                <div style={{ flex: '1 1 auto', minWidth: 120 }}>
                                  <div style={{ background: '#F1F4EF', borderLeft: '2px solid #102F35', padding: '9px 11px 10px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                                      <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7C7C70' }}>Từ</div>
                                      <input
                                        ref={atInputRef}
                                        value={eAt}
                                        onChange={(e) => setEAt(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                          if (e.key === 'Escape') setEditId(null)
                                        }}
                                        onBlur={() => {
                                          if (editId !== l.id) return
                                          const m = parseInt(eMins, 10)
                                          const at = /^\d{1,2}:\d{2}$/.test(eAt) ? eAt : l.at
                                          persist(
                                            logs.map((x) =>
                                              x.id === l.id ? { ...x, name: eName || x.name, mins: m > 0 ? m : x.mins, at } : x,
                                            ),
                                          )
                                          setEditId(null)
                                        }}
                                        style={{
                                          width: 52,
                                          background: 'transparent',
                                          border: 0,
                                          borderBottom: `1px solid ${editFocus === 'at' ? '#3E7A4E' : '#CFCFC4'}`,
                                          color: '#172124',
                                          fontFamily: "'Be Vietnam Pro',sans-serif",
                                          fontWeight: 200,
                                          fontSize: 15,
                                          padding: '0 0 2px',
                                          outline: 'none',
                                          fontVariantNumeric: 'tabular-nums',
                                        }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: editFocus === 'dur' ? '#EFE9D4' : 'transparent', padding: '2px 5px', margin: '0 -5px' }}>
                                      <Hover
                                        onClick={() => bump(l.id, -5)}
                                        style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #CFCFC4', fontSize: 14, color: '#414A42', cursor: 'pointer' }}
                                        hoverStyle={{ border: '1px solid #102F35', color: '#102F35' }}
                                      >
                                        −
                                      </Hover>
                                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                        <input
                                          ref={durInputRef}
                                          value={eMins}
                                          onChange={(e) => setEMins(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                            if (e.key === 'Escape') setEditId(null)
                                          }}
                                          onBlur={() => {
                                            if (editId !== l.id) return
                                            const m = parseInt(eMins, 10)
                                            const at = /^\d{1,2}:\d{2}$/.test(eAt) ? eAt : l.at
                                            persist(
                                              logs.map((x) =>
                                                x.id === l.id ? { ...x, name: eName || x.name, mins: m > 0 ? m : x.mins, at } : x,
                                              ),
                                            )
                                            setEditId(null)
                                          }}
                                          style={{
                                            width: 38,
                                            background: 'transparent',
                                            border: 0,
                                            borderBottom: `1px solid ${editFocus === 'dur' ? '#3E7A4E' : '#CFCFC4'}`,
                                            color: '#172124',
                                            fontFamily: "'Be Vietnam Pro',sans-serif",
                                            fontWeight: 200,
                                            fontSize: 15,
                                            padding: '0 0 2px',
                                            outline: 'none',
                                            textAlign: 'right',
                                            fontVariantNumeric: 'tabular-nums',
                                          }}
                                        />
                                        <div style={{ fontSize: 11, color: '#7C7C70' }}>phút</div>
                                      </div>
                                      <Hover
                                        onClick={() => bump(l.id, 5)}
                                        style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #CFCFC4', fontSize: 14, color: '#414A42', cursor: 'pointer' }}
                                        hoverStyle={{ border: '1px solid #102F35', color: '#102F35' }}
                                      >
                                        +
                                      </Hover>
                                    </div>
                                    <div style={{ flex: '1 1 0' }} />
                                    <Hover
                                      onClick={() => {
                                        persist(logs.filter((x) => x.id !== l.id))
                                        setEditId(null)
                                      }}
                                      style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7C7C70', cursor: 'pointer' }}
                                      hoverStyle={{ color: '#F2A0A5' }}
                                    >
                                      Xoá
                                    </Hover>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 7, flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: 15, lineHeight: 1.3, color: l.done === false ? '#8A8A7C' : '#172124', fontStyle: l.done === false ? 'italic' : 'normal' }}>
                                      {l.name || '(chưa đặt tên)'}
                                    </div>
                                    <Hover
                                      onClick={() => {
                                        setNewId(l.id)
                                        setEditId(null)
                                        setEName(l.name)
                                      }}
                                      style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#A2A296', cursor: 'pointer', flex: 'none' }}
                                      hoverStyle={{ color: '#102F35' }}
                                    >
                                      sửa tên
                                    </Hover>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 7 }}>
                                    <div style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7C7C70' }}>Loại</div>
                                    <select
                                      value={l.kind}
                                      onChange={(e) => persist(logs.map((x) => (x.id === l.id ? { ...x, kind: e.target.value } : x)))}
                                      style={{
                                        background: '#FFFFFF',
                                        border: '1px solid #CFCFC4',
                                        color,
                                        fontFamily: "'Be Vietnam Pro',sans-serif",
                                        fontWeight: 200,
                                        fontSize: 12.5,
                                        padding: '4px 7px',
                                        outline: 'none',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {allKinds.map((k) => (
                                        <option key={k} value={k}>
                                          {k}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {d.recent && (
                        <Hover
                          onClick={() => addRow(d.ds)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0 2px', cursor: 'pointer', color: '#A2A296' }}
                          hoverStyle={{ color: '#102F35' }}
                        >
                          <div style={{ width: 15, height: 15, flex: 'none', border: '1px dashed currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>+</div>
                          <div style={{ fontSize: 12.5 }}>thêm hoạt động</div>
                        </Hover>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>

        <div style={{ flex: '0 1 316px', minWidth: 262, position: 'sticky', top: 32 }}>
          <div style={{ background: 'linear-gradient(168deg, #143C43 0%, #0D272C 100%)', color: '#F4F4EF', padding: '26px 24px 24px' }}>
            <div style={{ display: 'flex', gap: 18, marginBottom: 22, fontWeight: 500, fontSize: 9.5, letterSpacing: '.2em', textTransform: 'uppercase' }}>
              <div
                onClick={() => {
                  disarm()
                  setTMode('up')
                  setTRunning(false)
                  setTSec(0)
                }}
                style={{
                  cursor: 'pointer',
                  paddingBottom: 4,
                  borderBottom: `1px solid ${tMode === 'up' ? '#F2A0A5' : 'transparent'}`,
                  color: tMode === 'up' ? '#EDE9DC' : 'rgba(244,244,239,.55)',
                }}
              >
                Bấm giờ
              </div>
              <div
                onClick={() => {
                  disarm()
                  setTMode('down')
                  setTRunning(false)
                  setTSec(tTarget)
                }}
                style={{
                  cursor: 'pointer',
                  paddingBottom: 4,
                  borderBottom: `1px solid ${tMode === 'down' ? '#F2A0A5' : 'transparent'}`,
                  color: tMode === 'down' ? '#EDE9DC' : 'rgba(244,244,239,.55)',
                }}
              >
                Hẹn giờ
              </div>
            </div>

            <div style={{ fontFamily: serif, fontSize: 66, lineHeight: 0.9, letterSpacing: '-.04em', fontVariantNumeric: 'tabular-nums' }}>
              {clockFmt(tSec)}
            </div>
            <div style={{ height: 2, background: 'rgba(244,244,239,.22)', margin: '16px 0 20px' }}>
              <div style={{ height: 2, width: tArc, background: '#F2A0A5' }} />
            </div>

            {tMode === 'down' && (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                  {[15, 25, 45, 60].map((m) => {
                    const picked = tTarget === m * 60
                    return (
                      <div
                        key={m}
                        onClick={() => {
                          disarm()
                          setTTarget(m * 60)
                          setTSec(m * 60)
                          setTMode('down')
                          setTRunning(false)
                        }}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          fontSize: 12,
                          padding: '7px 0',
                          border: '1px solid rgba(244,244,239,.35)',
                          cursor: 'pointer',
                          background: picked ? '#F2A0A5' : 'transparent',
                          color: picked ? '#1F3323' : 'rgba(247,244,233,.82)',
                        }}
                      >
                        {m}′
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(244,244,239,.6)', marginBottom: 18 }}>Hết giờ sẽ có tiếng báo.</div>
              </>
            )}

            <input
              value={tName}
              onChange={(e) => setTName(e.target.value)}
              placeholder="Đang làm gì"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'transparent',
                border: 0,
                borderBottom: '1px solid rgba(244,244,239,.55)',
                color: '#FFFFFF',
                fontFamily: "'Be Vietnam Pro',sans-serif",
                fontWeight: 200,
                fontSize: 15,
                padding: '8px 0 9px',
                outline: 'none',
                marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {allKinds.map((k) => {
                const picked = k === dKind
                return (
                  <div
                    key={k}
                    onClick={() => setDKind(k)}
                    style={{
                      fontSize: 12,
                      padding: '5px 11px',
                      border: '1px solid rgba(244,244,239,.3)',
                      cursor: 'pointer',
                      background: picked ? '#F2A0A5' : 'transparent',
                      color: picked ? '#1F3323' : 'rgba(247,244,233,.82)',
                    }}
                  >
                    {k}
                  </div>
                )
              })}
              {kindAdding && (
                <input
                  autoFocus
                  value={kindDraft}
                  onChange={(e) => setKindDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addKind()
                    if (e.key === 'Escape') {
                      setKindAdding(false)
                      setKindDraft('')
                    }
                  }}
                  onBlur={addKind}
                  placeholder="loại mới"
                  style={{
                    width: 86,
                    background: 'transparent',
                    border: '1px solid #F2A0A5',
                    color: '#FFFFFF',
                    fontFamily: "'Be Vietnam Pro',sans-serif",
                    fontWeight: 200,
                    fontSize: 12,
                    padding: '5px 8px',
                    outline: 'none',
                  }}
                />
              )}
              {!kindAdding && (
                <Hover
                  onClick={() => {
                    setKindAdding(true)
                    setKindDraft('')
                  }}
                  style={{
                    width: 26,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px 0',
                    border: '1px dashed rgba(244,244,239,.4)',
                    cursor: 'pointer',
                    color: 'rgba(244,244,239,.8)',
                  }}
                  hoverStyle={{ border: '1px dashed #F2A0A5', color: '#F2A0A5' }}
                >
                  +
                </Hover>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Hover
                onClick={() => {
                  const run = !tRunning
                  if (run) arm()
                  else disarm()
                  setTRunning(run)
                }}
                style={{ flex: 1, textAlign: 'center', fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', padding: 13, background: '#F2A0A5', color: '#3B2A2B', cursor: 'pointer' }}
                hoverStyle={{ background: '#F6B4B8' }}
              >
                {tRunning ? 'Tạm dừng' : tSec ? 'Tiếp tục' : 'Bắt đầu'}
              </Hover>
              <Hover
                onClick={() => {
                  disarm()
                  setTRunning(false)
                  setTSec(tMode === 'down' ? tTarget : 0)
                }}
                style={{ flex: 'none', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', padding: '13px 15px', border: '1px solid rgba(244,244,239,.35)', cursor: 'pointer' }}
                hoverStyle={{ border: '1px solid #F4F4EF' }}
              >
                Đặt lại
              </Hover>
            </div>

            <Hover
              onClick={() => saveTimer(Math.round(tUsedSec / 60))}
              style={{
                marginTop: 12,
                textAlign: 'center',
                padding: '17px 14px 16px',
                background: '#F4F4EF',
                color: 'oklch(0.50 0.135 14)',
                cursor: 'pointer',
                transition: 'background .25s ease, color .25s ease',
              }}
              hoverStyle={{ background: '#FFFFFF', color: 'oklch(0.42 0.125 14)' }}
            >
              <div style={{ fontFamily: serif, fontSize: 25, lineHeight: 1, letterSpacing: '-.02em' }}>Hoàn thành</div>
              <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", fontWeight: 500, fontSize: 11.5, letterSpacing: '.1em', marginTop: 7 }}>
                Ghi vào hoạt động · {fmt(Math.round(tUsedSec / 60))}
              </div>
            </Hover>
          </div>

          <div style={{ marginTop: 22, fontSize: 12.5, lineHeight: 1.6, color: '#6A6F63' }}>
            Phiên đếm lên chạy tới khi bạn dừng. Hẹn giờ dùng cho việc cần giới hạn — hết giờ có tiếng báo, rồi bấm tick để ghi vào ngày.
          </div>
        </div>
      </div>
    </div>
  )
}
