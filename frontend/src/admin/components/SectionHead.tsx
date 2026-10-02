import { useState, type CSSProperties, type ReactNode } from 'react'
import { ink, paper, sans, serif } from '../../design/tokens'

/**
 * A titled part of a CMS list — the vocabularies in Nội dung, the sites and
 * groups in Quản lý trang. Its title folds it away (remembered per part), and
 * adding to it is a "+" beside the title, not a faint link under the last row.
 */

type Add =
  /** Typed: a name, then Enter. */
  | { label: string; onAdd: (text: string) => void }
  /** Picked: one of a few ways to start (a port page from a preset). */
  | { label: string; options: { value: string; label: string }[]; onPick: (value: string) => void }

const remembered = (id: string): boolean => {
  try {
    return localStorage.getItem(`beanweirdo.fold.${id}`) === '1'
  } catch {
    return false
  }
}

export const plusButton: CSSProperties = {
  all: 'unset',
  boxSizing: 'border-box',
  cursor: 'pointer',
  width: 22,
  height: 22,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${ink.green}`,
  borderRadius: 4,
  color: ink.green,
  fontFamily: sans,
  fontSize: 16,
  lineHeight: 1,
  flex: 'none',
}

const field: CSSProperties = { boxSizing: 'border-box', width: '100%', background: paper.white, border: `1px solid ${ink.green}`, color: ink.base, fontFamily: sans, fontSize: 13, padding: '5px 8px', outline: 'none' }

export function SectionHead({
  id,
  title,
  big,
  meta,
  add,
  children,
  indent = 14,
}: {
  /** Where the folded state is remembered. */
  id: string
  title: ReactNode
  /** A site in the page tree (Port, Personal Blog) rather than a group inside one. */
  big?: boolean
  meta?: ReactNode
  add?: Add
  children: ReactNode
  indent?: number
}) {
  const [folded, setFoldedState] = useState(() => remembered(id))
  const [adding, setAdding] = useState(false)
  const setFolded = (v: boolean) => {
    setFoldedState(v)
    try {
      localStorage.setItem(`beanweirdo.fold.${id}`, v ? '1' : '0')
    } catch {
      /* folding is a convenience */
    }
  }
  const titleStyle: CSSProperties = big
    ? { fontFamily: serif, fontSize: 18, color: ink.base }
    : { fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: '.16em', textTransform: 'uppercase', color: ink.faint }

  return (
    <div style={{ display: 'grid' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: big ? `14px 12px 6px ${indent - 2}px` : `12px 12px 5px ${indent}px` }}>
        <button
          type="button"
          aria-expanded={!folded}
          onClick={() => setFolded(!folded)}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0, flex: 1 }}
        >
          <span aria-hidden style={{ fontSize: 9, color: ink.faint, width: 8, display: 'inline-block' }}>
            {folded ? '▸' : '▾'}
          </span>
          <span style={titleStyle}>{title}</span>
          {meta !== undefined && <span style={{ marginLeft: 'auto', fontFamily: sans, fontSize: 11, color: ink.faint }}>{meta}</span>}
        </button>
        {add && (
          <button type="button" aria-label={`Thêm ${add.label}`} title={`Thêm ${add.label}`} aria-expanded={adding} onClick={() => (setAdding(!adding), folded && setFolded(false))} style={plusButton}>
            +
          </button>
        )}
      </div>
      {add && adding && (
        <div style={{ padding: `2px 12px 8px ${indent + 14}px` }}>
          {'onAdd' in add ? (
            <input
              autoFocus
              aria-label={`Tên ${add.label} mới`}
              placeholder={`${add.label} mới`}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setAdding(false)
                if (e.key !== 'Enter') return
                const v = e.currentTarget.value.trim()
                setAdding(false)
                if (v) add.onAdd(v)
              }}
              onBlur={() => setAdding(false)}
              style={field}
            />
          ) : (
            <div style={{ display: 'grid', gap: 2 }}>
              {add.options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => (setAdding(false), add.onPick(o.value))}
                  style={{ all: 'unset', cursor: 'pointer', fontFamily: sans, fontSize: 13, color: ink.green, padding: '3px 0' }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {!folded && children}
    </div>
  )
}
