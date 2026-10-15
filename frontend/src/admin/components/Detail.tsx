import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { ink, sans } from '../../design/tokens'
import { ctl, radius } from '../../design/controls'
import { Button, ButtonLink, IconButton } from '../../design/Button'
import { IconExternal, IconGrip, IconMore, IconPlus } from '../../design/icons'
import type { DropWhere } from '../../lib/treeMove'

/**
 * The one shape every detail panel of Cấu hình is drawn in (owner, 2026-10-13).
 *
 * Each item used to bring its own layout: Mục lục a form, a topic a column of
 * boxes, a port page a builder, and "Các trang port" three buttons on an empty
 * page. The owner asked for one template for everything that does the same job:
 *
 * - `DetailHead`: where you are, the name, the public address, the status,
 *   and a ⋮ that is the only place anything is deleted — on a page that
 *   cannot be, the line is still there, greyed, saying why;
 * - `Section` + `Row`: a panel per part, a label on the left of each field;
 * - `ItemList`: the children of the item, with "+ Thêm …" under them, which
 *   opens one new line and a Lưu button. Children are dragged into order and
 *   deleted from their own ⋮ here, since the tree on the left holds only cards.
 *
 * The first version was hairlines and light grey text on cream, and the owner
 * found it faint and hard to use ("mờ mờ mờ"). From three styles they picked
 * "Bàn làm việc" (2026-10-13): white panels on a warm grey desk, labels and
 * text in dark ink at 13–14px, fields with a visible frame, choices as joined
 * buttons, on/off as a switch. Fields drawn by older editors inside a panel
 * (the port's blocks, a page's fixed copy) get the same frames through
 * `DETAIL_CSS`, scoped to `.cfg-detail`.
 */

/** The desk and its panels. Ink stays the blog's; only the grounds are new. */
export const desk = {
  ground: '#EFEDE7',
  panel: '#FFFFFF',
  line: '#E3DFD5',
  /** The frame of a field: dark enough to see on white, lighter than a button's. */
  field: '#D1D5DB',
  /** Behind the address and a selected row. */
  soft: '#E4F0DF',
} as const

export type DetailAction = {
  label: string
  onPick?: () => void
  danger?: true
  /** Why the action cannot be taken here; the line is shown greyed with this under it. */
  off?: string
}

/** One step of where the item sits; a step with `open` goes back to it. */
export type Crumb = { label: string; open?: () => void }

/**
 * The ⋮ that holds a row's or a page's actions — the one shape for "more
 * actions" across the admin, so no screen lists its actions as a line of links.
 *
 * The list is placed against the window, not the button's box: rows sit inside
 * scrolling tables and panels, and a list hung inside them is clipped at their
 * edge or grows a scrollbar there. It opens upwards when the window has no room
 * below, and closes on scroll since it would no longer sit by its button.
 */
