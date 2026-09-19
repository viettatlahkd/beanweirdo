/**
 * Shape and size of every control in the back office.
 *
 * These numbers used to live nowhere: each of the 36 buttons across the CMS
 * screens carried its own inline style, so 29 of them ended up with neither a
 * background nor a border — text with `cursor: pointer` — and 26 with
 * `padding: 0`, which makes the clickable box exactly the glyph box. At 10–12px
 * that is a target about 12–14px tall, against the 24×24 minimum a pointer can
 * actually be aimed at.
 *
 * The paint lives in `admin.css` because hover, disabled and focus cannot be
 * written inline. The measurements live here because other things line up
 * against them — a field next to a button, a toolbar that has to reserve a row.
 * Keep the two in step: the `.ab-*` rules read these same numbers.
 */

/** How loud a control is. Every level draws a visible 1px border at rest. */
export type Level = 'primary' | 'secondary' | 'ghost' | 'danger'

export type Size = 'lg' | 'md' | 'sm'

/**
 * One radius for everything, replacing the six that were in use (2, 3, 4, 6,
 * 10, 999). 999 stays only on the status pill, where the shape carries meaning.
 */
export const radius = 8

/** One border width, at every level and every state, so hover never shifts layout by a pixel. */
export const borderWidth = 1

export const sizes: Record<Size, { height: number; padding: number; font: number }> = {
  lg: { height: 40, padding: 20, font: 12.5 },
  md: { height: 34, padding: 16, font: 12 },
  sm: { height: 28, padding: 12, font: 11.5 },
}

/** Icon buttons are square at the md height, so they sit on a toolbar row without nudging it. */
export const iconSize = sizes.md.height

/** The glyph inside a control, by the size of the control around it. */
export const glyph: Record<Size, number> = { lg: 17, md: 16, sm: 14 }
