import { useState, type CSSProperties } from 'react'
import { UNCLASSIFIED, hashtag, type LogEntry } from '../content/hours'
import { Hover } from '../lib/Hover'

export type TagSystem = 'task' | 'project'

/** Which tag the list is filtered to, if any. */
export type TagFilter = { system: TagSystem; name: string } | null

const groupLabel: CSSProperties = {
  fontSize: 9,
  fontWeight: 500,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: '#A2A296',
  flex: 'none',
}

const addButton: CSSProperties = {
  fontSize: 12,
  color: '#A2A296',
  border: '1px dashed #CFCFC4',
  padding: '5px 11px',
  cursor: 'pointer',
}

const draftInput: CSSProperties = {
  width: 130,
  background: '#FFFFFF',
  border: '1px solid #3E7A4E',
  color: '#172124',
  fontFamily: "'Be Vietnam Pro',sans-serif",
  fontWeight: 300,
  fontSize: 12,
  padding: '5px 9px',
  outline: 'none',
}

const chipBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  cursor: 'pointer',
}

/**
 * One tag in the bar.
 *
 * A single click filters. A double click opens the tag itself: the name
 * becomes a field — Enter or clicking away saves it — and the delete cross
 * appears pinned to the chip's top-right corner, where it can't be hit by
 * accident while filtering. Escape leaves everything as it was.
 */