export function Menu({ actions, label = 'Thao tác', small }: { actions: DetailAction[]; label?: string; small?: boolean }) {
  const [at, setAt] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const open = at !== null
  useEffect(() => {
    if (!open) return
    // `mousedown`: a click that closes the menu must not also land on what is under it.
    const outside = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setAt(null)
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setAt(null)
    const away = () => setAt(null)
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    window.addEventListener('scroll', away, true)
    window.addEventListener('resize', away)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('scroll', away, true)
      window.removeEventListener('resize', away)
    }
  }, [open])
  const toggle = () => {
    if (open || !box.current) return setAt(null)
    const r = box.current.getBoundingClientRect()
    const right = window.innerWidth - r.right
    // Room for every line plus the list's padding; a greyed line carries its reason under it.
    const need = actions.reduce((h, a) => h + (a.off ? 56 : 38), 12)
    setAt(window.innerHeight - r.bottom < need && r.top > need ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right })
  }
  return (
    <div ref={box} style={{ position: 'relative', flex: 'none' }}>
      <IconButton label={label} size={small ? 'sm' : 'md'} level={small ? 'quiet' : 'secondary'} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        <IconMore />
      </IconButton>
      {at && (
        <div role="menu" className="ab-menu" style={at}>
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              disabled={!!a.off}
              data-danger={a.danger}
              onClick={() => {
                setAt(null)
                a.onPick?.()
              }}
              className="ab-menuitem"
            >
              {a.label}
              {a.off && <small>{a.off}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function DetailHead({
  crumbs,
  title,
  rename,
  address,
  facts = [],
  actions,
}: {
  /** Where the item sits, outermost first, without the item itself. */
  crumbs: Crumb[]
  title: string
  /** When set, the name is typed straight into the title. */
  rename?: (v: string) => void
  /** The public page, when the item has one. */
  address?: string
  /** Short facts after the address: a count, the status. */
  facts?: string[]
  actions: DetailAction[]
}) {
  return (
    <header style={{ display: 'grid', gap: 6, padding: '2px 2px 4px' }}>
      <div aria-label="Đang sửa" style={{ fontFamily: sans, fontSize: 13, color: ink.soft }}>
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && ' › '}
            {c.open ? (
              <button type="button" onClick={c.open} className="cfg-crumb">
                {c.label}
              </button>
            ) : (
              c.label
            )}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ flex: 1, minWidth: 200, fontFamily: sans, fontWeight: 600, fontSize: 26, letterSpacing: '-.01em', lineHeight: 1.2, margin: 0, color: ink.base }}>
          {rename ? (
            <input
              aria-label="Tên"
              key={title}
              defaultValue={title}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== title) rename(v)
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="cfg-line"
              style={{ font: 'inherit', letterSpacing: 'inherit', color: 'inherit', width: '100%' }}
            />
          ) : (
            title
          )}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {address && (
            <ButtonLink href={address} target="_blank" rel="noreferrer" icon={<IconExternal />}>
              Xem trang
            </ButtonLink>
          )}
          <Menu actions={actions} />
        </div>
      </div>
      {(address || facts.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontFamily: sans, fontSize: 13, color: ink.strong }}>
          {address && <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, color: ink.moss, background: desk.soft, padding: '3px 8px', borderRadius: radius }}>{address}</span>}
          {facts.map((f, i) => (
            <span key={f}>
              {(i > 0 || address) && <span aria-hidden style={{ color: ink.faint, marginRight: 8 }}>·</span>}
              {f}
            </span>
          ))}
        </div>
      )}
    </header>
  )
}

/** One part of an item: a white panel on the desk, its name and a note at the top. */
export function Section({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="cfg-sec" style={{ marginTop: 14, background: desk.panel, border: `1px solid ${desk.line}`, borderRadius: radius, padding: '0 18px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px 12px', padding: '13px 0 11px', borderBottom: `1px solid ${desk.line}` }}>
        <h3 style={{ fontFamily: sans, fontWeight: 600, fontSize: 15, color: ink.base, margin: 0 }}>{title}</h3>
        {note && <span style={{ fontFamily: sans, fontSize: 13, color: ink.soft }}>{note}</span>}
      </div>
      {children}
    </section>
  )
}

/** One field: its name on the left, the value on the right, a line between fields. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cfg-field" style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr)', gap: 18, alignItems: 'center', padding: '11px 0', fontFamily: sans, fontSize: 14, color: ink.base }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: ink.strong }}>{label}</span>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  )
}

/** A short set of choices as joined buttons; the one in force is filled. */
export function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <span role="group" aria-label={label} className="ab-seg">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => o.value !== value && onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </span>
  )
}

/** On or off, as a switch with its state written beside it. */
export function Switch({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-label={label} aria-checked={value} onClick={() => onChange(!value)} className="ab-switch">
      <span aria-hidden />
      {value ? 'Hiện' : 'Ẩn'}
    </button>
  )
}

/** A text field in a frame. Saves on leaving it. */
export function LineInput({ label, value, onSave, multiline, placeholder, mono }: { label: string; value: string; onSave: (v: string) => void; multiline?: boolean; placeholder?: string; mono?: boolean }) {
  const common = {
    'aria-label': label,
    defaultValue: value,
    placeholder: placeholder ?? 'bấm để viết…',
    style: { width: '100%', font: 'inherit', fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'inherit', color: 'inherit', lineHeight: 1.5 },
    onBlur: (e: { target: { value: string } }) => e.target.value !== value && onSave(e.target.value),
  }
  return multiline ? <textarea key={value} rows={2} {...common} style={{ ...common.style, resize: 'vertical' }} /> : <input key={value} {...common} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
}

export const WHERE_WORDS: Record<DropWhere, string> = { before: 'trước', after: 'sau', inside: 'vào trong' }

