import { useMemo, useState, type CSSProperties } from 'react'
import { ActivityRow } from '../components/ActivityRow'
import { TagBar, TimerAddTag, type TagFilter, type TagSystem } from '../components/TagBar'
import { TagDeleteReview, type TagTarget } from '../components/TagDeleteReview'
import { Breadcrumbs } from '../components/Breadcrumbs'
import {
  RECENT_DAYS,
  hashtag,
  kindColorMap,
  projectColorMap,
  quoteOfTheDay,
  todayStr,
  withUnclassified,
} from '../content/hours'
import { useHours } from '../data/useHours'
import { serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { MAX_SESSION_HOURS, useSessionTimer } from '../lib/useSessionTimer'
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

/**
 * Countdown lengths on the quarter-hour, matching the step a browser's own
 * time control uses. Anything else is typed into the `+` beside them.
 */
const TIMER_PRESETS = [15, 30, 45, 60]

/** Longest countdown the `+` will take, in minutes. */
const MAX_TARGET_MINS = 12 * 60

/**
 * The `+` at the end of the countdown presets: type a length in minutes.
 *
 * Declared at module scope, not inside `Hours` — a component declared inside
 * another is a new type on every render, which tears its input out of the DOM
 * between keystrokes and breaks Vietnamese input (see TagBar's AddControl).
 */
function CustomTarget({ onPick }: { onPick: (mins: number) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  function commit() {
    const mins = Math.round(Number(draft))
    setOpen(false)
    setDraft('')
    if (Number.isFinite(mins) && mins > 0) onPick(Math.min(mins, MAX_TARGET_MINS))
  }

  if (open) {
    return (
      <input
        autoFocus
        type="number"
        min={1}
        max={MAX_TARGET_MINS}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setOpen(false)
            setDraft('')
          }
        }}
        onBlur={commit}
        aria-label="Số phút tự đặt"
        placeholder="phút"
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: 'center',
          fontSize: 12,
          padding: '6px 0',
          background: 'transparent',
          border: '1px solid #F2A0A5',
          color: '#FFFFFF',
          fontFamily: "'Be Vietnam Pro',sans-serif",
          outline: 'none',
        }}
      />
    )
  }

  return (
    <Hover
      onClick={() => {
        setOpen(true)
        setDraft('')
      }}
      role="button"
      aria-label="Tự đặt số phút"
      style={{
        flex: 'none',
        width: 34,
        textAlign: 'center',
        fontSize: 12,
        padding: '7px 0',
        border: '1px dashed rgba(244,244,239,.4)',
        cursor: 'pointer',
        color: 'rgba(244,244,239,.8)',
      }}
      hoverStyle={{ borderColor: '#F2A0A5', color: '#F2A0A5' }}
    >
      +
    </Hover>
  )
}

/** `label`'s counterpart inside the dark timer rail. */
const railLabel: CSSProperties = {
  fontWeight: 500,
  fontSize: 9,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: 'rgba(244,244,239,.55)',
}

