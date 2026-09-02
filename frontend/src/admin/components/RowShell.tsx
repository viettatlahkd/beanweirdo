/**
 * One item in an editable list, with the handles that make it one.
 *
 * The report editor grew these first: a grip in the left margin that drags to
 * reorder and takes Delete, and a pair of buttons on the right to copy or
 * remove. Article, cards and memo had none of it — their editors let you write
 * over the words that were already there and nothing else, so a post had
 * exactly as many parts as the template it was copied from, forever.
 *
 * Rather than write that three more times, it is one component. Keyboard works
 * everywhere it does: a handle that can only be dragged is a handle half the
 * people using it cannot reach.
 */
import type { ReactNode } from 'react'

export const GRIP_LABEL = 'Kéo thả để đổi thứ tự · Delete để xoá'

export type RowShellProps = {
  children: ReactNode
  /** What this row is called in the controls' labels — "khối", "phần", "thẻ". */
  noun: string
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onDuplicate?: () => void
  /** Drag state, from `useRowDrag`. */
  index: number
  drag: RowDrag
  /** Extra controls, shown before copy and remove. */
  extra?: ReactNode
}

export function RowShell({ children, noun, onMove, onRemove, onDuplicate, index, drag, extra }: RowShellProps) {
  return (
    <div
      onDragOver={(e) => {
        if (drag.from === null) return
        e.preventDefault()
        drag.setOver(index)
      }}
      onDrop={() => drag.drop(index)}
    >
      {drag.over === index && drag.from !== null && drag.from !== index && <div className="awc-dropline" />}
      <div className="awc-rep-block">
        <button
          type="button"
          className="awc-grip"
          draggable
          onDragStart={() => drag.setFrom(index)}
          onDragEnd={drag.end}
          aria-label={GRIP_LABEL}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              onMove(-1)
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              onMove(1)
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
              e.preventDefault()
              onRemove()
            }
          }}
        >
          ⠿
          <span className="awc-grip-tip">{GRIP_LABEL}</span>
        </button>
        <div className="awc-block-controls">
          {extra}
          {onDuplicate && (
            <button type="button" onClick={onDuplicate} aria-label={`nhân bản ${noun}`}>
              ⧉
            </button>
          )}
          <button type="button" onClick={onRemove} aria-label={`xoá ${noun}`}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export type RowDrag = {
  from: number | null
  over: number | null
  setFrom: (i: number | null) => void
  setOver: (i: number | null) => void
  drop: (to: number) => void
  end: () => void
}

/** The button that adds one more of whatever the list holds. */
export function AddRow({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    // `alignSelf` because some canvases lay their children out in a stretching
    // column, where a bare button spans the whole width and stops reading as one.
    <button type="button" className="awc-plus-btn" style={{ alignSelf: 'flex-start' }} onClick={onAdd}>
      + {label}
    </button>
  )
}