/** A row that can be dragged and dropped on; `mark` is where a drop held over it would land. */
export type ItemDrag = {
  onDragStart: (e: DragEvent<HTMLElement>) => void
  onDragOver: (e: DragEvent<HTMLElement>) => void
  onDragLeave: () => void
  onDrop: (e: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  dragging: boolean
  mark: DropWhere | null
}

export type ListItem = {
  id: string
  name: string
  meta?: string
  dot?: string | null
  /** Indent under the row above, for a list that is a tree (Phần chung). */
  depth?: number
  onOpen: () => void
  drag?: ItemDrag
  /** The row's own ⋮: the same actions its detail's ⋮ holds. */
  actions?: DetailAction[]
}

/** What "+ Thêm …" asks before it saves: a name, and optionally one choice. */
export type AddSpec = {
  label: string
  placeholder: string
  choose?: { label: string; options: { value: string; label: string }[] }
  onSave: (name: string, choice?: string) => void
  /**
   * A page that already exists, offered beside making a new one (owner,
   * 2026-10-15: the top bar could only grow by new pages, never link one
   * that was already there, like the journal).
   */
  existing?: { options: { value: string; label: string }[]; onPick: (value: string) => void }
}

type AddMode = 'new' | 'existing'
const ADD_MODES: { value: AddMode; label: string }[] = [
  { value: 'new', label: 'Trang mới' },
  { value: 'existing', label: 'Trang có sẵn' },
]

function AddLine({ spec }: { spec: AddSpec }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AddMode>('new')
  const [name, setName] = useState('')
  const [choice, setChoice] = useState(spec.choose?.options[0]?.value ?? '')
  const [target, setTarget] = useState('')
  const existing = mode === 'existing' && spec.existing
  const close = () => {
    setOpen(false)
    setMode('new')
    setName('')
    setTarget('')
  }
  const ready = existing ? !!target : !!name.trim()
  const save = () => {
    if (!ready) return
    if (existing) existing.onPick(target)
    else spec.onSave(name.trim(), spec.choose ? choice : undefined)
    close()
  }
  const row = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontFamily: sans, fontSize: 13, fontWeight: 600, color: ink.strong } as const
  if (!open)
    return (
      <div style={{ paddingTop: 12 }}>
        <Button level="add" icon={<IconPlus />} onClick={() => setOpen(true)}>
          {spec.label}
        </Button>
      </div>
    )
  return (
    <div style={{ display: 'grid', gap: 12, padding: '12px 0 2px' }}>
      {spec.existing && <Choice label="Thêm" options={ADD_MODES} value={mode} onChange={setMode} />}
      {existing ? (
        existing.options.length ? (
          <select autoFocus aria-label="Trang có sẵn" value={target} onChange={(e) => setTarget(e.target.value)} style={{ fontFamily: sans, fontSize: 14.5, color: ink.base, maxWidth: 420 }}>
            <option value="" disabled>
              chọn một trang
            </option>
            {existing.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <p style={{ fontFamily: sans, fontSize: 13.5, color: ink.soft, margin: 0 }}>Mọi trang có sẵn đều đã ở đây.</p>
        )
      ) : (
        <>
          <input
            autoFocus
            aria-label={spec.label}
            placeholder={spec.placeholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => (e.key === 'Enter' ? save() : e.key === 'Escape' && close())}
            style={{ fontFamily: sans, fontSize: 14.5, color: ink.base, maxWidth: 420 }}
          />
          {spec.choose && (
            <div style={row}>
              {spec.choose.label} <Choice label={spec.choose.label} options={spec.choose.options} value={choice} onChange={setChoice} />
            </div>
          )}
        </>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button level="primary" disabled={!ready} onClick={save}>
          Lưu
        </Button>
        <Button level="quiet" onClick={close}>
          Huỷ
        </Button>
      </div>
    </div>
  )
}

/** The children of an item, numbered, with their facts at the end; a click opens one. */
export function ItemList({ label, items, add, empty }: { label: string; items: ListItem[]; add?: AddSpec; empty?: string }) {
  return (
    <div>
      {items.length === 0 && empty && <p style={{ fontFamily: sans, fontSize: 13.5, color: ink.soft, margin: '12px 0 0' }}>{empty}</p>}
      <ol aria-label={label} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((it, i) => {
          const mark = it.drag?.mark
          return (
            <li
              key={it.id}
              className="cfg-row"
              onDragOver={it.drag?.onDragOver}
              onDragLeave={it.drag?.onDragLeave}
              onDrop={it.drag?.onDrop}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderTop: i ? `1px solid ${desk.line}` : 'none',
                // Where the drop will land: a line above or below, or the whole row lit for "inside".
                boxShadow: mark === 'before' ? `inset 0 3px 0 ${ink.green}` : mark === 'after' ? `inset 0 -3px 0 ${ink.green}` : 'none',
                outline: mark === 'inside' ? `2px solid ${ink.green}` : 'none',
                outlineOffset: -2,
                background: mark === 'inside' ? desk.soft : 'transparent',
                opacity: it.drag?.dragging ? 0.45 : 1,
              }}
            >
              {it.drag ? (
                // Only the grip starts a drag, so a click that slips never moves anything.
                <span
                  className="ab-grip"
                  draggable
                  role="img"
                  aria-label={`Kéo ${it.name}`}
                  title={`Kéo ${it.name}`}
                  onDragStart={it.drag.onDragStart}
                  onDragEnd={it.drag.onDragEnd}
                >
                  <IconGrip size={14} />
                </span>
              ) : (
                <span style={{ width: 20, flex: 'none' }} />
              )}
              <button type="button" onClick={it.onOpen} className="cfg-item" style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 6px', paddingLeft: 6 + (it.depth ?? 0) * 20, borderRadius: radius }}>
                <span aria-hidden style={{ fontFamily: sans, fontSize: 12.5, color: ink.soft, width: 20, flex: 'none', fontVariantNumeric: 'tabular-nums' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {it.dot && <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: it.dot, flex: 'none' }} />}
                <span style={{ flex: 1, minWidth: 0, fontFamily: sans, fontSize: 14.5, fontWeight: 500, color: ink.base, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                {/* While something is held over the row, its facts give way to where the drop will land. */}
                {mark ? (
                  <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: ink.green, whiteSpace: 'nowrap' }}>
                    {WHERE_WORDS[mark]} {it.name}
                  </span>
                ) : (
                  it.meta && <span style={{ fontFamily: sans, fontSize: 13, color: ink.strong, whiteSpace: 'nowrap' }}>{it.meta}</span>
                )}
              </button>
              {it.actions ? <Menu actions={it.actions} label={`Thao tác ${it.name}`} small /> : <span style={{ width: 28, flex: 'none' }} />}
            </li>
          )
        })}
      </ol>
      {add && <AddLine spec={add} />}
    </div>
  )
}

