import { useState, type CSSProperties, type ReactNode } from 'react'
import { ink, sans } from '../../design/tokens'

/** A titled part of a CMS list — the vocabularies in Nội dung. Its title folds it away, remembered per part. */

const remembered = (id: string): boolean => {
  try {
    return localStorage.getItem(`beanweirdo.fold.${id}`) === '1'
  } catch {
    return false
  }
}

const titleStyle: CSSProperties = { fontFamily: sans, fontSize: 14, fontWeight: 600, color: ink.base }

export function SectionHead({
  id,
  title,
  children,
}: {
  /** Where the folded state is remembered. */
  id: string
  title: ReactNode
  children: ReactNode
}) {
  const [folded, setFoldedState] = useState(() => remembered(id))
  const setFolded = (v: boolean) => {
    setFoldedState(v)
    try {
      localStorage.setItem(`beanweirdo.fold.${id}`, v ? '1' : '0')
    } catch {
      /* folding is a convenience */
    }
  }

  return (
    <div style={{ display: 'grid' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px 5px 14px' }}>
        <button
          type="button"
          aria-expanded={!folded}
          onClick={() => setFolded(!folded)}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0, flex: 1 }}
        >
          <span aria-hidden style={{ fontSize: 9, color: ink.soft, width: 8, display: 'inline-block' }}>
            {folded ? '▸' : '▾'}
          </span>
          <span style={titleStyle}>{title}</span>
        </button>
      </div>
      {!folded && children}
    </div>
  )
}
