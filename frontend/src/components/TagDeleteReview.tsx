import { useMemo, useState, type CSSProperties } from 'react'
import type { TagMove } from '../admin/lib/apiClient'
import { UNCLASSIFIED, hashtag, type LogEntry } from '../content/hours'
import { fmt } from '../lib/hoursStats'
import { Hover } from '../lib/Hover'
import type { TagSystem } from './TagBar'

export type TagTarget = { system: TagSystem; name: string }

/** Picker sentinels — a project may legitimately be none, and may be typed fresh. */
const NONE = '__none__'
const NEW = '__new__'

const label: CSSProperties = {
  fontWeight: 500,
  fontSize: 9,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
  color: '#A2A296',
}

const button: CSSProperties = {
  fontSize: 11,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  padding: '11px 16px',
  cursor: 'pointer',
  textAlign: 'center',
}

const field: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#FFFFFF',
  color: '#172124',
  fontFamily: 'inherit',
  fontSize: 13,
  padding: '8px 10px',
  outline: 'none',
}

/**
 * What happens to the work when a tag is taken away.
 *
 * Deleting a tag that is in use is not one decision but two — drop the label,
 * and say what the activities wearing it become. Doing the second silently is
 * how a month of "work" becomes a month of something else without anyone
 * choosing it, so the activities are listed and moved in batches: pick a
 * replacement, tick the ones it applies to, move them, and whatever is left is
 * asked about again. Anything never spoken for lands in the unclassified
 * bucket, which keeps its hours in the totals under a name that admits what it
 * is.
 */