/**
 * Gives every field inside a panel the same frame, the old editors' included,
 * and draws hover and focus, which inline styles cannot. `!important` because
 * those editors set their borders inline. The title's `.cfg-line` stays
 * frameless until it is pointed at, since it reads as the page's name.
 */
export const DETAIL_CSS = `
.cfg-detail input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]):not(.cfg-line),
.cfg-detail textarea, .cfg-detail select {
  border: 1px solid ${desk.field} !important; border-radius: ${radius}px !important; background: ${desk.panel} !important;
  box-shadow: none !important; outline: none; padding: 8px 11px !important; box-sizing: border-box;
  font-family: ${sans}; font-size: 14px !important; color: ${ink.base} !important; max-width: 100%;
}
.cfg-detail input::placeholder, .cfg-detail textarea::placeholder { color: ${ink.muted}; }
.cfg-detail input:hover, .cfg-detail textarea:hover, .cfg-detail select:hover { border-color: ${ink.soft} !important; }
.cfg-detail input:focus, .cfg-detail textarea:focus, .cfg-detail select:focus { border-color: ${ctl.accent} !important; box-shadow: 0 0 0 3px ${ctl.accentSoft} !important; }
.cfg-detail .cfg-line { border: 1px solid transparent; border-radius: ${radius}px; background: transparent; outline: none; padding: 2px 6px; margin-left: -7px; }
.cfg-detail .cfg-line:hover { border-color: ${desk.field}; }
.cfg-detail .cfg-line:focus { border-color: ${ctl.accent}; background: ${desk.panel}; box-shadow: 0 0 0 3px ${ctl.accentSoft}; }
.cfg-detail .cfg-field + .cfg-field { border-top: 1px solid ${desk.line}; }
.cfg-detail .cfg-item:focus-visible, .cfg-detail .cfg-crumb:focus-visible { outline: 2px solid ${ctl.accent}; outline-offset: 2px; }
.cfg-detail .cfg-item:hover { background: ${ctl.hover}; }
.cfg-detail .cfg-crumb { all: unset; cursor: pointer; color: ${ink.strong}; text-decoration: underline; text-decoration-color: ${ink.faint}; text-underline-offset: 3px; }
.cfg-detail .cfg-crumb:hover { color: ${ctl.accentDeep}; text-decoration-color: currentColor; }
.cfg-detail label, .cfg-detail .cfg-sec { font-family: ${sans}; }
@media (max-width: 640px) { .cfg-detail .cfg-field { grid-template-columns: minmax(0, 1fr) !important; gap: 8px !important; } }
`
