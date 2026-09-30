import { useEffect, useRef, useState } from 'react'
import { IconButton } from '../../design/Button'
import { IconMore } from '../../design/icons'

/**
 * The row's actions, behind one button.
 *
 * They used to sit on the row as three to five buttons. That put the loudest
 * thing on the screen — a wall of bordered boxes, repeated down every row — on
 * the choices nobody makes most of the time, while the thing people actually
 * do, open the post, was one small button among them.
 */
export function RowMenu<T extends { label: string; danger?: true }>({
  items,
  onPick,
}: {
  items: T[]
  onPick: (item: T) => void
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    /*
     * `mousedown`, not `click`: a click that lands outside would otherwise
     * close the menu and then fall through to the row underneath, so dismissing
     * the menu would navigate into the editor.
     */
    const outside = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div ref={box} style={{ position: 'relative', flex: 'none' }}>
      <IconButton
        level={open ? 'secondary' : 'ghost'}
        label="Hành động khác"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <IconMore size={16} />
      </IconButton>

      {open && (
        <div role="menu" className="ab-menu">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              className={it.danger ? 'ab-menuitem ab-menuitem-danger' : 'ab-menuitem'}
              onClick={() => {
                setOpen(false)
                onPick(it)
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
