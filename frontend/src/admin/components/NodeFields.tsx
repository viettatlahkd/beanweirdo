import { useState, type ReactNode } from 'react'
import { type Keyword, type Node, type NodeStatus, type updateNode } from '../lib/apiClient'
import { ancestorsOf, descendantIds } from '../../lib/contentTree'
import { ink, paper, sans } from '../../design/tokens'
import { Button } from '../../design/Button'
import { Choice, LineInput, Row } from './Detail'
import { PALETTE } from '../../lib/tagColor'

/** A topic's and a tag's own fields in the shared detail template, and their delete. */


/** A colour's companions: the dark ink on it and the two washes behind lists. */
function shades(hex: string): { on_color: string; tint: string; tint2: string } {
  const n = parseInt(hex.slice(1), 16)
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const mix = (to: number, k: number) =>
    '#' + rgb.map((c) => Math.round(c + (to - c) * k).toString(16).padStart(2, '0')).join('').toUpperCase()
  return { on_color: mix(0, 0.78), tint: mix(255, 0.82), tint2: mix(255, 0.68) }
}

const dot = { all: 'unset', cursor: 'pointer', width: 18, height: 18, borderRadius: '50%', boxSizing: 'border-box', outlineOffset: 2 } as const

/** One set for every site's nodes (owner's choice, 2026-10-13), in the words the blog uses for its posts. */
export const STATUS_CHOICES: { value: NodeStatus; label: string }[] = [
  { value: 'published', label: 'đã đăng' },
  { value: 'draft', label: 'nháp' },
  { value: 'archived', label: 'lưu trữ' },
]

export const statusLabel = (s: NodeStatus) => STATUS_CHOICES.find((c) => c.value === s)?.label ?? s

/** A node's colour — its dot in the tree and its accent on the site — on every site alike. */
export function ColorRow({ node, parent, used, save }: { node: Node; parent?: Node; used: string[]; save: (patch: Parameters<typeof updateNode>[1]) => void }) {
  const setColor = (hex: string | null) => save(hex ? { accent: hex, ...shades(hex) } : { accent: null, on_color: null, tint: null, tint2: null })
  return <ColorField value={node.accent} fallback={parent?.accent ?? null} fallbackLabel={parent ? `theo ${parent.title}` : 'chưa có màu'} used={used} onChange={setColor} />
}

/**
 * Màu: no colour of its own (the first dot, dashed in the colour it falls back
 * to), a swatch, or a typed hex. Nodes and tags pick the same way.
 */
