import { useEffect, useRef, useState } from 'react'
import type { PostStatus, PostSummary, StatusAction } from '../lib/apiClient'
import { TEMPLATE_LABEL } from '../../content/templates'
import { postDescription } from '../../lib/postText'
import { garden, ink, paper, sans } from '../../design/tokens'
import { IconButton } from '../../design/Button'
import { radius } from '../../design/controls'
import { IconMore, IconPin } from '../../design/icons'
import { StatusBadge } from './StatusBadge'


/**
 * What each action does to the post, which decides how it is drawn in the menu.
 *
 * Only the ones that destroy something are marked; everything else is an
 * ordinary entry.
 */
const ACTIONS_BY_STATUS: Record<PostStatus, { label: string; action: StatusAction; danger?: true }[]> = {
  draft: [
    { label: 'Đăng', action: 'publish' },
    { label: 'Lưu trữ', action: 'archive' },
    { label: 'Xoá', action: 'delete', danger: true },
  ],
  published: [
    { label: 'Bỏ đăng', action: 'unpublish' },
    { label: 'Lưu trữ', action: 'archive' },
    { label: 'Xoá', action: 'delete', danger: true },
  ],
  archived: [
    { label: 'Khôi phục', action: 'restore' },
    { label: 'Xoá', action: 'delete', danger: true },
  ],
  deleted: [
    { label: 'Khôi phục', action: 'restore-trash' },
    { label: 'Xoá vĩnh viễn', action: 'permanently-delete', danger: true },
  ],
}

// No color field on PostSummary — pick a stable garden tint per card from
// the post id so the thumbnail fallback reads like the mockup without a
// schema change. Used only when the post has no picture anywhere in it.
const THUMB_COLORS = [garden.blush, garden.petalTint2, garden.leafTint2, garden.apricot, garden.honeyTint2]
function thumbColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return THUMB_COLORS[hash % THUMB_COLORS.length]
}

/**
 * The row's actions, behind one button.
 *
 * They used to sit on the row as three to five buttons. That put the loudest
 * thing on the screen — a wall of bordered boxes, repeated down every row — on
 * the choices nobody makes most of the time, while the thing people actually
 * do, open the post, was one small button among them.
 */
type MenuItem = { label: string; danger?: true } & ({ kind: 'copy' } | { kind: 'status'; action: StatusAction })

function RowMenu({ items, onPick }: { items: MenuItem[]; onPick: (item: MenuItem) => void }) {
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

export function PostCard({
  post,
  onAction,
  onEdit,
  onCopy,
  onPin,
}: {
  post: PostSummary
  onAction: (id: string, action: StatusAction) => void
  onEdit: (id: string) => void
  /** Start a new draft from this one's content. */
  onCopy: (id: string) => void
  /** Ghim bài lên đầu module của nó. Mọi module đều ghim được, không riêng Ghi 01. */
  onPin: (id: string, pinned: boolean) => void
}) {
  const [hover, setHover] = useState(false)

  /*
   * "Nhân bản" is not a status transition, so it does not live in
   * ACTIONS_BY_STATUS — but in the menu it is one entry among the others, and
   * it is the same for every status, so it leads.
   */
  const items: MenuItem[] = [
    { kind: 'copy', label: 'Nhân bản' },
    ...ACTIONS_BY_STATUS[post.status].map((a) => ({ kind: 'status' as const, ...a })),
  ]

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      /*
       * The whole row opens the post. There is no "Sửa" button any more: it was
       * one small box among four others, all drawn the same, for the one thing
       * people come to this list to do.
       *
       * The row itself is not a control — the title inside it is a real button,
       * so the keyboard and a screen reader get a named target, and the row is
       * the mouse's larger version of that same target. Making the row a
       * `role="button"` instead would nest the pin and the menu inside a
       * control, which is worse for both.
       */
      onClick={() => onEdit(post.id)}
      style={{
        display: 'grid',
        gridTemplateColumns: '52px minmax(0,1fr) auto',
        alignItems: 'center',
        gap: 16,
        padding: '14px 18px',
        cursor: 'pointer',
        /*
         * A card, not a row in a table. The list used to be rows divided by
         * hairlines, so hover had nothing to land on and marked itself with a
         * green bar grown on the left edge. A card has its own edge, so hover
         * darkens that edge instead of adding a second one, and the card keeps
         * the same size whether or not the pointer is on it.
         */
        borderRadius: radius,
        border: `1px solid ${hover ? ink.faint : paper.rule}`,
        background: hover ? paper.hover : paper.white,
      }}
    >
      {post.thumbnail_url ? (
        <img
          src={post.thumbnail_url}
          alt=""
          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: radius, flex: 'none' }}
        />
      ) : (
        <div style={{ width: 44, height: 44, background: thumbColor(post.id), borderRadius: radius, flex: 'none' }} />
      )}

      <div style={{ minWidth: 0 }}>
        <button type="button" className="ab-rowtitle" onClick={() => onEdit(post.id)}>
          {post.en}
        </button>
        <div style={{ fontFamily: sans, fontSize: 11, color: ink.muted, marginTop: 3 }}>
          {post.module_id} · {post.kind} · {post.date_label}
        </div>
        {/*
          The same line the reader gets under the title on the site — `lead`
          when the post has one, `vi` otherwise — through the same helper, so
          the back office cannot describe a post differently from the listing
          that publishes it. Clamped at two lines: a lead can run a paragraph,
          and a card that grows with it stops being a card.
        */}
        <div
          style={{
            fontFamily: sans,
            fontSize: 12.5,
            color: ink.soft,
            marginTop: 5,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {postDescription(post)}
        </div>
      </div>

      {/*
        Everything on the right is its own target inside a row that is itself a
        target, so each one stops the click from reaching the row.
      */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}
      >
        <span
          style={{
            fontFamily: sans,
            fontSize: 10,
            color: ink.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {post.template ? TEMPLATE_LABEL[post.template] : '—'}
        </span>
        <StatusBadge status={post.status} />
        {/* Ghim là việc của mọi module, không riêng Ghi 01: bài ghim dẫn đầu
            module của nó dù phần còn lại xếp theo gì. Nó ở ngoài menu vì nó là
            một trạng thái nhìn là thấy, không phải một việc đi tìm. */}
        <IconButton
          level={post.pinned ? 'primary' : 'ghost'}
          aria-pressed={post.pinned}
          label={post.pinned ? 'Bỏ ghim' : 'Ghim lên đầu module'}
          onClick={() => onPin(post.id, !post.pinned)}
        >
          <IconPin size={16} />
        </IconButton>
        <RowMenu
          items={items}
          onPick={(it) => (it.kind === 'copy' ? onCopy(post.id) : onAction(post.id, it.action))}
        />
      </div>
    </div>
  )
}
