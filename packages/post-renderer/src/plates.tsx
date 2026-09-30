/**
 * The corner handle on a fixed picture cell.
 *
 * Every template draws a few cells whose *position* is part of the layout —
 * article's opener pair and its rail square, memo's banner, bitesize's media
 * cell and the little one beside it, a long-form figure. They are not blocks in
 * a body that can be inserted or moved; the template decides where they are and
 * only what is inside them is anyone's to change.
 *
 * Until now there was no way to put a picture in most of them. The ones that
 * could take a photo took it from a field wired somewhere else entirely — a row
 * of "tải ảnh lên" links above the canvas — so the cell you were looking at and
 * the control that filled it were never in the same place, and the rest of the
 * cells just said "chưa có ảnh" forever.
 *
 * So a cell carries its own handle, in its corner. The renderer only says
 * *where*: it takes a render prop and, when there is one, draws whatever it
 * returns pinned to the cell's top-right. What that handle looks like and what
 * pressing it does belong to the app — the package has no uploader in it and no
 * idea what a post is stored in.
 *
 * The public page passes nothing, so it draws nothing: published posts keep the
 * layout they have, to the pixel.
 */
import type { CSSProperties, ReactNode } from 'react'

/** Which cell the handle is for, and what is in it now. */
export type PlateSlot = {
  /**
   * The template's own name for this cell — 'hero', 'primary', 'fig-2'.
   *
   * The editor patches by this key, so it is part of the contract between a
   * template and whoever edits it, not a label anyone reads.
   */
  key: string
  imageUrl: string | null
}

export type PlateAction = (slot: PlateSlot) => ReactNode

/**
 * The cell must be a positioning context, or the handle pins itself to the
 * page. Spread onto the cell's own style rather than adding a wrapper: a
 * wrapper around a grid child changes the layout, which is the one thing this
 * is not allowed to do.
 */
export const plateHost: CSSProperties = { position: 'relative' }

/**
 * Top-right, inset by 10.
 *
 * Bottom is where every one of these cells already prints its caption, and the
 * captions are editable — a handle there would sit on top of the field.
 */
export function PlateCorner({ action, slot }: { action?: PlateAction; slot: PlateSlot }) {
  /*
   * Nothing to draw is not the same as a box with nothing in it. The editor
   * answers `null` for a cell it does not own — the cover, whose one place to
   * live is a band above the canvas — and an empty positioned div left behind
   * would still count as a handle to anything reading the page, tests first
   * among them.
   */
  const drawn = action?.(slot)
  if (drawn === null || drawn === undefined || drawn === false) return null
  return (
    <div
      data-plate-corner={slot.key}
      style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, lineHeight: 0 }}
    >
      {drawn}
    </div>
  )
}
