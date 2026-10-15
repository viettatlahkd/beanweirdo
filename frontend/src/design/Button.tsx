/**
 * The one button in the back office, in three shapes: `Button` (a label, maybe
 * an icon), `IconButton` (an icon alone) and `ButtonLink` (looks the same, goes
 * somewhere). Every screen draws these instead of styling a `<button>` inline,
 * which is how the admin ended up with three button looks side by side.
 *
 * The paint is in `admin.css` (`.ab-*`); see `design/controls.ts` for the levels.
 */
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import type { Level, Size } from './controls'

type Common = {
  level?: Level
  size?: Size
}

type ButtonProps = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
    /** Drawn before the label. */
    icon?: ReactNode
    /** A keyboard shortcut shown after the label, e.g. "⌘S". Only drawn; the screen binds the key. */
    shortcut?: string
    children: ReactNode
  }

const cls = (level: Level, size: Size, extra = '') => `ab ab-${level} ab-${size}${extra}`

/**
 * `type="button"` by default on purpose: inside the several forms in the CMS a
 * bare `<button>` submits, and a row action that reloads the page is a bug that
 * only shows up once someone presses Enter in a field next to it.
 */
export function Button({ level = 'secondary', size = 'md', icon, shortcut, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={cls(level, size)} {...rest}>
      {icon}
      {children}
      {shortcut && <kbd className="ab-kbd">{shortcut}</kbd>}
    </button>
  )
}

type IconButtonProps = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'aria-label'> & {
    /**
     * Required. A button whose whole content is a drawing says nothing to a
     * screen reader, and nothing in a tooltip either until it is hovered.
     */
    label: string
    children: ReactNode
  }

/** Square, at the height of the text button beside it, so a toolbar keeps one line. */
export function IconButton({ level = 'quiet', size = 'md', label, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} className={cls(level, size, ' ab-icon')} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  )
}

type ButtonLinkProps = Common &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> & {
    icon?: ReactNode
    children: ReactNode
  }

/** A link drawn as a button — "Xem trang", "Xem trước" — so it opens in a new tab like a link. */
export function ButtonLink({ level = 'secondary', size = 'md', icon, children, ...rest }: ButtonLinkProps) {
  return (
    <a className={cls(level, size)} {...rest}>
      {icon}
      {children}
    </a>
  )
}
