import { useState, type CSSProperties } from 'react'
import { hashtag, type LogEntry } from '../content/hours'
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

/**
 * The two tag systems, in the order they're read everywhere else: project
 * first, then task.
 *
 * The `+` used to live in two places driven by one boolean, so opening either
 * one rendered both inputs — they fought over focus and each cleared the other's
 * draft. Which system is being added to is now part of the state, so only one
 * input can ever be open.
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
}: {
  projects: string[]
  kinds: string[]
  logs: LogEntry[]
  kindColor: Record<string, string>
  projectColor: Record<string, string>
  filter: TagFilter
  onFilter: (f: TagFilter) => void
  onAdd: (name: string, system: TagSystem) => void
}) {
  const [adding, setAdding] = useState<TagSystem | null>(null)
  const [draft, setDraft] = useState('')

  function commit() {
    const v = draft.trim()
    const system = adding
    setAdding(null)
    setDraft('')
    if (v && system) onAdd(v, system)
  }

  const countTask = (name: string) => logs.filter((l) => l.kind === name && l.done !== false).length
  const countProject = (name: string) => logs.filter((l) => l.project === name && l.done !== false).length

  const isOn = (system: TagSystem, name: string) => filter?.system === system && filter.name === name
  const toggle = (system: TagSystem, name: string) =>
    onFilter(isOn(system, name) ? null : { system, name })

  const AddControl = ({ system, label }: { system: TagSystem; label: string }) =>
    adding === system ? (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setAdding(null)
            setDraft('')
          }
        }}
        onBlur={commit}
        autoFocus
        placeholder={label}
        style={draftInput}
      />
    ) : (
      <Hover
        onClick={() => {
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
            <div
              key={p}
              onClick={() => toggle('project', p)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: color,
                border: `1px solid ${color}`,
                padding: '6px 12px',
                cursor: 'pointer',
                opacity: filter && !on ? 0.45 : 1,
              }}
            >
              <div
                style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,.55)', flex: 'none' }}
              />
              <div style={{ fontSize: 12.5, color: '#F7F5EE' }}>{hashtag(p)}</div>
              <div
                style={{ fontSize: 11, color: '#F7F5EE', opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}
              >
                {countProject(p)}
              </div>
            </div>
          )
        })}
        <AddControl system="project" label="project mới" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <div style={{ ...groupLabel, width: 54 }}>Task</div>
        {kinds.map((k) => {
          const on = isOn('task', k)
          return (
            <div
              key={k}
              onClick={() => toggle('task', k)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: on ? kindColor[k] : 'transparent',
                border: `1px solid ${on ? kindColor[k] : '#DEDED6'}`,
                padding: '6px 12px',
                cursor: 'pointer',
                opacity: filter && !on ? 0.45 : 1,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: kindColor[k], flex: 'none' }} />
              <div style={{ fontSize: 12.5, color: on ? '#FFFFFF' : '#414A42' }}>{k}</div>
              <div
                style={{
                  fontSize: 11,
                  color: on ? '#FFFFFF' : '#414A42',
                  opacity: 0.55,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {countTask(k)}
              </div>
            </div>
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
    </div>
  )
}

/**
 * The `+` inside the timer rail. Same job as the bar's, on the dark ground —
 * and crucially its own draft state, so the two can never overwrite each other
 * the way one shared flag made them.
 */
export function TimerAddTag({ onAdd }: { onAdd: (name: string) => void }) {
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
