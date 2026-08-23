import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { hashtag, type LogEntry } from '../content/hours'
import { fmt, noteChip } from '../lib/hoursStats'
import { Hover } from '../lib/Hover'

const chipBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 11,
  letterSpacing: '.04em',
  padding: '3px 9px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  border: '1px solid transparent',
}

/**
 * A project reads as a filled tab with a pale dot; a task as an outlined chip
 * with a saturated dot. Two tag systems sitting next to each other have to be
 * told apart before they're read, and colour alone can't do that when either
 * system may hold any hue — the shape has to carry it.
 */
export function ProjectChip({ name, color, onClick }: { name: string; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ ...chipBase, background: color, color: '#F7F5EE', cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,.55)', flex: 'none' }} />
      {hashtag(name)}
    </div>
  )
}

export function TaskChip({ name, color, onClick }: { name: string; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...chipBase,
        background: 'transparent',
        borderColor: '#DEDED6',
        color: '#414A42',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flex: 'none' }} />
      {name}
    </div>
  )
}

/** The two pickers share one look; only the option list differs. */
function InlinePicker({
  value,
  options,
  allowEmpty,
  onPick,
  onClose,
}: {
  value: string
  options: string[]
  allowEmpty?: boolean
  onPick: (v: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    // Focus alone only put a box on screen; the list still needed a second
    // click to drop down, so choosing a project took two clicks and looked
    // like it had already answered "không thuộc project". `showPicker` opens
    // it now. Not every browser has it, and it throws without a recent user
    // gesture — either way the field is focused and works as it did.
    try {
      ;(el as HTMLSelectElement & { showPicker?: () => void }).showPicker?.()
    } catch {
      /* older browser, or no user activation */
    }
  }, [])

  // A value the list no longer offers still has to show as itself — the
  // unclassified bucket is not a tag, and a tag can be renamed out from under a
  // row. Without this the picker would open showing someone else's name.
  const choices = value && !options.includes(value) ? [value].concat(options) : options

  return (
    <select
      ref={ref}
      value={value}
      onChange={(e) => {
        onPick(e.target.value)
        onClose()
      }}
      onBlur={onClose}
      style={{
        background: '#FFFFFF',
        border: '1px solid #3E7A4E',
        color: '#172124',
        fontFamily: "'Be Vietnam Pro',sans-serif",
        fontSize: 12,
        padding: '3px 6px',
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      {allowEmpty && <option value="">— không thuộc project —</option>}
      {choices.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

/** `HH:MM` → minutes since midnight. */
export const atToMin = (at: string): number => {
  const [h, m] = at.split(':')
  return Number(h) * 60 + (Number(m) || 0)
}

/** Minutes since midnight → `HH:MM`, wrapping past midnight. */
export const minToAt = (mins: number): string => {
  const wrapped = ((mins % 1440) + 1440) % 1440
  return (
    String(Math.floor(wrapped / 60)).padStart(2, '0') + ':' + String(wrapped % 60).padStart(2, '0')
  )
}

/**
 * Start, end and duration are three views of two facts, so the row only ever
 * stores two — the start time and the length — and derives the end from them.
 *
 * Editing any one of the three keeps the start where it is and moves the other
 * two, except when the end itself is edited: then the start stays and the
 * length gives way. That is the only reading that doesn't silently move an
 * activity to a different time of day while you were changing how long it took.
 */
export const endOf = (log: Pick<LogEntry, 'at' | 'mins'>): string => minToAt(atToMin(log.at) + log.mins)

/** `95` → `{ h: 1, m: 35 }`. */
export const splitHm = (mins: number) => ({ h: Math.floor(mins / 60), m: mins % 60 })

const clockField: CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #3E7A4E',
  color: '#172124',
  fontFamily: "'Be Vietnam Pro',sans-serif",
  fontSize: 13,
  padding: '3px 5px',
  width: 56,
  outline: 'none',
  fontVariantNumeric: 'tabular-nums',
}

/**
 * One clock time — start or end. Both read and edit the same way, so they are
 * the same control twice rather than two near-copies.
 *
 * At module scope, like every other field in this app: a component declared
 * inside another is a fresh type on every render, which rips the input out of
 * the DOM between keystrokes and breaks Vietnamese input.
 */
function TimeField({
  value,
  editing,
  draft,
  editable,
  onDraft,
  onOpen,
  onCommit,
  onCancel,
}: {
  value: string
  editing: boolean
  draft: string
  editable: boolean
  onDraft: (v: string) => void
  onOpen: () => void
  onCommit: () => void
  onCancel: () => void
}) {
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return
          if (e.key === 'Enter') onCommit()
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={onCommit}
        style={clockField}
      />
    )
  }

  return (
    <Hover
      onClick={onOpen}
      style={{
        fontSize: 13,
        color: '#414A42',
        fontVariantNumeric: 'tabular-nums',
        cursor: editable ? 'pointer' : 'default',
        padding: '2px 5px',
      }}
      hoverStyle={editable ? { background: '#EDE9D6' } : undefined}
    >
      {value}
    </Hover>
  )
}

/**
 * Duration, as hours and minutes rather than a lump of minutes.
 *
 * "90" was a fine thing to store and a poor thing to read: a two-hour-forty
 * session came out as `160`. The two boxes carry the same number split the way
 * people say it, and either box takes an over-large value — typing `90` into
 * minutes commits 1h 30m, because correcting someone's arithmetic is friendlier
 * than rejecting it.
 */
function DurationField({
  mins,
  onCommit,
  onCancel,
}: {
  mins: number
  onCommit: (mins: number) => void
  onCancel: () => void
}) {
  const start = splitHm(mins)
  const [h, setH] = useState(String(start.h))
  const [m, setM] = useState(String(start.m))

  const total = () => {
    const hh = Number(h) || 0
    const mm = Number(m) || 0
    return Math.max(0, Math.round(hh * 60 + mm))
  }

  function done() {
    onCommit(total())
  }

  /** Only leave when focus lands outside both boxes, not on the way between. */
  function onBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    done()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') done()
    if (e.key === 'Escape') onCancel()
  }

  const box: CSSProperties = { ...clockField, width: 42, textAlign: 'right' }
  const unit: CSSProperties = { fontSize: 12, color: '#8A8A7C' }

  return (
    <div onBlur={onBlur} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <input
        autoFocus
        type="number"
        min={0}
        value={h}
        onChange={(e) => setH(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Số giờ"
        style={box}
      />
      <div style={unit}>h</div>
      <input
        type="number"
        min={0}
        value={m}
        onChange={(e) => setM(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Số phút"
        style={box}
      />
      <div style={unit}>m</div>
    </div>
  )
}

export type ActivityRowProps = {
  log: LogEntry
  /** Within the editable window — older days are a closed record. */
  editable: boolean
  kinds: string[]
  projects: string[]
  kindColor: Record<string, string>
  projectColor: Record<string, string>
  /** True while this row is the freshly-added one waiting for its name. */
  naming: boolean
  onStartNaming(): void
  onName(name: string): void
  onAbandon(): void
  onPatch(patch: Partial<Omit<LogEntry, 'id'>>): void
  /** Copy this activity to the bottom of its day. */
  onClone(): void
  onRemove(): void
}

/**
 * One activity in the day list.
 *
 * Everything is changed where it sits: the two tags, the start time, the
 * duration and the name are each their own control, and each saves on its own
 * (System conventions, rule 08). It used to hide all of that behind an edit
 * panel that closed the moment the pointer left it, which made setting a time
 * a matter of luck.
 */
export function ActivityRow({
  log,
  editable,
  kinds,
  projects,
  kindColor,
  projectColor,
  naming,
  onStartNaming,
  onName,
  onAbandon,
  onPatch,
  onClone,
  onRemove,
}: ActivityRowProps) {
  const [picking, setPicking] = useState<'project' | 'task' | null>(null)
  const [editing, setEditing] = useState<'at' | 'end' | 'mins' | null>(null)
  const [draft, setDraft] = useState('')
  const [name, setName] = useState(log.name)
  const [note, setNote] = useState(log.note ?? '')
  const nameRef = useRef<HTMLInputElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  // `onName` closes over the draft, and the listener below is registered once
  // per naming session — without this it would keep calling the version of
  // `onName` that existed when the row first opened.
  const commitName = useRef<() => void>(() => {})
  commitName.current = () => {
    // The note rides along with the name: both are edited in the same pass, so
    // both are saved by whatever ends it — Enter, or a click outside the row.
    if (note.trim() !== (log.note ?? '')) onPatch({ note: note.trim() || null })
    onName(name.trim())
  }

  useEffect(() => {
    if (naming) {
      setName(log.name)
      setNote(log.note ?? '')
      nameRef.current?.focus()
    }
  }, [naming, log.name, log.note])

  /**
   * Rule 08.04 says an unnamed new row disappears when you leave it. "Leave"
   * used to mean the name field losing focus, which made the row vanish the
   * moment you reached for the project chip or the duration — the two things
   * you most often set before typing what the activity was. It means leaving
   * the whole row now.
   */
  useEffect(() => {
    if (!naming) return
    function onDown(e: MouseEvent) {
      if (rowRef.current?.contains(e.target as Node)) return
      commitName.current()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [naming])

  /** Being worked on: mid-edit, or a new row that hasn't been named yet. */
  const working = editing !== null || naming

  const done = log.done !== false
  const chip = noteChip(log.note)
  const color = kindColor[log.kind] ?? '#163F42'

  function openEdit(field: 'at' | 'end' | 'mins') {
    if (!editable) return
    setDraft(field === 'at' ? log.at : field === 'end' ? endOf(log) : String(log.mins))
    setEditing(field)
  }

  /**
   * Commit rather than discard. The old panel threw the half-typed value away
   * whenever focus left, so clicking anywhere lost the edit — the one thing a
   * journal must never do with something you just typed.
   */
  function commit() {
    const looksLikeTime = /^\d{1,2}:\d{2}$/.test(draft)
    if (editing === 'at') {
      // Moving the start moves the whole activity: the length is what you
      // said it was, so the end follows rather than the duration shrinking.
      if (looksLikeTime && draft !== log.at) onPatch({ at: draft })
    } else if (editing === 'end') {
      // The one case where the length gives way instead — you are saying when
      // it finished, not how long it took.
      if (looksLikeTime) {
        const mins = atToMin(draft) - atToMin(log.at)
        // A day boundary is the only way an end can precede its start here,
        // and an activity crossing midnight belongs to two days, not one.
        if (mins > 0 && mins !== log.mins) onPatch({ mins })
      }
    } else if (editing === 'mins') {
      const m = parseInt(draft, 10)
      if (m > 0 && m !== log.mins) onPatch({ mins: m })
    }
    setEditing(null)
  }


  return (
    <div
      ref={rowRef}
      draggable={editable && !naming && !editing}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', log.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      style={{ padding: '9px 0', borderBottom: '1px solid #EAE7DA' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          onClick={() => editable && onPatch({ done: !done })}
          title={done ? 'Bỏ tick' : 'Đánh dấu đã xong'}
          style={{
            width: 16,
            height: 16,
            flex: 'none',
            marginTop: 4,
            border: `1px solid ${done ? color : '#B9B6A6'}`,
            background: done ? color : 'transparent',
            color: '#F6F2E6',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: editable ? 'pointer' : 'default',
          }}
        >
          {done ? '✓' : ''}
        </div>

        <div style={{ flex: '1 1 auto', minWidth: 140 }}>
          {/* Project first, then task — the same order the filter bar uses. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
            {picking === 'project' ? (
              <InlinePicker
                value={log.project ?? ''}
                options={projects}
                allowEmpty
                onPick={(v) => onPatch({ project: v || null })}
                onClose={() => setPicking(null)}
              />
            ) : log.project ? (
              <ProjectChip
                name={log.project}
                color={projectColor[log.project] ?? '#102F35'}
                onClick={editable ? () => setPicking('project') : undefined}
              />
            ) : (
              editable && (
                <Hover
                  onClick={() => setPicking('project')}
                  style={{ ...chipBase, borderColor: '#E2E2DA', borderStyle: 'dashed', color: '#B0AEA2' }}
                  hoverStyle={{ color: '#102F35', borderColor: '#102F35' }}
                >
                  + project
                </Hover>
              )
            )}

            {picking === 'task' ? (
              <InlinePicker
                value={log.kind}
                options={kinds}
                onPick={(v) => onPatch({ kind: v })}
                onClose={() => setPicking(null)}
              />
            ) : (
              <TaskChip name={log.kind} color={color} onClick={editable ? () => setPicking('task') : undefined} />
            )}

            {/* Reading and editing want different shapes. At rest the length
                belongs at the right margin, big, where the eye lands when
                scanning a day. While the row is being worked on — an edit, or a
                brand-new row still being named — the three numbers are one sum
                and have to sit together where the work is happening, so the
                duration comes over to join the clock times and the big figure
                on the right stands down.

                A new row counts as being worked on: it arrives with a guessed
                start and 30 minutes on it, and those are exactly what you fix
                before typing what the activity was. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <TimeField
                value={log.at}
                editing={editing === 'at'}
                draft={draft}
                editable={editable}
                onDraft={setDraft}
                onOpen={() => openEdit('at')}
                onCommit={commit}
                onCancel={() => setEditing(null)}
              />
              <div style={{ fontSize: 12, color: '#B0AEA2' }}>–</div>
              <TimeField
                value={endOf(log)}
                editing={editing === 'end'}
                draft={draft}
                editable={editable}
                onDraft={setDraft}
                onOpen={() => openEdit('end')}
                onCommit={commit}
                onCancel={() => setEditing(null)}
              />
              {working && (
                <>
                  <div style={{ fontSize: 12, color: '#D6D3C6', padding: '0 2px' }}>·</div>
                  {editing === 'mins' ? (
                    <DurationField
                      mins={log.mins}
                      onCommit={(next) => {
                        if (next > 0 && next !== log.mins) onPatch({ mins: next })
                        setEditing(null)
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <Hover
                      onClick={() => openEdit('mins')}
                      style={{
                        fontSize: 13,
                        color: '#414A42',
                        fontVariantNumeric: 'tabular-nums',
                        cursor: 'pointer',
                        padding: '2px 5px',
                      }}
                      hoverStyle={{ background: '#EDE9D6' }}
                    >
                      {fmt(log.mins)}
                    </Hover>
                  )}
                </>
              )}
            </div>

            {!editable && <div style={{ fontSize: 11, color: '#AFAFA2' }}>✓ chốt</div>}
          </div>

          {naming ? (
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                // A name is where Vietnamese actually gets typed: while the
                // input method is mid-letter, Enter finishes the letter, not
                // the edit.
                if (e.nativeEvent.isComposing) return
                if (e.key === 'Enter') onName(name.trim())
                if (e.key === 'Escape') onAbandon()
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
                fontWeight: 300,
                fontSize: 17,
                lineHeight: 1.35,
                padding: '0 0 3px',
                outline: 'none',
              }}
            />
          ) : (
            <div
              onClick={() => editable && onStartNaming()}
              style={{
                fontSize: 17,
                lineHeight: 1.35,
                color: done ? '#172124' : '#8A8A7C',
                fontStyle: done ? 'normal' : 'italic',
                cursor: editable ? 'pointer' : 'default',
              }}
            >
              {log.name || '(chưa đặt tên)'}
            </div>
          )}

          {/* The note lives under the name and only when there is one to show.
              A row without a note looks exactly like a row from before notes
              existed — which is nearly every row. */}
          {naming ? (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return
                if (e.key === 'Enter') commitName.current()
                if (e.key === 'Escape') onAbandon()
              }}
              placeholder="ghi chú/link"
              aria-label="Ghi chú hoặc link"
              style={{
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                background: 'transparent',
                border: 0,
                borderBottom: '1px dotted #CFCFC4',
                color: '#6A6F63',
                fontFamily: "'Be Vietnam Pro',sans-serif",
                fontWeight: 300,
                fontSize: 12,
                padding: '5px 0 3px',
                marginTop: 6,
                outline: 'none',
              }}
              className="note-field"
            />
          ) : !chip ? (
            // Nothing written here yet. On a row that can still be edited the
            // prompt is the only thing saying notes exist at all; on a locked
            // day it would be an offer that cannot be taken, so it stays away.
            editable && (
              <div
                onClick={() => onStartNaming()}
                style={{
                  marginTop: 5,
                  fontSize: 11.5,
                  fontStyle: 'italic',
                  color: '#C4C3B8',
                  cursor: 'pointer',
                }}
              >
                ghi chú/link
              </div>
            )
          ) : (
            (
              <div style={{ marginTop: 5 }}>
                {chip.isLink ? (
                  <a
                    href={chip.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 11,
                      color: '#2F5D68',
                      textDecoration: 'none',
                      border: '1px solid #CBDCDE',
                      background: '#F3F8F8',
                      padding: '2px 8px',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chip.label}
                    <span style={{ fontSize: 9, opacity: 0.7 }}>↗</span>
                  </a>
                ) : (
                  <div
                    onClick={() => editable && onStartNaming()}
                    style={{
                      fontSize: 11.5,
                      color: '#8A8A7C',
                      cursor: editable ? 'pointer' : 'default',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chip.label}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {!working && (
          <Hover
            onClick={() => openEdit('mins')}
            style={{
              flex: 'none',
              marginTop: 2,
              fontSize: 18,
              color: '#172124',
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'right',
              cursor: editable ? 'pointer' : 'default',
              padding: '2px 5px',
            }}
            hoverStyle={editable ? { background: '#EDE9D6' } : undefined}
          >
            {fmt(log.mins)}
          </Hover>
        )}

        {editable && (
          <Hover
            onClick={onClone}
            title="Nhân đôi — bản sao xuống cuối ngày"
            aria-label={`Nhân đôi ${log.name || 'hoạt động'}`}
            role="button"
            style={{
              flex: 'none',
              marginTop: 4,
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#CFCFC4',
              cursor: 'pointer',
            }}
            hoverStyle={{ color: '#3E7A4E' }}
          >
            ⧉
          </Hover>
        )}

        {editable && (
          <Hover
            onClick={onRemove}
            title="Xoá hoạt động"
            style={{
              flex: 'none',
              marginTop: 4,
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              color: '#CFCFC4',
              cursor: 'pointer',
            }}
            hoverStyle={{ color: '#C25C7C' }}
          >
            ✕
          </Hover>
        )}
      </div>
    </div>
  )
}
