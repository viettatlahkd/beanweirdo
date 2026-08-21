import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { hashtag } from '../content/hours'
import { serif } from '../design/tokens'
import { Hover } from '../lib/Hover'
import { fmt } from '../lib/hoursStats'
import { MAX_SESSIONS, type SessionView, type TimerMode } from '../lib/useSessionTimer'
import { TimerAddTag, type TagSystem } from './TagBar'

/** Countdown lengths on the quarter-hour, matching a browser's own time control. */
export const TIMER_PRESETS = [15, 30, 45, 60]

/** Longest countdown the `+` beside the presets will take, in minutes. */
export const MAX_TARGET_MINS = 12 * 60

const clockFmt = (s: number) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((v) => String(v).padStart(2, '0'))
    .join(':')

/** `label`'s counterpart inside the dark rail. */
const railLabel: CSSProperties = {
  fontWeight: 500,
  fontSize: 9,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: 'rgba(244,244,239,.55)',
}

/** The open session: the one dark block on the screen, because it is the one
 *  being worked on. */
const openCard: CSSProperties = {
  background: 'linear-gradient(168deg, #143C43 0%, #0D272C 100%)',
  color: '#F4F4EF',
}

/**
 * A collapsed session: the same rectangle drawn as an outline.
 *
 * Several dark slabs stacked up read as one undifferentiated mass, and worse,
 * they all shout equally — while only one of them is the thing in hand. Left as
 * outlines, the clocks that are merely running stay present without competing,
 * and the dark block moves as the open session moves, which says "the work is
 * here now" without any animation.
 */
const collapsedCard: CSSProperties = {
  background: 'transparent',
  border: '1px solid #2A5A62',
  color: '#172124',
}

const iconButton: CSSProperties = {
  width: 22,
  height: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  lineHeight: 1,
  cursor: 'pointer',
  color: '#8A9A98',
  flex: 'none',
}

/**
 * The `+` at the end of the countdown presets: type a length in minutes.
 *
 * Module scope, not nested inside the rail — a component declared inside
 * another is a new type on every render, which tears its input out of the DOM
 * between keystrokes and breaks Vietnamese input.
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

/**
 * A session that is running but not being worked on.
 *
 * Three things and three controls, on a card of its own. The mode is the card's
 * header because it is what the reader needs first — a countdown at 12:30 and a
 * stopwatch at 12:30 mean opposite things. The tags are drawn as chips, the way
 * they are everywhere else on this screen, so the eye matches them without
 * reading.
 *
 * Clicking anywhere that is not one of the three controls expands this session
 * and collapses whichever was open.
 */
function CollapsedSession({
  session,
  projectColor,
  kindColor,
  onOpen,
  onLog,
  onPause,
  onRemove,
}: {
  session: SessionView
  projectColor: Record<string, string>
  kindColor: Record<string, string>
  onOpen: () => void
  onLog: () => void
  onPause: () => void
  onRemove: () => void
}) {
  const canLog = Math.round(session.usedSec / 60) >= 1

  const chip: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 10.5,
    padding: '2px 7px',
    whiteSpace: 'nowrap',
    border: '1px solid #C8D2D0',
    color: '#414A42',
  }

  return (
    <div
      onClick={onOpen}
      style={{ ...collapsedCard, padding: '11px 13px 12px', marginBottom: 8, cursor: 'pointer' }}
    >
      <div style={{ ...railLabel, color: '#6A8A8E', marginBottom: 7 }}>
        {session.mode === 'down' ? 'Hẹn giờ' : 'Bấm giờ'}
        {session.suspended && ' · đang tạm dừng'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              color: '#172124',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 5,
            }}
          >
            {session.name || 'Phiên không tên'}
          </div>
          {/* Project first, then task — the order every other list on this
              screen uses. Both are outlined chips with a coloured dot rather
              than filled blocks: on a card this quiet, a filled chip would be
              the darkest thing here and pull the eye off the activity's name.
              A session with no project says so instead of leaving a gap, since
              an absent chip reads as a missing one. */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {session.project ? (
              <div style={chip}>
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: projectColor[session.project] ?? '#102F35',
                    flex: 'none',
                  }}
                />
                {hashtag(session.project)}
              </div>
            ) : (
              <div style={{ ...chip, borderStyle: 'dashed', color: '#A8B2B0' }}>+ project</div>
            )}
            <div style={chip}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: kindColor[session.kind] ?? '#A2A296',
                  flex: 'none',
                }}
              />
              {session.kind}
            </div>
          </div>
        </div>

        <div
          style={{
            fontFamily: serif,
            fontSize: 21,
            lineHeight: 1,
            color: '#143C43',
            fontVariantNumeric: 'tabular-nums',
            flex: 'none',
          }}
        >
          {clockFmt(session.sec)}
        </div>

        {/* The three controls stop the click from reaching the card, or every
            one of them would also expand the session it just acted on. */}
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 4, flex: 'none' }}>
          <Hover
            onClick={onLog}
            role="button"
            aria-label={`Ghi ${session.name || 'phiên'} vào hoạt động`}
            title="Ghi vào hoạt động"
            style={{ ...iconButton, opacity: canLog ? 1 : 0.35 }}
            hoverStyle={canLog ? { color: '#3E7A4E' } : {}}
          >
            ✓
          </Hover>
          <Hover
            onClick={onPause}
            role="button"
            aria-label={
              session.running ? `Tạm dừng ${session.name || 'phiên'}` : `Chạy tiếp ${session.name || 'phiên'}`
            }
            title={session.running ? 'Tạm dừng' : 'Chạy tiếp'}
            style={iconButton}
            hoverStyle={{ color: '#143C43' }}
          >
            {session.running ? '❙❙' : '▶'}
          </Hover>
          <Hover
            onClick={onRemove}
            role="button"
            aria-label={`Bỏ ${session.name || 'phiên'}`}
            title="Bỏ phiên này"
            style={iconButton}
            hoverStyle={{ color: '#C25C7C' }}
          >
            ✕
          </Hover>
        </div>
      </div>
    </div>
  )
}