const clockFmt = (s: number) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((v) => String(v).padStart(2, '0'))
    .join(':')

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
  const {
    logs,
    kinds: allKinds,
    projects,
    loading,
    error,
    add,
    patch,
    remove,
    addTag,
    renameTag,
    removeTag,
  } = useHours()
  // A fresh "today" each render would drift across midnight mid-session; one
  // per mount is what the rest of the screen compares against.
  const today = useMemo(() => todayStr(), [])
  const [statsOpen, setStatsOpen] = useState(false)
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({})
  /** Tag picked in the bar, from either system — null shows everything. */
  const [tagFilter, setTagFilter] = useState<TagFilter>(null)
  /** The tag whose deletion is being worked out, if any. */
  const [deleting, setDeleting] = useState<TagTarget | null>(null)
  const [newId, setNewId] = useState<string | null>(null)
  // The clock reads the time rather than counting ticks, and it carries the
  // session's name and tags so a reload gives back the whole session — see
  // useSessionTimer.
  const timer = useSessionTimer({ onFinish: beep })
  const {
    mode: tMode,
    target: tTarget,
    running: tRunning,
    sec: tSec,
    usedSec: tUsedSec,
    onScreenOnly,
    suspended,
    name: tName,
    kind: dKind,
    project: dProject,
    setName: setTName,
    setKind: setDKind,
    setProject: setDProject,
  } = timer

  // The unclassified bucket has no row in `activity_kinds`, so the stats have
  // to be told about it or the hours it holds vanish from every total.
  const statKinds = useMemo(() => withUnclassified(allKinds, logs), [allKinds, logs])
  const kindColor = useMemo(() => kindColorMap(statKinds), [statKinds])
  const projectColor = useMemo(() => projectColorMap(projects), [projects])
  // One quote per calendar day, same for every visit that day.
  const quote = useMemo(() => quoteOfTheDay(), [])

  /**
   * Add an empty row and put the cursor in it — the name is typed in place,
   * and an unnamed row that loses focus deletes itself (rule 08).
   */
  async function addRow(ds: string) {
    const onDay = logs.filter((l) => l.date === ds)
    const last = onDay.slice().sort((a, b) => toMin(a.at) - toMin(b.at)).slice(-1)[0]
    const startMin = last ? Math.min(23 * 60 + 30, toMin(last.at) + last.mins + 15) : 8 * 60
    const at = String(Math.floor(startMin / 60)).padStart(2, '0') + ':' + String(startMin % 60).padStart(2, '0')
    const saved = await add({ date: ds, name: '', kind: dKind, mins: 30, done: false, at })
    if (!saved) return
    setNewId(saved.id)
  }

  function saveTimer(mins: number) {
    if (!mins || mins < 1) return
    const now = new Date()
    // A session that ran across tabs still started when it started — the row is
    // stamped with the wall-clock time the stopwatch was set going.
    const startedAt = new Date(now.getTime() - mins * 60_000)
    const at =
      String(startedAt.getHours()).padStart(2, '0') + ':' + String(startedAt.getMinutes()).padStart(2, '0')
    void add({
      date: today,
      name: tName.trim() || 'Phiên không tên',
      kind: dKind,
      project: dProject,
      mins,
      at,
      done: true,
    })
    timer.reset()
  }

  const all = useMemo(() => buildAllDays(logs), [logs])
  const maxMins = Math.max(240, ...all.map((x) => x.mins))
  const streak = computeStreak(all)
  const todayList = logs.filter((l) => l.date === today)
  const todayTotal = todayList.filter((l) => l.done !== false).reduce((a, l) => a + l.mins, 0)
  const { avg7, spanTotalTxt, activeDaysTxt, bestTxt, bestDay } = spanStats(all)
  const chart = computeChart(all)
  const topNames = computeTopNames(logs)
  const byKind = computeByKind(logs, all, statKinds, kindColor)

  // Most recent 12 days, newest first — the window this screen renders.
  const shownDays = all.slice().reverse().slice(0, 12)

  const dayViews = shownDays.map((x) => {
    const recent = x.age < RECENT_DAYS
    const rows = (recent ? x.ls : x.ls.filter((l) => l.done !== false))
      .filter((l) =>
        !tagFilter ||
        (tagFilter.system === 'task' ? l.kind === tagFilter.name : l.project === tagFilter.name),
      )
      .slice()
      .sort((a, b) => toMin(a.at) - toMin(b.at))
    const isToday = x.ds === today
    return {
      ds: x.ds,
      dow: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][x.d.getDay()],
      num: String(x.d.getDate()).padStart(2, '0'),
      isToday,
      recent,
      total: x.mins ? fmt(x.mins) : '—',
      bar: x.mins ? Math.max(3, Math.round((x.mins / maxMins) * 100)) + '%' : '0%',
      // Lit as soon as the day holds anything — see DayBucket.hasAny.
      dotBg: x.hasAny ? '#7FB87E' : '#FFFFFF',
      dotBorder: x.hasAny ? '#3E7A4E' : '#CFCFC4',
      pad: isToday ? '20px 16px 18px 10px' : '14px 16px 13px 10px',
      bg: isToday ? '#FCFBF7' : 'transparent',
      edge: isToday ? '#F2A0A5' : x.hasAny ? '#E3E3DB' : '#EDEDE6',
      labelOp: x.hasAny ? 1 : 0.4,
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
    // The month you're in stays open; older ones collapse until asked for.
    const isCur = k === today.slice(0, 7)
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

  // The four presets, plus the typed length when it isn't one of them — so a
  // 90-minute session still shows which chip is lit.
  const targetChoices = useMemo(() => {
    const mins = Math.round(tTarget / 60)
    return TIMER_PRESETS.includes(mins) ? TIMER_PRESETS : TIMER_PRESETS.concat([mins]).sort((a, b) => a - b)
  }, [tTarget])

  const tArc =
    tMode === 'down' && tTarget
      ? Math.round((1 - tSec / tTarget) * 100) + '%'
      : tSec
        ? Math.min(100, Math.round((tSec / 3600) * 100)) + '%'
        : '0%'

  /**
   * A tag nothing is filed under goes straight away — rule 08's "delete
   * outright, never ask", with Ctrl+Z as the safety net. One that is in use
   * opens the review, because dropping it silently reassigns work nobody chose
   * to reassign.
   */
  function requestDelete(name: string, system: TagSystem) {
    const column = system === 'task' ? 'kind' : 'project'
    const inUse = logs.some((l) => l[column] === name)
    if (!inUse) {
      if (tagFilter?.system === system && tagFilter.name === name) setTagFilter(null)
      void removeTag(name, system)
      return
    }
    setDeleting({ system, name })
  }

  function onDropDay(e: React.DragEvent, ds: string) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    void patch(id, { date: ds })
  }

  return (
    <div
      style={{
        background: '#FCFCFA',
        color: '#172124',
        minHeight: '100vh',
        padding: '44px 60px 110px',
      }}
    >
      <Breadcrumbs color="#7C7C70" />

      {/* A journal that drops an entry silently is worse than one that won't
          save at all — say so, and the hook refetches so what's on screen is
          what's actually stored. */}
      {error && (
        <div
          role="alert"
          style={{
            background: '#FBE7E5',
            color: '#8E1E42',
            fontSize: 12.5,
            padding: '10px 14px',
            marginBottom: 18,
          }}
        >
          Không lưu được: {error}
        </div>
      )}

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
                {quote.t}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 0 46px' }}>
              <div style={{ width: 15, height: 1, background: '#A2A296' }} />
              <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 12, color: '#A2A296' }}>{quote.w}</div>
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
      {/* Tag bar. Project first, then Task — the same order the rows use, so
          the eye learns one sequence and reads it everywhere. */}
      <TagBar
        projects={projects}
        kinds={allKinds}
        logs={logs}
        kindColor={kindColor}
        projectColor={projectColor}
        filter={tagFilter}
        onFilter={setTagFilter}
        onAdd={(name, system) => void addTag(name, system)}
        onRename={(name, next, system) => void renameTag(name, next, system)}
        onDelete={requestDelete}
      />

      {deleting && (
        <TagDeleteReview
          target={deleting}
          logs={logs}
          kinds={allKinds}
          projects={projects}
          onAddTag={addTag}
          onConfirm={(plan) => {
            const target = deleting
            setDeleting(null)
            if (tagFilter?.system === target.system && tagFilter.name === target.name) setTagFilter(null)
            void removeTag(target.name, target.system, plan)
          }}
          onCancel={() => setDeleting(null)}
        />
      )}

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
                        <div style={{ fontSize: 12.5, color: '#AFAFA2', fontStyle: 'italic', padding: '6px 0' }}>
                          {loading ? 'đang tải…' : 'chưa ghi gì'}
                        </div>
                      )}
                      {d.rows.map((l) => (
                        <ActivityRow
                          key={l.id}
                          log={l}
                          editable={d.recent}
                          kinds={allKinds}
                          projects={projects}
                          kindColor={kindColor}
                          projectColor={projectColor}
                          naming={newId === l.id}
                          onStartNaming={() => setNewId(l.id)}
                          onName={(nm) => {
                            // An unnamed row that loses focus was abandoned.
                            if (nm) void patch(l.id, { name: nm })
                            else void remove(l.id)
                            setNewId(null)
                          }}
                          onAbandon={() => {
                            setNewId(null)
                            if (!l.name) void remove(l.id)
                          }}
                          onPatch={(p) => void patch(l.id, p)}
                          onRemove={() => void remove(l.id)}
                        />
                      ))}
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

        {/* The rail was a fixed 316px, set when it held a clock, one row of
            tags and two buttons. It now holds two tag rows, five countdown
            chips and a switch, and at that width the chips wrapped onto three
            lines while the day list beside it had room to spare. It scales with
            the window instead: never under 320 so the countdown row fits on one
            line, never over 440 so it stays the narrower column — the day list
            is the main event (rule 14.01) and this sits beside it. */}
        <div
          style={{
            flex: '0 1 clamp(320px, 30%, 440px)',
            minWidth: 300,
            position: 'sticky',
            top: 32,
          }}
        >
          <div style={{ background: 'linear-gradient(168deg, #143C43 0%, #0D272C 100%)', color: '#F4F4EF', padding: '28px 26px 26px' }}>
            <div style={{ display: 'flex', gap: 18, marginBottom: 22, fontWeight: 500, fontSize: 9.5, letterSpacing: '.2em', textTransform: 'uppercase' }}>
              <div
                onClick={() => timer.setMode('up')}
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
                onClick={() => timer.setMode('down')}
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
            <div style={{ height: 2, background: 'rgba(244,244,239,.22)', margin: '16px 0 10px' }}>
              <div style={{ height: 2, width: tArc, background: '#F2A0A5' }} />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(244,244,239,.6)', marginBottom: 18, minHeight: 15 }}>
              {tRunning || suspended
                ? onScreenOnly
                  ? suspended
                    ? 'Đang tạm dừng — bạn đã rời màn này.'
                    : 'Đang chạy — dừng khi bạn rời màn này.'
                  : 'Đang chạy — vẫn tính khi bạn rời màn này.'
                : ''}
            </div>

            {tMode === 'down' && (
              <>
                {/* A 15-minute step all the way across — 25 sat between 15 and
                    45 for no reason anyone could name. Anything else is typed. */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                  {targetChoices.map((m) => {
                    const picked = tTarget === m * 60
                    return (
                      <div
                        key={m}
                        onClick={() => timer.setTarget(m * 60)}
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
                  <CustomTarget onPick={(mins) => timer.setTarget(mins * 60)} />
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

            {/* Both tag systems, in the bar's order — project, then task. The
                rail used to offer only task, so every session it logged came
                back project-less and the row's project slot sat empty with no
                way to have filled it from here. */}
            <div style={{ ...railLabel, marginBottom: 7 }} id="rail-project">
              Project
            </div>
            {/* Named groups: the same tags are drawn again in the bar at the top
                of the screen, and "the project row" has to mean one of them. */}
            <div
              role="group"
              aria-labelledby="rail-project"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}
            >
              {projects.map((p) => {
                const picked = p === dProject
                const color = projectColor[p] ?? '#F2A0A5'
                return (
                  <div
                    key={p}
                    onClick={() => setDProject(picked ? null : p)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: 12,
                      padding: '5px 11px',
                      // A project is optional, so an unpicked one still reads as
                      // available rather than as switched off.
                      border: `1px solid ${picked ? color : 'rgba(244,244,239,.3)'}`,
                      cursor: 'pointer',
                      background: picked ? color : 'transparent',
                      color: picked ? '#F7F5EE' : 'rgba(247,244,233,.82)',
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: picked ? 'rgba(255,255,255,.6)' : color,
                        flex: 'none',
                      }}
                    />
                    {hashtag(p)}
                  </div>
                )
              })}
              <TimerAddTag
                label="project mới"
                onAdd={(name) => {
                  // Naming a tag here means you want this session filed under
                  // it — picking it again by hand would be a second step for a
                  // choice already made.
                  setDProject(name.trim())
                  void addTag(name, 'project')
                }}
              />
            </div>

            <div style={{ ...railLabel, marginBottom: 7 }} id="rail-task">
              Task
            </div>
            <div
              role="group"
              aria-labelledby="rail-task"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}
            >
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
              <TimerAddTag
                onAdd={(name) => {
                  setDKind(name.trim())
                  void addTag(name, 'task')
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Hover
                onClick={() => (tRunning ? timer.pause() : timer.start())}
                style={{ flex: 1, textAlign: 'center', fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', padding: 13, background: '#F2A0A5', color: '#3B2A2B', cursor: 'pointer' }}
                hoverStyle={{ background: '#F6B4B8' }}
              >
                {tRunning ? 'Tạm dừng' : 'Bắt đầu'}
              </Hover>
              <Hover
                onClick={() => timer.reset()}
                style={{ flex: 'none', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', padding: '13px 15px', border: '1px solid rgba(244,244,239,.35)', cursor: 'pointer' }}
                hoverStyle={{ border: '1px solid #F4F4EF' }}
              >
                Đặt lại
              </Hover>
            </div>

            {/* The rule, stated where it applies. Off by default: a stopwatch
                that stops when you look away is a surprise, and the case that
                sent this back from QA was four hours of work in another tab
                logged as thirteen minutes. */}
            <Hover
              onClick={() => timer.setOnScreenOnly(!onScreenOnly)}
              role="switch"
              aria-checked={onScreenOnly}
              style={{
                marginTop: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                cursor: 'pointer',
                color: onScreenOnly ? '#F2A0A5' : 'rgba(244,244,239,.6)',
              }}
              hoverStyle={{ color: '#F2A0A5' }}
            >
              <div
                style={{
                  width: 13,
                  height: 13,
                  flex: 'none',
                  border: '1px solid currentColor',
                  background: onScreenOnly ? 'currentColor' : 'transparent',
                }}
              />
              <div style={{ fontSize: 11.5, lineHeight: 1.4 }}>Chỉ tính khi đang mở màn này</div>
            </Hover>

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
            Phiên đếm lên chạy tới khi bạn dừng — kể cả khi bạn sang tab khác, đóng trang rồi mở lại, hay đi
            sang màn hình khác; giờ được tính từ lúc bấm bắt đầu. Bật “chỉ tính khi đang mở màn này” nếu bạn
            muốn ngược lại. Một phiên bỏ quên quá {MAX_SESSION_HOURS} tiếng sẽ tự dừng ở mốc đó. Hẹn giờ dùng
            cho việc cần giới hạn — hết giờ có tiếng báo, rồi bấm tick để ghi vào ngày.
          </div>
        </div>
      </div>
    </div>
  )
}
