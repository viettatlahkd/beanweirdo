import { useMemo, useState } from 'react'
import { ActivityRow } from '../components/ActivityRow'
import { TagBar, type TagFilter, type TagSystem } from '../components/TagBar'
import { TagDeleteReview, type TagTarget } from '../components/TagDeleteReview'
import { StatsPanel } from '../components/StatsPanel'
import { Breadcrumbs } from '../components/Breadcrumbs'
import {
  type LogEntry,
  RECENT_DAYS,
  kindColorMap,
  projectColorMap,
  quoteOfTheDay,
  todayStr,
  withUnclassified,
} from '../content/hours'
import { useHours } from '../data/useHours'
import { serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { useSessionTimer, type SessionView } from '../lib/useSessionTimer'
import { TimerRail } from '../components/TimerRail'
import {
  buildAllDays,
  cloneOf,
  spanStats,
  streak as computeStreak,
  toMin,
  fmt,
  weekGroups,
} from '../lib/hoursStats'





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
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({})
  /** Tag picked in the bar, from either system — null shows everything. */
  const [tagFilter, setTagFilter] = useState<TagFilter>(null)
  /** The tag whose deletion is being worked out, if any. */
  const [deleting, setDeleting] = useState<TagTarget | null>(null)
  const [newId, setNewId] = useState<string | null>(null)
  // Several clocks, one of them open — see useSessionTimer.
  const timer = useSessionTimer({ onFinish: beep })

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
  /**
   * Where the next activity of a day starts: a quarter of an hour after the
   * latest one ends, or eight in the morning on an empty day. Rows are sorted
   * by this, so anything stamped here lands at the bottom of the day.
   */
  function nextSlot(ds: string): string {
    const onDay = logs.filter((l) => l.date === ds)
    const last = onDay.slice().sort((a, b) => toMin(a.at) - toMin(b.at)).slice(-1)[0]
    const startMin = last ? Math.min(23 * 60 + 30, toMin(last.at) + last.mins + 15) : 8 * 60
    return String(Math.floor(startMin / 60)).padStart(2, '0') + ':' + String(startMin % 60).padStart(2, '0')
  }

  async function addRow(ds: string) {
    const saved = await add({
      date: ds,
      name: '',
      kind: timer.open?.kind ?? 'đọc',
      mins: 30,
      done: false,
      at: nextSlot(ds),
    })
    if (!saved) return
    setNewId(saved.id)
  }

  /**
   * The same activity, a second time — see `cloneOf` for what carries over.
   *
   * No naming prompt: the copy arrives with its name. A row that needed typing
   * would be `thêm hoạt động`, not this.
   */
  async function cloneRow(l: LogEntry) {
    await add(cloneOf(l))
  }

  /**
   * Write one session into today's log and start it over.
   *
   * The row is stamped with the wall-clock time the stopwatch was set going,
   * not the moment the tick was pressed: a session that ran across tabs still
   * started when it started.
   */
  function logSession(session: SessionView, mins: number) {
    if (!mins || mins < 1) return
    const at = new Date(Date.now() - mins * 60_000)
    void add({
      date: today,
      name: session.name.trim() || 'Phiên không tên',
      kind: session.kind,
      project: session.project,
      mins,
      at: String(at.getHours()).padStart(2, '0') + ':' + String(at.getMinutes()).padStart(2, '0'),
      done: true,
    })
    timer.reset(session.id)
  }

  const all = useMemo(() => buildAllDays(logs), [logs])
  const maxMins = Math.max(240, ...all.map((x) => x.mins))
  const streak = computeStreak(all)
  const todayList = logs.filter((l) => l.date === today)
  const todayTotal = todayList.filter((l) => l.done !== false).reduce((a, l) => a + l.mins, 0)
  const { avg7 } = spanStats(all)

  // Every day the journal has had, newest first. There is no cap any more:
  // the list groups by month and by week, and everything but the newest group
  // arrives collapsed, so length costs a heading rather than a screenful.
  const shownDays = all.slice().reverse()

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
      mins: x.mins,
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

    const weeks = weekGroups(monthDays[k]).map((w) => {
      const key = k + '|' + w.key
      const open = !w.collapsible || !!openWeeks[key]
      return {
        key,
        label: w.label,
        total: w.mins ? fmt(w.mins) : '—',
        nDays: w.logged + '/' + w.days.length + ' ngày',
        collapsible: w.collapsible,
        open,
        cue: open ? 'thu gọn ↑' : 'xổ ra ↓',
        days: w.days,
      }
    })

    return {
      key: k,
      label: 'Tháng ' + String(Number(k.slice(5, 7))),
      year: k.slice(0, 4),
      total: mins ? fmt(mins) : '—',
      nDays: nDays + '/' + daysInMonth + ' ngày có ghi',
      isCur,
      open,
      cue: open ? 'thu gọn ↑' : 'xổ ra ↓',
      weeks,
    }
  })


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
        <StatsPanel
          logs={logs}
          projects={projects}
          projectColor={projectColor}
          kindColor={kindColor}
          kinds={statKinds}
        />
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
                mo.weeks.map((wk) => (
                  <div key={wk.key}>
                    {/* A week heading only earns its line when the month holds
                        more than one. Indented under the month, so the two
                        levels read as levels rather than as two lists. */}
                    {mo.weeks.length > 1 && (
                      <Hover
                        onClick={
                          wk.collapsible
                            ? () => setOpenWeeks((st) => ({ ...st, [wk.key]: !st[wk.key] }))
                            : undefined
                        }
                        style={{
                          display: 'block',
                          padding: '10px 2px 0 13px',
                          borderTop: '1px solid #E3E3DB',
                          cursor: wk.collapsible ? 'pointer' : 'default',
                        }}
                        hoverStyle={wk.collapsible ? { background: '#FBFAF5' } : {}}
                      >
                        {/* Serif, one step down from the month heading above
                            it. Grey small-caps sat at the same weight as every
                            other label on the screen and read as one more line
                            of chrome; the level shows in the type, which is
                            how the month says it too. */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <div
                          style={{
                            fontFamily: serif,
                            fontSize: 15.5,
                            letterSpacing: '-.01em',
                            color: '#143C43',
                            flex: 'none',
                          }}
                        >
                          Tuần {wk.label}
                        </div>
                        <div style={{ flex: '1 1 0' }} />
                        <div style={{ fontSize: 10.5, color: '#A2A296' }}>{wk.nDays}</div>
                        <div style={{ fontSize: 12.5, color: '#414A42', fontVariantNumeric: 'tabular-nums' }}>{wk.total}</div>
                        {wk.collapsible && (
                          <div style={{ fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#A2A296', width: 62, textAlign: 'right' }}>
                            {wk.cue}
                          </div>
                        )}
                        </div>
                        <div style={{ height: 1, background: '#E3E3DB', marginTop: 8 }} />
                      </Hover>
                    )}

                    {wk.open &&
                      wk.days.map((d) => (
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
                            setNewId(null)
                            if (nm) {
                              void patch(l.id, { name: nm })
                              return
                            }
                            // Rule 08.04 drops a *new* row left blank. A row
                            // that already carries an hour and two tags is a
                            // different thing: emptying its name is an edit,
                            // not an abandonment, and deleting it here would
                            // throw away work the name was only labelling.
                            if (l.name) void patch(l.id, { name: '' })
                            else void remove(l.id)
                          }}
                          onAbandon={() => {
                            setNewId(null)
                            if (!l.name) void remove(l.id)
                          }}
                          onPatch={(p) => void patch(l.id, p)}
                          onClone={() => void cloneRow(l)}
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
          ))}
        </div>

        {/* The rail holds several clocks now — see TimerRail. It scales with
            the window: never under 320 so the countdown row fits on one line,
            never over 440 so the day list stays the main event (rule 14.01). */}
        <div
          style={{
            flex: '0 1 clamp(320px, 30%, 440px)',
            minWidth: 300,
            position: 'sticky',
            top: 32,
          }}
        >
          <TimerRail
            sessions={timer.sessions}
            open={timer.open}
            canAdd={timer.canAdd}
            projects={projects}
            kinds={allKinds}
            projectColor={projectColor}
            kindColor={kindColor}
            onOpenSession={timer.openSession}
            onCollapseAll={timer.collapseAll}
            onAddSession={timer.addSession}
            onRemoveSession={timer.removeSession}
            onStart={timer.start}
            onPause={timer.pause}
            onReset={timer.reset}
            onRestart={timer.restart}
            onMode={timer.setMode}
            onTarget={timer.setTarget}
            onName={timer.setName}
            onKind={timer.setKind}
            onProject={timer.setProject}
            onScreenOnly={timer.setOnScreenOnly}
            onAddTag={(name, system) => void addTag(name, system)}
            onLog={logSession}
          />
        </div>
      </div>
    </div>
  )
}
