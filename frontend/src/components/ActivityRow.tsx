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

/** The three numbers on a row. Only two are stored; the third is worked out. */
export type TimeField = 'at' | 'end' | 'mins'

export const TIME_ORDER: TimeField[] = ['at', 'end', 'mins']

/**
 * Start, end and length, given which two the owner touched last.
 *
 * They cannot all three be free: pick any two and the third follows. What the
 * row used to do was fix the rule in advance — moving the start always dragged
 * the end along, editing the end always rewrote the length — which is right
 * about half the time and quietly wrong the other half.
 *
 * So the rule follows the hand instead. The field the owner has *not* touched
 * most recently is the one that gives way:
 *
 *   start + length → end   = start + length
 *   end   + length → start = end - length
 *   start + end    → length = end - start
 *
 * `recent` is newest-first and holds at most two. On the first edit of a
 * session only one field is spoken for, so two could give way; the start is
 * kept still, because an activity is remembered by when it began far more
 * often than by when it stopped. Moving the start drags the end along; typing
 * an end rewrites the length.
 *
 * Returns null when the result would not be an activity: a length of zero, or
 * an end before its start. Midnight is the only way that happens honestly, and
 * an activity crossing midnight belongs to two days rather than one.
 */
export function resolveTimes(
  next: { at: string; end: string; mins: number },
  recent: TimeField[],
): { at: string; mins: number } | null {
  const held = recent.slice(0, 2)
  // With two fields held the third is forced. With one there are two
  // candidates, and the start is the one worth keeping still: an activity is
  // remembered by when it began far more often than by when it stopped.
  const gives: TimeField =
    held.length >= 2
      ? (TIME_ORDER.find((f) => !held.includes(f)) ?? 'end')
      : held[0] === 'end'
        ? 'mins'
        : 'end'

  if (gives === 'end') {
    return next.mins > 0 ? { at: next.at, mins: next.mins } : null
  }
  if (gives === 'at') {
    const at = atToMin(next.end) - next.mins
    return at >= 0 && next.mins > 0 ? { at: minToAt(at), mins: next.mins } : null
  }
  const mins = atToMin(next.end) - atToMin(next.at)
  return mins > 0 ? { at: next.at, mins } : null
}