function TagChip({
  name,
  count,
  on,
  dim,
  editing,
  draft,
  fill,
  dot,
  ink,
  border,
  editable,
  onDraft,
  onOpen,
  onCommit,
  onCancel,
  onDelete,
  onToggle,
}: {
  name: string
  count: number
  on: boolean
  dim: boolean
  editing: boolean
  draft: string
  /** Chip background — a project reads as a filled tab, a task as an outline. */
  fill: string
  dot: string
  ink: string
  border: string
  /** The unclassified bucket is a fact about the data, not a tag to edit. */
  editable: boolean
  onDraft: (v: string) => void
  onOpen: () => void
  onCommit: () => void
  onCancel: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  if (editing) {
    return (
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommit()
            if (e.key === 'Escape') onCancel()
          }}
          onBlur={onCommit}
          aria-label={`Đổi tên ${name}`}
          style={draftInput}
        />
        <Hover
          // mousedown, not click: the input's blur would commit and unmount
          // this button before a click ever landed on it.
          onMouseDown={(e) => {
            e.preventDefault()
            onDelete()
          }}
          aria-label={`Xoá ${name}`}
          role="button"
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 17,
            height: 17,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            lineHeight: 1,
            background: '#FCFCFA',
            border: '1px solid #CFCFC4',
            color: '#6A6F63',
            borderRadius: '50%',
            cursor: 'pointer',
          }}
          hoverStyle={{ borderColor: '#C25C7C', color: '#C25C7C' }}
        >
          ✕
        </Hover>
      </div>
    )
  }

  return (
    <div
      onClick={onToggle}
      onDoubleClick={editable ? onOpen : undefined}
      title={editable ? 'bấm để lọc · bấm hai lần để sửa hoặc xoá' : undefined}
      style={{
        ...chipBase,
        background: fill,
        border: `1px solid ${border}`,
        opacity: dim ? 0.45 : 1,
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flex: 'none' }} />
      <div style={{ fontSize: 12.5, color: ink }}>{name}</div>
      <div style={{ fontSize: 11, color: ink, opacity: on ? 0.6 : 0.55, fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </div>
    </div>
  )
}

/**
 * The two tag systems, in the order they're read everywhere else: project
 * first, then task.
 *
 * The `+` used to live in two places driven by one boolean, so opening either
 * one rendered both inputs — they fought over focus and each cleared the other's
 * draft. Which system is being added to is now part of the state, so only one
 * input can ever be open. The same state holds which tag is being edited, for
 * the same reason.
 */
export function TagBar({
  projects,
  kinds,
  logs,
  kindColor,
  projectColor,
  filter,
  onFilter,
  onAdd,
  onRename,
  onDelete,
}: {
  projects: string[]
  kinds: string[]
  logs: LogEntry[]
  kindColor: Record<string, string>
  projectColor: Record<string, string>
  filter: TagFilter
  onFilter: (f: TagFilter) => void
  onAdd: (name: string, system: TagSystem) => void
  onRename: (name: string, next: string, system: TagSystem) => void
  /** Asked, not done — the screen decides whether the tag can just go. */
  onDelete: (name: string, system: TagSystem) => void
}) {
  const [adding, setAdding] = useState<TagSystem | null>(null)
  const [editing, setEditing] = useState<{ system: TagSystem; name: string } | null>(null)
  const [draft, setDraft] = useState('')

  function commitAdd() {
    const v = draft.trim()
    const system = adding
    setAdding(null)
    setDraft('')
    if (v && system) onAdd(v, system)
  }

  function commitEdit() {
    const v = draft.trim()
    const target = editing
    setEditing(null)
    setDraft('')
    if (target && v && v !== target.name) onRename(target.name, v, target.system)
  }

  function open(system: TagSystem, name: string) {
    setAdding(null)
    setEditing({ system, name })
    setDraft(name)
  }

  const countTask = (name: string) => logs.filter((l) => l.kind === name && l.done !== false).length
  const countProject = (name: string) => logs.filter((l) => l.project === name && l.done !== false).length

  const isOn = (system: TagSystem, name: string) => filter?.system === system && filter.name === name
  const toggle = (system: TagSystem, name: string) =>
    onFilter(isOn(system, name) ? null : { system, name })

  const isEditing = (system: TagSystem, name: string) =>
    editing?.system === system && editing.name === name

  // Activities whose tag was deleted sit in the bucket. It is listed so they
  // can still be found and filtered, but it is not a tag: nothing renames it,
  // and deleting it would mean deleting the fact that they are unfiled.
  const bucketCount = countTask(UNCLASSIFIED)
  const taskTags = kinds.includes(UNCLASSIFIED) || bucketCount === 0 ? kinds : kinds.concat([UNCLASSIFIED])

  const AddControl = ({ system, label }: { system: TagSystem; label: string }) =>
    adding === system ? (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitAdd()
          if (e.key === 'Escape') {
            setAdding(null)
            setDraft('')
          }
        }}
        onBlur={commitAdd}
        autoFocus
        placeholder={label}
        style={draftInput}
      />
    ) : (
      <Hover
        onClick={() => {
          setEditing(null)
          setAdding(system)
          setDraft('')
        }}
        style={addButton}
        hoverStyle={{ color: '#3E7A4E', borderColor: '#3E7A4E' }}
      >
        +
      </Hover>
    )

  return (
    <div
      style={{
        marginTop: 30,
        padding: '14px 0 15px',
        borderTop: '1px solid #E3E3DB',
        borderBottom: '1px solid #E3E3DB',
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <div style={{ ...groupLabel, width: 54 }}>Project</div>
        {projects.map((p) => {
          const on = isOn('project', p)
          const color = projectColor[p] ?? '#102F35'
          return (
            <TagChip
              key={p}
              name={hashtag(p)}
              count={countProject(p)}
              on={on}
              dim={!!filter && !on}
              editing={isEditing('project', p)}
              draft={draft}
              fill={color}
              dot="rgba(255,255,255,.55)"
              ink="#F7F5EE"
              border={color}
              editable
              onDraft={setDraft}
              onOpen={() => open('project', p)}
              onCommit={commitEdit}
              onCancel={() => {
                setEditing(null)
                setDraft('')
              }}
              onDelete={() => {
                setEditing(null)
                setDraft('')
                onDelete(p, 'project')
              }}
              onToggle={() => toggle('project', p)}
            />
          )
        })}
        <AddControl system="project" label="project mới" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <div style={{ ...groupLabel, width: 54 }}>Task</div>
        {taskTags.map((k) => {
          const on = isOn('task', k)
          const color = kindColor[k] ?? '#A2A296'
          return (
            <TagChip
              key={k}
              name={k}
              count={countTask(k)}
              on={on}
              dim={!!filter && !on}
              editing={isEditing('task', k)}
              draft={draft}
              fill={on ? color : 'transparent'}
              dot={color}
              ink={on ? '#FFFFFF' : '#414A42'}
              border={on ? color : '#DEDED6'}
              editable={k !== UNCLASSIFIED}
              onDraft={setDraft}
              onOpen={() => open('task', k)}
              onCommit={commitEdit}
              onCancel={() => {
                setEditing(null)
                setDraft('')
              }}
              onDelete={() => {
                setEditing(null)
                setDraft('')
                onDelete(k, 'task')
              }}
              onToggle={() => toggle('task', k)}
            />
          )
        })}
        <AddControl system="task" label="loại mới" />

        {filter && (
          <Hover
            onClick={() => onFilter(null)}
            style={{
              fontSize: 11,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: '#A2A296',
              cursor: 'pointer',
              marginLeft: 4,
            }}
            hoverStyle={{ color: '#C25C7C' }}
          >
            bỏ lọc ✕
          </Hover>
        )}
      </div>

      <div style={{ fontSize: 11, color: '#C2C2B8' }}>
        Bấm để lọc · bấm hai lần vào một tag để sửa tên hoặc xoá
      </div>
    </div>
  )
}

/**
 * The `+` inside the timer rail. Same job as the bar's, on the dark ground —
 * and crucially its own draft state, so the two can never overwrite each other
 * the way one shared flag made them.
 *
 * `label` names which system is being added to: the rail carries one of these
 * per row, and "loại mới" over the project row would be a lie.
 */
export function TimerAddTag({
  onAdd,
  label = 'loại mới',
}: {
  onAdd: (name: string) => void
  label?: string
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  function commit() {
    const v = draft.trim()
    setAdding(false)
    setDraft('')
    if (v) onAdd(v)
  }

  if (adding) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setAdding(false)
            setDraft('')
          }
        }}
        onBlur={commit}
        placeholder={label}
        style={{
          width: 96,
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
    )
  }

  return (
    <Hover
      onClick={() => {
        setAdding(true)
        setDraft('')
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
      hoverStyle={{ borderColor: '#F2A0A5', color: '#F2A0A5' }}
    >
      +
    </Hover>
  )
}