export function ColorField({
  value,
  fallback,
  fallbackLabel,
  used,
  onChange,
}: {
  value: string | null
  fallback: string | null
  fallbackLabel: string
  used: string[]
  onChange: (hex: string | null) => void
}) {
  const swatches = [...new Set([...used, ...PALETTE.filter((c) => !used.some((u) => u.toUpperCase() === c))])].slice(0, 9)
  const on = (c: string | null) => (c ? value?.toUpperCase() === c.toUpperCase() : !value)
  return (
    <Row label="Màu">
      <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          aria-label={fallbackLabel}
          aria-pressed={on(null)}
          onClick={() => value && onChange(null)}
          style={{ ...dot, border: `1.5px ${fallback ? 'dashed' : 'solid'} ${fallback ?? ink.faint}`, outline: on(null) ? `1.5px solid ${ink.base}` : 'none' }}
        />
        {swatches.map((c) => (
          <button key={c} type="button" aria-label={c} aria-pressed={on(c)} onClick={() => onChange(c)} style={{ ...dot, background: c, outline: on(c) ? `1.5px solid ${ink.base}` : 'none' }} />
        ))}
        <span style={{ width: 92 }}>
          <LineInput label="mã màu" value={value ?? ''} placeholder="#hex" mono onSave={(v) => /^#[0-9a-f]{6}$/i.test(v.trim()) && onChange(v.trim())} />
        </span>
      </span>
    </Row>
  )
}

/** Màu, Lời dẫn, Nằm trong, Trạng thái — the name is typed in the title above. */
export function TopicFields({
  topic,
  parent,
  tree,
  used,
  save,
}: {
  topic: Node
  parent?: Node
  tree: Node[]
  used: string[]
  save: (patch: Parameters<typeof updateNode>[1]) => void
}) {
  return (
    <>
      <ColorRow node={topic} parent={parent} used={used} save={save} />
      <Row label="Lời dẫn">
        <LineInput label="Lời dẫn" value={topic.intro} multiline placeholder="bấm để viết lời dẫn…" onSave={(intro) => save({ intro })} />
      </Row>
      {/* Any node outside this one's own branch can hold it; none at all makes it a subject. */}
      <Row label="Nằm trong">
        <select aria-label="Nằm trong" value={topic.parent_id ?? ''} onChange={(e) => save({ parent_id: e.target.value || null })} style={{ font: 'inherit', color: 'inherit', width: '100%' }}>
          <option value="">tầng trên cùng (subject)</option>
          {tree
            .filter((t) => !descendantIds(tree, topic.id).includes(t.id))
            .map((t) => (
              <option key={t.id} value={t.id}>
                {'  '.repeat(ancestorsOf(tree, t.id).length)}
                {t.title}
              </option>
            ))}
        </select>
      </Row>
      <Row label="Trạng thái">
        <Choice label="Trạng thái" options={STATUS_CHOICES} value={topic.status} onChange={(status) => save({ status })} />
      </Row>
    </>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div role="group" aria-label="Xoá" style={{ margin: '14px 0 0', padding: '12px 0', borderTop: `1px solid ${ink.danger}`, borderBottom: `1px solid ${paper.rule}`, fontFamily: sans, fontSize: 13, color: ink.base, display: 'grid', gap: 10 }}>
      {children}
    </div>
  )
}

/** Deleting a topic: its children must move first; its own posts go where the owner says. */
export function RetireTopic({ topic, tree, kids, count, onRetire, onCancel }: { topic: Node; tree: Node[]; kids: number; count: number; onRetire: (to: Node | null) => void; onCancel: () => void }) {
  const targets = tree.filter((t) => t.id !== topic.id && t.parent_id !== topic.id)
  const [to, setTo] = useState(topic.parent_id ?? targets[0]?.id ?? '')
  if (kids > 0)
    return (
      <Panel>
        <span>
          {topic.title} còn {kids} mục con. Chuyển hay xoá chúng trước rồi mới xoá được mục này.
        </span>
        <span style={{ justifySelf: 'start' }}>
          <Button level="quiet" size="sm" onClick={onCancel}>
            Đóng
          </Button>
        </span>
      </Panel>
    )
  return (
    <Panel>
      {count > 0 && (
        <Row label={`Chuyển ${count} bài sang`}>
          <select aria-label={`Chuyển ${count} bài sang`} value={to} onChange={(e) => setTo(e.target.value)} style={{ font: 'inherit', color: 'inherit', width: '100%' }}>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {'  '.repeat(ancestorsOf(tree, t.id).length)}
                {t.title}
              </option>
            ))}
          </select>
        </Row>
      )}
      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button level="danger" size="sm" disabled={count > 0 && !to} onClick={() => onRetire(count > 0 ? tree.find((t) => t.id === to) ?? null : null)}>
          {count > 0 ? `Chuyển bài và xoá ${topic.title}` : `Xoá ${topic.title}`}
        </Button>
        <Button level="quiet" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
      </span>
    </Panel>
  )
}

/** Deleting a tag: merged into another on every post that has it, or taken off them. */
export function RetireTag({ tag, others, count, onRetire, onCancel }: { tag: Keyword; others: Keyword[]; count: number; onRetire: (to: Keyword | null) => void; onCancel: () => void }) {
  const [to, setTo] = useState('')
  return (
    <Panel>
      {count > 0 && (
        <Row label={`Chuyển ${count} bài sang`}>
          <select aria-label={`Chuyển ${count} bài sang`} value={to} onChange={(e) => setTo(e.target.value)} style={{ font: 'inherit', color: 'inherit', width: '100%' }}>
            <option value="">— chỉ gỡ khỏi bài —</option>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Row>
      )}
      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button level="danger" size="sm" onClick={() => onRetire(others.find((o) => o.id === to) ?? null)}>
          {to ? `Gộp vào ${others.find((o) => o.id === to)?.label} và xoá` : count > 0 ? `Gỡ khỏi ${count} bài và xoá` : `Xoá ${tag.label}`}
        </Button>
        <Button level="quiet" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
      </span>
    </Panel>
  )
}