/**
 * The session being worked on: the full panel, and the one dark block on the
 * screen. It is drawn in place rather than always at the bottom — the order of
 * the cards is the order they were created and never changes, so opening a
 * different clock moves the dark block up or down the list instead of
 * reshuffling the list underneath the pointer.
 */
function ExpandedSession({
  session,
  projects,
  kinds,
  projectColor,
  onStart,
  onPause,
  onReset,
  onMode,
  onTarget,
  onName,
  onKind,
  onProject,
  onScreenOnly,
  onAddTag,
  onLog,
}: {
  session: SessionView
  projects: string[]
  kinds: string[]
  projectColor: Record<string, string>
  onStart: (id: string) => void
  onPause: (id: string) => void
  onReset: (id: string) => void
  onMode: (id: string, mode: TimerMode) => void
  onTarget: (id: string, seconds: number) => void
  onName: (id: string, name: string) => void
  onKind: (id: string, kind: string) => void
  onProject: (id: string, project: string | null) => void
  onScreenOnly: (id: string, value: boolean) => void
  onAddTag: (name: string, system: TagSystem) => void
  onLog: (session: SessionView, mins: number) => void
}) {
  const usedMins = Math.round(session.usedSec / 60)

  const arc =
    session.mode === 'down' && session.target
      ? Math.round((1 - session.sec / session.target) * 100) + '%'
      : session.sec
        ? Math.min(100, Math.round((session.sec / 3600) * 100)) + '%'
        : '0%'

  // The presets, plus the typed length when it isn't one of them — so a
  // 90-minute session still shows which chip is lit.
  const mins = Math.round(session.target / 60)
  const targetChoices = TIMER_PRESETS.includes(mins)
    ? TIMER_PRESETS
    : TIMER_PRESETS.concat([mins]).sort((a, b) => a - b)


  return (
    <div style={{ ...openCard, padding: '28px 26px 26px' }}>
      <div
        style={{
          display: 'flex',
          gap: 18,
          marginBottom: 22,
          fontWeight: 500,
          fontSize: 9.5,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
        }}
      >
        <div
          onClick={() => onMode(session.id, 'up')}
          style={{
            cursor: 'pointer',
            paddingBottom: 4,
            borderBottom: `1px solid ${session.mode === 'up' ? '#F2A0A5' : 'transparent'}`,
            color: session.mode === 'up' ? '#EDE9DC' : 'rgba(244,244,239,.55)',
          }}
        >
          Bấm giờ
        </div>
        <div
          onClick={() => onMode(session.id, 'down')}
          style={{
            cursor: 'pointer',
            paddingBottom: 4,
            borderBottom: `1px solid ${session.mode === 'down' ? '#F2A0A5' : 'transparent'}`,
            color: session.mode === 'down' ? '#EDE9DC' : 'rgba(244,244,239,.55)',
          }}
        >
          Hẹn giờ
        </div>
      </div>
    
      <div
        style={{
          fontFamily: serif,
          fontSize: 66,
          lineHeight: 0.9,
          letterSpacing: '-.04em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {clockFmt(session.sec)}
      </div>
      <div style={{ height: 2, background: 'rgba(244,244,239,.22)', margin: '16px 0 10px' }}>
        <div style={{ height: 2, width: arc, background: '#F2A0A5' }} />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(244,244,239,.6)', marginBottom: 18, minHeight: 15 }}>
        {session.running || session.suspended
          ? session.onScreenOnly
            ? session.suspended
              ? 'Đang tạm dừng — bạn đã rời màn này.'
              : 'Đang chạy — dừng khi bạn rời màn này.'
            : 'Đang chạy — vẫn tính khi bạn rời màn này.'
          : ''}
      </div>
    
      {session.mode === 'down' && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {targetChoices.map((m) => {
              const picked = session.target === m * 60
              return (
                <div
                  key={m}
                  onClick={() => onTarget(session.id, m * 60)}
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
            <CustomTarget onPick={(m) => onTarget(session.id, m * 60)} />
          </div>
        </>
      )}
    
      <input
        value={session.name}
        onChange={(e) => onName(session.id, e.target.value)}
        placeholder="Đang làm gì"
        aria-label="Tên hoạt động"
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
    
      <div style={{ ...railLabel, marginBottom: 7 }} id="rail-project">
        Project
      </div>
      <div
        role="group"
        aria-labelledby="rail-project"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}
      >
        {projects.map((p) => {
          const picked = p === session.project
          const color = projectColor[p] ?? '#F2A0A5'
          return (
            <div
              key={p}
              onClick={() => onProject(session.id, picked ? null : p)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12,
                padding: '5px 11px',
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
            onProject(session.id, name.trim())
            onAddTag(name, 'project')
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
        {kinds.map((k) => {
          const picked = k === session.kind
          return (
            <div
              key={k}
              onClick={() => onKind(session.id, k)}
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
            onKind(session.id, name.trim())
            onAddTag(name, 'task')
          }}
        />
      </div>
    
      <div style={{ display: 'flex', gap: 8 }}>
        <Hover
          onClick={() => (session.running ? onPause(session.id) : onStart(session.id))}
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 11,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            padding: 13,
            background: '#F2A0A5',
            color: '#3B2A2B',
            cursor: 'pointer',
          }}
          hoverStyle={{ background: '#F6B4B8' }}
        >
          {session.running ? 'Tạm dừng' : 'Bắt đầu'}
        </Hover>
        <Hover
          onClick={() => onReset(session.id)}
          style={{
            flex: 'none',
            fontSize: 11,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            padding: '13px 15px',
            border: '1px solid rgba(244,244,239,.35)',
            cursor: 'pointer',
          }}
          hoverStyle={{ border: '1px solid #F4F4EF' }}
        >
          Đặt lại
        </Hover>
      </div>
    
      <Hover
        onClick={() => onScreenOnly(session.id, !session.onScreenOnly)}
        role="switch"
        aria-checked={session.onScreenOnly}
        style={{
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          cursor: 'pointer',
          color: session.onScreenOnly ? '#F2A0A5' : 'rgba(244,244,239,.6)',
        }}
        hoverStyle={{ color: '#F2A0A5' }}
      >
        <div
          style={{
            width: 13,
            height: 13,
            flex: 'none',
            border: '1px solid currentColor',
            background: session.onScreenOnly ? 'currentColor' : 'transparent',
          }}
        />
        <div style={{ fontSize: 11.5, lineHeight: 1.4 }}>Chỉ tính khi đang mở màn này</div>
      </Hover>
    
      <Hover
        onClick={() => onLog(session, usedMins)}
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
        <div style={{ fontFamily: serif, fontSize: 25, lineHeight: 1, letterSpacing: '-.02em' }}>
          Hoàn thành
        </div>
        <div
          style={{
            fontFamily: "'Be Vietnam Pro',sans-serif",
            fontWeight: 500,
            fontSize: 11.5,
            letterSpacing: '.1em',
            marginTop: 7,
          }}
        >
          Ghi vào hoạt động · {fmt(usedMins)}
        </div>
      </Hover>
    </div>
  )
}

export type TimerRailProps = {
  sessions: SessionView[]
  /** The expanded session, or null when everything is collapsed. */
  open: SessionView | null
  canAdd: boolean
  projects: string[]
  kinds: string[]
  projectColor: Record<string, string>
  kindColor: Record<string, string>
  onOpenSession: (id: string) => void
  onCollapseAll: () => void
  onAddSession: () => void
  onRemoveSession: (id: string) => void
  onStart: (id: string) => void
  onPause: (id: string) => void
  onReset: (id: string) => void
  onMode: (id: string, mode: TimerMode) => void
  onTarget: (id: string, seconds: number) => void
  onName: (id: string, name: string) => void
  onKind: (id: string, kind: string) => void
  onProject: (id: string, project: string | null) => void
  onScreenOnly: (id: string, value: boolean) => void
  onAddTag: (name: string, system: TagSystem) => void
  /** Write a session into today's log. Minutes, not seconds. */
  onLog: (session: SessionView, mins: number) => void
}

/**
 * Ghi 02's timer rail: several clocks, one of them open.
 *
 * Two activities can genuinely run at once — something fermenting while you
 * read — so the rail is a stack of sessions rather than a single stopwatch.
 * The open one is the full panel; the rest keep counting from a collapsed card
 * above it. Cards are separate rather than one continuous block: the rail was
 * turning into an undifferentiated slab of dark green, and separate cards say
 * "these are separate things" without a word.
 */
export function TimerRail({
  sessions,
  open,
  canAdd,
  projects,
  kinds,
  projectColor,
  kindColor,
  onOpenSession,
  onCollapseAll,
  onAddSession,
  onRemoveSession,
  onStart,
  onPause,
  onReset,
  onMode,
  onTarget,
  onName,
  onKind,
  onProject,
  onScreenOnly,
  onAddTag,
  onLog,
}: TimerRailProps) {
  const railRef = useRef<HTMLDivElement>(null)

  // Clicking anywhere outside the rail folds it up. An expanded panel is a
  // claim on the screen, and once attention has moved elsewhere the claim is
  // stale — the clocks keep running either way.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (railRef.current?.contains(e.target as Node)) return
      onCollapseAll()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onCollapseAll])





  return (
    <div ref={railRef}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div style={{ ...railLabel, color: '#A2A296' }}>
          {sessions.length > 1 ? `Đang chạy · ${sessions.length}` : 'Bấm giờ'}
        </div>
        <Hover
          onClick={() => canAdd && onAddSession()}
          role="button"
          aria-label="Thêm một đồng hồ"
          title={
            canAdd
              ? 'Thêm một đồng hồ'
              : sessions.length >= MAX_SESSIONS
                ? `Tối đa ${MAX_SESSIONS} đồng hồ cùng lúc`
                : 'Đặt tên cho phiên đang mở trước đã'
          }
          style={{
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            border: '1px dashed #CFCFC4',
            color: '#A2A296',
            cursor: canAdd ? 'pointer' : 'default',
            opacity: canAdd ? 1 : 0.4,
          }}
          hoverStyle={canAdd ? { color: '#3E7A4E', borderColor: '#3E7A4E' } : {}}
        >
          +
        </Hover>
      </div>

      {/* Every session, in the order it was created — an order that is stored
          and never rearranged. Opening one expands it where it stands; the
          others collapse where they stand. Nothing moves under the pointer, so
          the clock you were watching is still where you last saw it. */}
      {sessions.map((s) =>
        s.id === open?.id ? (
          <ExpandedSession
            key={s.id}
            session={s}
            projects={projects}
            kinds={kinds}
            projectColor={projectColor}
            onStart={onStart}
            onPause={onPause}
            onReset={onReset}
            onMode={onMode}
            onTarget={onTarget}
            onName={onName}
            onKind={onKind}
            onProject={onProject}
            onScreenOnly={onScreenOnly}
            onAddTag={onAddTag}
            onLog={onLog}
          />
        ) : (
          <CollapsedSession
            key={s.id}
            session={s}
            projectColor={projectColor}
            kindColor={kindColor}
            onOpen={() => onOpenSession(s.id)}
            onLog={() => onLog(s, Math.round(s.usedSec / 60))}
            onPause={() => (s.running ? onPause(s.id) : onStart(s.id))}
            onRemove={() => onRemoveSession(s.id)}
          />
        ),
      )}

    </div>
  )
}
