/**
 * The marks the back office draws.
 *
 * They were Unicode characters typed straight into JSX, which meant every
 * machine drew them with whatever face had the glyph and nothing could set
 * their weight. Two different characters carried the same meaning — `✕` in
 * thirteen places and `×` in eleven — and the pin was the emoji `📌` held at
 * `opacity: .18`, which is not visible.
 *
 * Square caps and mitred joins, not round: at 14–18px a rounded 2.2 stroke
 * reads soft, and these sit next to 11–12px text that is not soft.
 *
 * Colour is always `currentColor`, so an icon inherits the button around it
 * and there is no second place to keep the two in step.
 */
import type { CSSProperties } from 'react'

type IconProps = {
  /** Side of the square box, in px. */
  size?: number
  style?: CSSProperties
}

/**
 * `filled` swaps the stroke for a solid shape — the menu's three dots, which
 * as outlines at 16px close into blobs.
 */
function svg(size: number, style: CSSProperties | undefined, children: JSX.Element, filled = false) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2.2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flex: 'none', ...style }}
    >
      {children}
    </svg>
  )
}

export const IconClose = ({ size = 16, style }: IconProps) =>
  svg(size, style, <path d="M6 6l12 12M18 6L6 18" />)

export const IconTrash = ({ size = 16, style }: IconProps) =>
  svg(
    size,
    style,
    <>
      <path d="M4 6.5h16M9.5 6.5V3.5h5v3" />
      <path d="M6.5 6.5L7.5 20.5h9l1-14" />
      <path d="M10.5 10.5v6M13.5 10.5v6" />
    </>,
  )

export const IconUpload = ({ size = 16, style }: IconProps) =>
  svg(
    size,
    style,
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 17v3h16v-3" />
    </>,
  )

/**
 * A chain link, for "đặt link" — pasting an address instead of a file.
 *
 * Two rounded ends and the bar between them, drawn as one continuous idea so it
 * does not read as a paperclip (attach) or an arrow (open elsewhere).
 */
export const IconLink = ({ size = 16, style }: IconProps) =>
  svg(
    size,
    style,
    <>
      <path d="M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1.5 1.5" />
      <path d="M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1.5-1.5" />
    </>,
  )

/**
 * Two overlapping corners — the mark for "đặt vào khung", reopening the crop
 * dialog on a photo already in place.
 */
export const IconCrop = ({ size = 16, style }: IconProps) =>
  svg(
    size,
    style,
    <>
      <path d="M6.5 2.5v15h15" />
      <path d="M2.5 6.5h15v15" />
    </>,
  )

export const IconSearch = ({ size = 16, style }: IconProps) =>
  svg(
    size,
    style,
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L20.5 20.5" />
    </>,
  )

export const IconPlus = ({ size = 16, style }: IconProps) =>
  svg(size, style, <path d="M12 4v16M4 12h16" />)

export const IconCheck = ({ size = 16, style }: IconProps) =>
  svg(size, style, <path d="M4 12.5l5 5L20 6.5" />)

export const IconAlert = ({ size = 16, style }: IconProps) =>
  svg(size, style, <path d="M12 4v10M12 18v2" />)

export const IconInfo = ({ size = 16, style }: IconProps) =>
  svg(size, style, <path d="M12 10v10M12 4v2" />)

/** A post's date in a listing's facts line. */
export const IconCalendar = ({ size = 16, style }: IconProps) =>
  svg(size, style, <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />)

/** Reading time in a listing's facts line. */
export const IconClock = ({ size = 16, style }: IconProps) =>
  svg(
    size,
    style,
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </>,
  )

/** The template a post is written in. */
export const IconPage = ({ size = 16, style }: IconProps) =>
  svg(size, style, <path d="M6 3h8l4 4v14H6zM9 12h6M9 16h6" />)

/** The ⋮ that opens a row's or a page's actions. */
export const IconMore = ({ size = 16, style }: IconProps) =>
  svg(
    size,
    style,
    <>
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </>,
    true,
  )

/** Six dots: the handle a row is dragged by. */
export const IconGrip = ({ size = 16, style }: IconProps) =>
  svg(
    size,
    style,
    <>
      <circle cx="9" cy="6" r="1.7" />
      <circle cx="15" cy="6" r="1.7" />
      <circle cx="9" cy="12" r="1.7" />
      <circle cx="15" cy="12" r="1.7" />
      <circle cx="9" cy="18" r="1.7" />
      <circle cx="15" cy="18" r="1.7" />
    </>,
    true,
  )

/** Opens somewhere else — a new tab. */
export const IconExternal = ({ size = 16, style }: IconProps) =>
  svg(
    size,
    style,
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v6H4V6h6" />
    </>,
  )
