/**
 * Shape and size of every control in the back office.
 *
 * Style "Bàn phím" (owner, 2026-10-13): a compact tool, 32px controls, one moss green
 * for the action that saves or creates, white framed buttons for the rest and
 * bare icons that only take a ground when pointed at. The owner rejected the
 * brown-bordered set before it outright ("vẫn xấu, đổi design mới hẳn"), so
 * nothing here is carried over from it.
 *
 * The paint lives in `admin.css` (`.ab-*`) because hover, disabled and focus
 * cannot be written inline; heights there are 36 / 32 / 28 for lg / md / sm.
 */

/**
 * How loud a control is.
 * - `primary`: the one action a screen exists for (Lưu, Bài mới).
 * - `secondary`: a framed white button for everything else.
 * - `quiet`: no frame until pointed at — icon buttons (⋮, ×) and Huỷ.
 * - `danger`: deletes; red text, and a red frame once pointed at.
 * - `add`: "+ Thêm …" under a list, green text with no frame.
 */
export type Level = 'primary' | 'secondary' | 'quiet' | 'danger' | 'add'

export type Size = 'lg' | 'md' | 'sm'

/** One radius for every control and panel in the back office. */
export const radius = 6

/** The control palette. Only the back office uses it; the public site keeps the blog's ink. */
export const ctl = {
  accent: '#3E7A4E',
  accentDeep: '#2B4B33',
  accentSoft: '#E4F0DF',
  ink: '#111827',
  text: '#374151',
  sub: '#6B7280',
  frame: '#D1D5DB',
  hover: '#F3F4F6',
  red: '#DC2626',
} as const
