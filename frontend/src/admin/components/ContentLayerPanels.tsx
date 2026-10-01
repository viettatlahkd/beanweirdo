import { useEffect, useState, type CSSProperties, type DragEvent } from 'react'
import {
  createKeyword,
  createTopic,
  deleteKeyword,
  deleteTopic,
  listKeywords,
  listTopics,
  renameKeyword,
  reorderTopics,
  updateTopic,
  type Keyword,
  type PostVisibility,
  type Topic,
} from '../lib/apiClient'
import { useRowDrag } from '../lib/useRowDrag'
import { ink, paper, sans } from '../../design/tokens'

/**
 * The content layer's two vocabularies in Content management (migration 0027):
 * the subject › topic tree every post is filed on, and the flat theme tags.
 */

const boxed: CSSProperties = {
  boxSizing: 'border-box',
  background: paper.white,
  border: `1px solid ${paper.rule}`,
  color: ink.base,
  fontFamily: sans,
  fontSize: 13,
  padding: '5px 9px',
  outline: 'none',
}
const small: CSSProperties = { ...boxed, fontSize: 11.5, padding: '3px 6px', width: 'auto' }
const quiet: CSSProperties = { fontFamily: sans, fontSize: 11, color: ink.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }
const add: CSSProperties = { ...quiet, color: ink.green, alignSelf: 'flex-start' }
const count: CSSProperties = { fontFamily: sans, fontSize: 11, color: ink.faint, minWidth: 44 }
const handle: CSSProperties = { cursor: 'grab', color: ink.faint, fontSize: 12, userSelect: 'none', width: 12 }

function dragProps(d: ReturnType<typeof useRowDrag>, i: number) {
  return {
    draggable: true,
    onDragStart: () => d.setFrom(i),
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      d.setOver(i)
    },
    onDrop: () => d.drop(i),
    onDragEnd: d.end,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: d.over === i && d.from !== i ? '#EEF5F8' : 'transparent',
      opacity: d.from === i ? 0.5 : 1,
    } as CSSProperties,
  }
}

function moved<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** The server refuses to delete a node something still hangs on; say what. */
function deleteError(e: unknown): string {
  const p = (e as { payload?: { posts?: number; children?: number } }).payload
  if (p && (p.posts || p.children)) {
    const parts = [p.posts ? `${p.posts} bài` : '', p.children ? `${p.children} topic` : ''].filter(Boolean)
    return `Còn ${parts.join(' và ')} nằm ở đây`
  }
  return (e as Error).message
}

function AddInput({ label, onAdd }: { label: string; onAdd: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} style={add}>
        {label}
      </button>
    )
  return (
    <input
      autoFocus
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'Escape') return setOpen(false)
        if (e.key !== 'Enter') return
        const v = (e.target as HTMLInputElement).value.trim()
        setOpen(false)
        if (v) onAdd(v)
      }}
      onBlur={() => setOpen(false)}
      style={{ ...boxed, maxWidth: 260 }}
    />
  )
}

function TopicRow({
  topic,
  subjects,
  onChange,
  onDelete,
  heading,
}: {
  topic: Topic
  subjects: Topic[]
  onChange: (patch: Parameters<typeof updateTopic>[1]) => void
  onDelete: () => void
  heading?: boolean
}) {
  return (
    <>
      <span style={handle} aria-hidden>
        ⋮⋮
      </span>
      <input
        defaultValue={topic.title}
        key={topic.title}
        aria-label={`tên ${topic.title}`}
        onBlur={(e) => {
          const v = e.target.value.trim()
          if (v && v !== topic.title) onChange({ title: v })
        }}
        style={{ ...boxed, width: heading ? 240 : 220, fontWeight: heading ? 500 : 400 }}
      />
      {!heading && (
        <select aria-label={`subject của ${topic.title}`} value={topic.parent_id ?? ''} onChange={(e) => onChange({ parent_id: e.target.value })} style={small}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label={`quyền xem ${topic.title}`}
        value={topic.visibility}
        onChange={(e) => onChange({ visibility: e.target.value as PostVisibility })}
        style={small}
      >
        <option value="public">công khai</option>
        <option value="private">riêng tư</option>
      </select>
      <span style={count}>{topic.posts} bài</span>
      <button type="button" onClick={onDelete} style={quiet}>
        xoá
      </button>
    </>
  )
}

function SubjectBlock({
  subject,
  topics: children,
  subjects,
  run,
  dragRow,
}: {
  subject: Topic
  topics: Topic[]
  subjects: Topic[]
  run: (fn: () => Promise<unknown>) => void
  dragRow: ReturnType<typeof dragProps>
}) {
  const drag = useRowDrag((from, to) => run(() => reorderTopics(moved(children, from, to).map((t) => t.id))))
  const del = (t: Topic) => run(() => deleteTopic(t.id).catch((e) => Promise.reject(new Error(deleteError(e)))))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div {...dragRow}>
        <TopicRow heading topic={subject} subjects={subjects} onChange={(p) => run(() => updateTopic(subject.id, p))} onDelete={() => del(subject)} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 24 }}>
        {children.map((t, i) => (
          <div key={t.id} {...dragProps(drag, i)}>
            <TopicRow topic={t} subjects={subjects} onChange={(p) => run(() => updateTopic(t.id, p))} onDelete={() => del(t)} />
          </div>
        ))}
        <AddInput label="+ topic" onAdd={(v) => run(() => createTopic(v, subject.id))} />
      </div>
    </div>
  )
}

export function TopicsPanel() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [err, setErr] = useState<string | null>(null)

  const load = () => void listTopics().then(setTopics)
  useEffect(load, [])

  const run = (fn: () => Promise<unknown>) =>
    void fn()
      .then(() => setErr(null))
      .catch((e: Error) => setErr(e.message))
      .finally(load)

  const sorted = [...topics].sort((a, b) => a.sort_order - b.sort_order)
  const subjects = sorted.filter((t) => t.parent_id === null)
  const drag = useRowDrag((from, to) => run(() => reorderTopics(moved(subjects, from, to).map((t) => t.id))))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 18 }}>
      {err && (
        <div role="alert" style={{ fontSize: 12, color: '#8E1E42' }}>
          {err}
        </div>
      )}
      {subjects.map((s, i) => (
        <SubjectBlock
          key={s.id}
          subject={s}
          topics={sorted.filter((t) => t.parent_id === s.id)}
          subjects={subjects}
          run={run}
          dragRow={dragProps(drag, i)}
        />
      ))}
      <AddInput label="+ subject" onAdd={(v) => run(() => createTopic(v, null))} />
    </div>
  )
}

export function KeywordsPanel() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [err, setErr] = useState<string | null>(null)

  const load = () => void listKeywords().then(setKeywords)
  useEffect(load, [])

  const run = (fn: () => Promise<unknown>) =>
    void fn()
      .then(() => setErr(null))
      .catch((e: Error) => setErr(e.message))
      .finally(load)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
      {err && (
        <div role="alert" style={{ fontSize: 12, color: '#8E1E42' }}>
          {err}
        </div>
      )}
      {keywords.map((k) => (
        <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            defaultValue={k.label}
            key={k.label}
            aria-label={`tên tag ${k.label}`}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== k.label) run(() => renameKeyword(k.id, v))
            }}
            style={{ ...boxed, width: 260 }}
          />
          <span style={count}>{k.posts} bài</span>
          <button type="button" onClick={() => run(() => deleteKeyword(k.id))} style={quiet}>
            xoá
          </button>
        </div>
      ))}
      <AddInput label="+ tag mới" onAdd={(v) => run(() => createKeyword(v))} />
    </div>
  )
}
