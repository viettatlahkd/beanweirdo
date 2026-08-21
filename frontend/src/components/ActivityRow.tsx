import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { hashtag, type LogEntry } from '../content/hours'
import { fmt } from '../lib/hoursStats'
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
  useEffect(() => ref.current?.focus(), [])

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
  onRemove,
}: ActivityRowProps) {
  const [picking, setPicking] = useState<'project' | 'task' | null>(null)
  const [editing, setEditing] = useState<'at' | 'mins' | null>(null)
  const [draft, setDraft] = useState('')
  const [name, setName] = useState(log.name)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (naming) {
      setName(log.name)
      nameRef.current?.focus()
    }
  }, [naming, log.name])

  const done = log.done !== false
  const color = kindColor[log.kind] ?? '#163F42'

  function openEdit(field: 'at' | 'mins') {
    if (!editable) return
    setDraft(field === 'at' ? log.at : String(log.mins))
    setEditing(field)
  }

  /**
   * Commit rather than discard. The old panel threw the half-typed value away
   * whenever focus left, so clicking anywhere lost the edit — the one thing a
   * journal must never do with something you just typed.
   */
  function commit() {
    if (editing === 'at') {
      if (/^\d{1,2}:\d{2}$/.test(draft) && draft !== log.at) onPatch({ at: draft })
    } else if (editing === 'mins') {
      const m = parseInt(draft, 10)
      if (m > 0 && m !== log.mins) onPatch({ mins: m })
    }
    setEditing(null)
  }

  const numberField: CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #3E7A4E',
    color: '#172124',
    fontFamily: "'Be Vietnam Pro',sans-serif",
    fontSize: 14,
    padding: '3px 6px',
    width: 68,
    outline: 'none',
    fontVariantNumeric: 'tabular-nums',
  }

  return (
    <div
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

            {editing === 'at' ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit()
                  if (e.key === 'Escape') setEditing(null)
                }}
                onBlur={commit}
                style={numberField}
              />
            ) : (
              <Hover
                onClick={() => openEdit('at')}
                style={{
                  fontSize: 13,
                  color: '#414A42',
                  fontVariantNumeric: 'tabular-nums',
                  cursor: editable ? 'pointer' : 'default',
                  padding: '2px 5px',
                }}
                hoverStyle={editable ? { background: '#EDE9D6' } : undefined}
              >
                {log.at}
              </Hover>
            )}

            {!editable && <div style={{ fontSize: 11, color: '#AFAFA2' }}>✓ chốt</div>}
          </div>

          {naming ? (
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') onAbandon()
              }}
              onBlur={() => onName(name.trim())}
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
        </div>

        {editing === 'mins' ? (
          <input
            autoFocus
            type="number"
            min={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') setEditing(null)
            }}
            onBlur={commit}
            style={{ ...numberField, flex: 'none', marginTop: 2 }}
          />
        ) : (
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