/** Remember a field as the most recent edit, keeping only the last two. */
export const rememberEdit = (recent: TimeField[], field: TimeField): TimeField[] =>
  [field, ...recent.filter((f) => f !== field)].slice(0, 2)

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
  onTab,
}: {
  value: string
  editing: boolean
  draft: string
  editable: boolean
  onDraft: (v: string) => void
  onOpen: () => void
  onCommit: () => void
  onCancel: () => void
  /** Tab moves along the row — start, end, length — rather than out of it. */
  onTab?: (back: boolean) => void
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
          if (e.key === 'Tab' && onTab) {
            // The three numbers are one sum being worked out; Tab should walk
            // between them, not jump to whatever the browser thinks is next.
            e.preventDefault()
            onCommit()
            onTab(e.shiftKey)
          }
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
  onTab,
}: {
  mins: number
  onCommit: (mins: number) => void
  onCancel: () => void
  onTab?: (back: boolean) => void
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
    if (e.key === 'Tab' && onTab) {
      // Hours and minutes are two boxes of one field: Tab between them stays
      // inside, and only leaves from whichever end you tabbed towards.
      //
      // The pair is found from the box that was typed in, not from
      // `currentTarget`. This handler sits on the wrapper *and* on both inputs,
      // so `currentTarget` is whichever one React is calling it for — and on an
      // input, `querySelectorAll('input')` finds nothing, `indexOf` returns -1,
      // and every Tab read as "leaving from the last box". Which is exactly
      // what it did: one Tab into the hours, the next one saved and left,
      // skipping the minutes.
      const typed = e.target as HTMLInputElement
      const boxes = [...(typed.closest('[data-duration]')?.querySelectorAll('input') ?? [])]
      const i = boxes.indexOf(typed)
      const leaving = e.shiftKey ? i <= 0 : i >= boxes.length - 1
      if (!leaving) return
      e.preventDefault()
      onCommit(total())
      onTab(e.shiftKey)
    }
  }

  const box: CSSProperties = { ...clockField, width: 42, textAlign: 'right' }
  const unit: CSSProperties = { fontSize: 12, color: '#8A8A7C' }

  return (
    <div
      data-duration
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
    >
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
  /**
   * The sittings of this activity, earliest first. Empty on an ordinary row —
   * the second tier appears only once there really is a second sitting, and
   * the way to make one is the ⊕ beside the copy button rather than a line of
   * text offering itself on every row of the day.
   */
  sittings?: LogEntry[]
  /** The sitting just added, if any — its time field opens itself. */
  freshSitting?: string | null
  onAddSitting?(): void
  /**
   * Fold this row into the matching activity above it. Absent when there is
   * nothing above it to fold into — see `mergeTargetFor`.
   */
  onMerge?(): void
  onPatchSitting?(id: string, patch: Partial<Omit<LogEntry, 'id'>>): void
  onRemoveSitting?(id: string): void
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
/**
 * One sitting of an activity that was returned to more than once.
 *
 * It carries no name and no tags: those live on the parent, and repeating them
 * under it would be asking the eye to re-read the same fact three times — and
 * would open the door to two sittings of one activity wearing different tags.
 * What it does carry is the pair of clock times and its own length, because
 * that is the whole reason the sitting exists as a row at all.
 */
/**
 * Editing the three numbers of one row.
 *
 * Shared by the plain rows and by the sittings under a heading, because the
 * arithmetic has to be the same in both — a length that behaves one way on a
 * row and another way one line below it is worse than either rule alone.
 *
 * `recent` is what makes the arithmetic follow the hand; it lives for as long
 * as the row is being worked on and is dropped when focus leaves, so a session
 * tomorrow does not inherit today's last two edits. See `resolveTimes`.
 */
function useTimeTriple(
  log: Pick<LogEntry, 'at' | 'mins'>,
  editable: boolean,
  onPatch: (patch: { at?: string; mins?: number }) => void,
) {
  const [editing, setEditing] = useState<TimeField | null>(null)
  const [draft, setDraft] = useState('')
  const [recent, setRecent] = useState<TimeField[]>([])

  function open(field: TimeField) {
    if (!editable) return
    setDraft(field === 'at' ? log.at : field === 'end' ? endOf(log) : String(log.mins))
    setEditing(field)
  }

  /** Take the typed value, work out the third number, and save both. */
  function commit(field: TimeField, typed: string | number) {
    const next = {
      at: field === 'at' ? String(typed) : log.at,
      end: field === 'end' ? String(typed) : endOf(log),
      mins: field === 'mins' ? Number(typed) : log.mins,
    }
    const held = rememberEdit(recent, field)
    setRecent(held)
    setEditing(null)

    const looksLikeTime = /^\d{1,2}:\d{2}$/.test(String(typed))
    if (field !== 'mins' && !looksLikeTime) return

    const out = resolveTimes(next, held)
    if (!out) return
    const patch: { at?: string; mins?: number } = {}
    if (out.at !== log.at) patch.at = out.at
    if (out.mins !== log.mins) patch.mins = out.mins
    if (patch.at || patch.mins) onPatch(patch)
  }

  /** Tab walks start → end → length and back, then stops at either end. */
  function step(from: TimeField, back: boolean) {
    const i = TIME_ORDER.indexOf(from) + (back ? -1 : 1)
    const to = TIME_ORDER[i]
    if (to) setTimeout(() => open(to), 0)
  }

  return { editing, draft, setDraft, recent, setRecent, open, commit, step, close: () => setEditing(null) }
}

function SittingRow({
  log,
  editable,
  last,
  color,
  fresh,
  onPatch,
  onRemove,
}: {
  log: LogEntry
  editable: boolean
  last: boolean
  color: string
  /** Just added, so the cursor starts in the time rather than waiting to be found. */
  fresh: boolean
  onPatch(patch: Partial<Omit<LogEntry, 'id'>>): void
  onRemove(): void
}) {
  const t = useTimeTriple(log, editable, onPatch)

  /**
   * A sitting arrives with a guessed start — a quarter of an hour after the
   * last one — and that guess is the first thing anyone wants to correct. So
   * the field opens itself, the way the name field does on a new row. Tab from
   * here walks on to the end and the length.
   */
  const opened = useRef(false)
  useEffect(() => {
    if (!fresh || opened.current || !editable) return
    opened.current = true
    t.open('at')
  }, [fresh, editable])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0 5px 2px' }}>
      {/* An elbow rather than a bullet: it says "belongs to the line above"
          without adding a second kind of mark to a screen that already uses
          dots for days and squares for ticks. */}
      <div style={{ fontSize: 11, color: '#CFCFC4', flex: 'none', width: 14 }}>{last ? '└' : '├'}</div>
      {/* Each sitting is ticked on its own: a morning that happened and an
          evening still ahead of you are two facts, and the day's total only
          counts the ones that did happen. */}
      <div
        onClick={() => editable && onPatch({ done: log.done === false })}
        title={log.done === false ? 'Đánh dấu đã xong' : 'Bỏ tick'}
        role="checkbox"
        aria-checked={log.done !== false}
        aria-label={`Lần ${log.at} đã xong`}
        style={{
          width: 13,
          height: 13,
          flex: 'none',
          border: `1px solid ${log.done === false ? '#D6D3C6' : color}`,
          background: log.done === false ? 'transparent' : color,
          color: '#FDFBF2',
          fontSize: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: editable ? 'pointer' : 'default',
        }}
      >
        {log.done === false ? '' : '✓'}
      </div>
      <TimeField
        value={log.at}
        editing={t.editing === 'at'}
        draft={t.draft}
        editable={editable}
        onDraft={t.setDraft}
        onOpen={() => t.open('at')}
        onCommit={() => t.commit('at', t.draft)}
        onCancel={t.close}
        onTab={(back) => t.step('at', back)}
      />
      <div style={{ fontSize: 12, color: '#B0AEA2' }}>–</div>
      <TimeField
        value={endOf(log)}
        editing={t.editing === 'end'}
        draft={t.draft}
        editable={editable}
        onDraft={t.setDraft}
        onOpen={() => t.open('end')}
        onCommit={() => t.commit('end', t.draft)}
        onCancel={t.close}
        onTab={(back) => t.step('end', back)}
      />
      <div style={{ flex: '1 1 0' }} />
      {t.editing === 'mins' ? (
        <DurationField
          mins={log.mins}
          onCommit={(next) => t.commit('mins', next)}
          onCancel={t.close}
          onTab={(back) => t.step('mins', back)}
        />
      ) : (
        <Hover
          onClick={() => t.open('mins')}
          style={{
            fontSize: 13.5,
            color: '#414A42',
            fontVariantNumeric: 'tabular-nums',
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
          onClick={onRemove}
          role="button"
          aria-label={`Xoá lần ${log.at}`}
          title="Xoá lần này"
          style={{ width: 18, textAlign: 'center', fontSize: 12, color: '#CFCFC4', cursor: 'pointer' }}
          hoverStyle={{ color: '#C25C7C' }}
        >
          ✕
        </Hover>
      )}
    </div>
  )
}

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
  sittings = [],
  freshSitting = null,
  onAddSitting,
  onMerge,
  onPatchSitting,
  onRemoveSitting,
}: ActivityRowProps) {
  /**
   * A row with sittings under it is a heading, not an activity in its own
   * right: its own clock times mean nothing, and its length is whatever the
   * sittings add up to.
   */
  const grouped = sittings.length > 0
  const total = grouped ? sittings.reduce((a, x) => a + x.mins, 0) : log.mins
  const allDone = grouped && sittings.every((x) => x.done !== false)
  const [picking, setPicking] = useState<'project' | 'task' | null>(null)
  const t = useTimeTriple(log, editable, onPatch)
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
  const working = t.editing !== null || naming

  const done = log.done !== false
  const chip = noteChip(log.note)
  const color = kindColor[log.kind] ?? '#163F42'

  return (
    <div
      ref={rowRef}
      draggable={editable && !naming && !t.editing}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', log.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      style={{ padding: '9px 0', borderBottom: '1px solid #EAE7DA' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          onClick={() => {
            if (!editable) return
            // On a heading the tick belongs to the whole group: it reads as
            // ticked when every sitting is, and pressing it settles all of
            // them. The heading's own flag is left alone — nothing reads it.
            if (grouped) sittings.forEach((x) => onPatchSitting?.(x.id, { done: !allDone }))
            else onPatch({ done: !done })
          }}
          title={(grouped ? allDone : done) ? 'Bỏ tick' : 'Đánh dấu đã xong'}
          style={{
            width: 16,
            height: 16,
            flex: 'none',
            marginTop: 4,
            border: `1px solid ${(grouped ? allDone : done) ? color : '#B9B6A6'}`,
            background: (grouped ? allDone : done) ? color : 'transparent',
            color: '#F6F2E6',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: editable ? 'pointer' : 'default',
          }}
        >
          {(grouped ? allDone : done) ? '✓' : ''}
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
            {grouped ? (
              // No clock pair here. The two ends of a grouped activity are hours
              // apart with gaps in between, so a start and an end would sit next
              // to a total they do not add up to — a subtraction nobody asked
              // for, on two numbers saying different things.
              <div style={{ fontSize: 12, color: '#8A8A7C', padding: '2px 0' }}>
                {sittings.length} lần
              </div>
            ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <TimeField
                value={log.at}
                editing={t.editing === 'at'}
                draft={t.draft}
                editable={editable}
                onDraft={t.setDraft}
                onOpen={() => t.open('at')}
                onCommit={() => t.commit('at', t.draft)}
                onCancel={t.close}
                onTab={(back) => t.step('at', back)}
              />
              <div style={{ fontSize: 12, color: '#B0AEA2' }}>–</div>
              <TimeField
                value={endOf(log)}
                editing={t.editing === 'end'}
                draft={t.draft}
                editable={editable}
                onDraft={t.setDraft}
                onOpen={() => t.open('end')}
                onCommit={() => t.commit('end', t.draft)}
                onCancel={t.close}
                onTab={(back) => t.step('end', back)}
              />
              {working && (
                <>
                  <div style={{ fontSize: 12, color: '#D6D3C6', padding: '0 2px' }}>·</div>
                  {t.editing === 'mins' ? (
                    <DurationField
                      mins={log.mins}
                      onCommit={(next) => t.commit('mins', next)}
                      onCancel={t.close}
                      onTab={(back) => t.step('mins', back)}
                    />
                  ) : (
                    <Hover
                      onClick={() => t.open('mins')}
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
            )}

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
              existed — which is nearly every row. The field to write one comes
              up with the name, so nothing has to advertise itself on a row
              that was left alone. */}
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
          ) : (
            chip && (
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
                      lineHeight: 1.5,
                      color: '#8A8A7C',
                      cursor: editable ? 'pointer' : 'default',
                      // Wraps. A link is shortened to its domain because the
                      // rest of a URL says nothing, but a note is the owner's
                      // own sentence — cutting it at the width of the column
                      // loses the half they wrote it for.
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {chip.label}
                  </div>
                )}
              </div>
            )
          )}

          {grouped && (
            <div style={{ marginTop: 7 }}>
              {sittings.map((x, i) => (
                <SittingRow
                  key={x.id}
                  log={x}
                  editable={editable}
                  last={i === sittings.length - 1}
                  color={color}
                  fresh={x.id === freshSitting}
                  onPatch={(patch) => onPatchSitting?.(x.id, patch)}
                  onRemove={() => onRemoveSitting?.(x.id)}
                />
              ))}
            </div>
          )}
        </div>

        {!working && (
          <Hover
            // The total of a grouped activity is not a field: it is the sum of
            // the sittings, and the way to change it is to change one of them.
            onClick={grouped ? undefined : () => t.open('mins')}
            title={grouped ? 'Tổng của các lần bên dưới' : undefined}
            style={{
              flex: 'none',
              marginTop: 2,
              fontSize: 18,
              color: '#172124',
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'right',
              cursor: editable && !grouped ? 'pointer' : 'default',
              padding: '2px 5px',
            }}
            hoverStyle={editable && !grouped ? { background: '#EDE9D6' } : undefined}
          >
            {fmt(total)}
          </Hover>
        )}

        {editable && onMerge && (
          <Hover
            onClick={onMerge}
            title="Gộp vào hoạt động cùng tên phía trên"
            aria-label={`Gộp ${log.name || 'hoạt động'} vào hàng trên`}
            role="button"
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
            hoverStyle={{ color: '#143C43' }}
          >
            ⇡
          </Hover>
        )}

        {editable && onAddSitting && (
          <Hover
            onClick={onAddSitting}
            title="Thêm một lần thực hiện nữa"
            aria-label={`Thêm một lần nữa cho ${log.name || 'hoạt động'}`}
            role="button"
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
            hoverStyle={{ color: '#143C43' }}
          >
            ⊕
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