export function TagDeleteReview({
  target,
  logs,
  kinds,
  projects,
  onAddTag,
  onConfirm,
  onCancel,
}: {
  target: TagTarget
  /** Every log the screen holds — the ones wearing the tag are picked out here. */
  logs: LogEntry[]
  kinds: string[]
  projects: string[]
  onAddTag: (name: string, system: TagSystem) => Promise<void> | void
  onConfirm: (plan: { moves: TagMove[] }) => void
  onCancel: () => void
}) {
  const [moves, setMoves] = useState<TagMove[]>([])
  const [pick, setPick] = useState('')
  const [checked, setChecked] = useState<string[]>([])
  const [drafting, setDrafting] = useState(false)
  const [draft, setDraft] = useState('')

  const column = target.system === 'task' ? 'kind' : 'project'
  const wearing = useMemo(
    () =>
      logs
        .filter((l) => l[column] === target.name)
        .slice()
        .sort((a, b) => (a.date === b.date ? a.at.localeCompare(b.at) : a.date < b.date ? 1 : -1)),
    [logs, column, target.name],
  )

  const spoken = new Set(moves.flatMap((m) => m.ids))
  const remaining = wearing.filter((l) => !spoken.has(l.id))

  // The tag on its way out is not somewhere its own activities can go.
  const options = (target.system === 'task' ? kinds : projects).filter((t) => t !== target.name)

  const allChecked = remaining.length > 0 && checked.length === remaining.length
  const canMove = pick !== '' && checked.length > 0

  const draw = (name: string) => (target.system === 'project' ? hashtag(name) : name)
  const pickLabel = pick === NONE ? 'không thuộc project' : draw(pick)

  function toggle(id: string) {
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.concat([id])))
  }

  function commitDraft() {
    const v = draft.trim()
    setDrafting(false)
    setDraft('')
    if (!v) return
    void onAddTag(v, target.system)
    setPick(v)
  }

  function applyMove() {
    if (!canMove) return
    setMoves((ms) => ms.concat([{ to: pick === NONE ? null : pick, ids: checked }]))
    setChecked([])
    setPick('')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Xoá tag ${target.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16,47,53,.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 40,
      }}
    >
      <div
        style={{
          background: '#FCFCFA',
          color: '#172124',
          width: 'min(560px,100%)',
          maxHeight: '86vh',
          overflowY: 'auto',
          padding: '26px 26px 22px',
          fontFamily: "'Be Vietnam Pro',sans-serif",
          fontWeight: 300,
        }}
      >
        <div style={{ ...label, marginBottom: 10 }}>Xoá tag</div>
        <div style={{ fontSize: 19, marginBottom: 6 }}>{draw(target.name)}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: '#6A6F63', marginBottom: 20 }}>
          {wearing.length} hoạt động đang mang tag này. Chọn tag thay thế cho từng nhóm; phần không được
          chọn sẽ vào <strong style={{ fontWeight: 500 }}>{UNCLASSIFIED}</strong> — nhóm chìm dành cho hoạt
          động chưa phân loại, vẫn được tính trong thống kê.
        </div>

        {moves.length > 0 && (
          <div style={{ borderTop: '1px solid #E3E3DB', padding: '12px 0', marginBottom: 4 }}>
            <div style={{ ...label, marginBottom: 8 }}>Đã sắp xếp</div>
            {moves.map((m, i) => (
              <div key={i} style={{ fontSize: 12.5, marginBottom: 5 }}>
                {m.ids.length} hoạt động → {m.to === null ? 'không thuộc project' : draw(m.to)}
              </div>
            ))}
            <Hover
              onClick={() => {
                setMoves([])
                setChecked([])
                setPick('')
              }}
              style={{ fontSize: 11, color: '#A2A296', cursor: 'pointer', marginTop: 4 }}
              hoverStyle={{ color: '#C25C7C' }}
            >
              làm lại từ đầu
            </Hover>
          </div>
        )}

        {remaining.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid #E3E3DB', paddingTop: 14 }}>
              <div style={{ ...label, marginBottom: 9 }}>Chuyển sang</div>
              {drafting ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitDraft()
                    if (e.key === 'Escape') {
                      setDrafting(false)
                      setDraft('')
                    }
                  }}
                  onBlur={commitDraft}
                  placeholder={target.system === 'task' ? 'loại mới' : 'project mới'}
                  style={{ ...field, border: '1px solid #3E7A4E' }}
                />
              ) : (
                <select
                  aria-label="Tag thay thế"
                  value={pick}
                  onChange={(e) => {
                    if (e.target.value === NEW) {
                      setDrafting(true)
                      setDraft('')
                      return
                    }
                    setPick(e.target.value)
                  }}
                  style={{ ...field, border: '1px solid #DEDED6', cursor: 'pointer' }}
                >
                  <option value="">— chọn tag —</option>
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {draw(o)}
                    </option>
                  ))}
                  {target.system === 'project' && <option value={NONE}>— không thuộc project —</option>}
                  <option value={NEW}>+ tạo tag mới…</option>
                </select>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: '16px 0 6px',
              }}
            >
              <div style={label}>Hoạt động ({remaining.length})</div>
              <Hover
                onClick={() => setChecked(allChecked ? [] : remaining.map((l) => l.id))}
                style={{ fontSize: 11, color: '#3E7A4E', cursor: 'pointer' }}
                hoverStyle={{ color: '#102F35' }}
              >
                {allChecked ? 'bỏ chọn tất cả' : 'chọn tất cả'}
              </Hover>
            </div>

            <div style={{ maxHeight: 220, overflowY: 'auto', borderTop: '1px solid #E3E3DB' }}>
              {remaining.map((l) => (
                <label
                  key={l.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 2px',
                    borderBottom: '1px solid #EDEDE6',
                    cursor: 'pointer',
                    fontSize: 12.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked.includes(l.id)}
                    onChange={() => toggle(l.id)}
                    style={{ flex: 'none' }}
                  />
                  <span style={{ color: '#A2A296', fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
                    {l.date.slice(5)} · {l.at}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.name || '(chưa đặt tên)'}
                  </span>
                  <span style={{ color: '#6A6F63', flex: 'none' }}>{fmt(l.mins)}</span>
                </label>
              ))}
            </div>

            <Hover
              onClick={applyMove}
              role="button"
              style={{
                ...button,
                marginTop: 14,
                background: canMove ? '#102F35' : '#EDEDE6',
                color: canMove ? '#F4F4EF' : '#A2A296',
                cursor: canMove ? 'pointer' : 'default',
              }}
              hoverStyle={canMove ? { background: '#1B4650' } : {}}
            >
              {canMove
                ? `Chuyển ${checked.length} hoạt động sang ${pickLabel}`
                : 'Chọn tag thay thế và tick hoạt động'}
            </Hover>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <Hover
            onClick={() => onConfirm({ moves })}
            role="button"
            style={{ ...button, flex: 1, background: 'oklch(0.50 0.135 14)', color: '#FFF5F2' }}
            hoverStyle={{ background: 'oklch(0.42 0.125 14)' }}
          >
            {remaining.length > 0 ? `Xoá tag, ${remaining.length} còn lại vào ${UNCLASSIFIED}` : 'Xoá tag'}
          </Hover>
          <Hover
            onClick={onCancel}
            role="button"
            style={{ ...button, flex: 'none', border: '1px solid #DEDED6', color: '#6A6F63' }}
            hoverStyle={{ borderColor: '#102F35', color: '#102F35' }}
          >
            Huỷ
          </Hover>
        </div>

        <div style={{ fontSize: 11.5, color: '#A2A296', marginTop: 12, lineHeight: 1.6 }}>
          Xoá xong vẫn hoàn tác được bằng Ctrl+Z — tag và toàn bộ hoạt động cũ trở lại như trước.
        </div>
      </div>
    </div>
  )
}
