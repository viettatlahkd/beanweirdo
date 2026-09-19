/**
 * The one button in the back office.
 *
 * Before this there was none: `admin.css` carried `.admin-btn`,
 * `.admin-btn-ghost` and `.admin-tab`, used 3, 4 and 0 times, and none of the
 * three on the Content-management screens — everything there wrote its own
 * inline style, which is how most of them ended up as bare text.
 *
 * Every level draws a visible border at rest. A control that only appears on
 * hover is a control nobody finds, and a control with no border is the thing
 * the owner was pointing at when they said the buttons look like text.
 *
 * The paint is in `admin.css` (`.ab-*`) because hover, disabled and
 * `:focus-visible` cannot be expressed inline; the measurements are in
 * `design/controls.ts`.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Level, Size } from './controls'

type Common = {
  level?: Level
  size?: Size
}

export type ButtonProps = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
    /** Drawn before the label, at the size the button's own size implies. */
    icon?: ReactNode
    children: ReactNode
  }

/**
 * `type="button"` by default on purpose: inside the several forms in the CMS a
 * bare `<button>` submits, and a row action that reloads the page is a bug that
 * only shows up once someone presses Enter in a field next to it.
 */
export function Button({ level = 'ghost', size = 'md', icon, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={`ab ab-${level} ab-${size}`} {...rest}>
      {icon}
      {children}
    </button>
  )
}

export type IconButtonProps = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'aria-label'> & {
    /**
     * Required. A button whose whole content is a drawing says nothing to a
     * screen reader, and nothing in a tooltip either until it is hovered.
     */
    label: string
    children: ReactNode
  }

/**
 * Square, at the height of the text button beside it, so a toolbar mixing the
 * two keeps one baseline. `lg` is not offered: an icon alone is never the
 * loudest thing on a screen.
 */
export function IconButton({ level = 'ghost', size = 'md', label, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      className={`ab ab-${level} ab-icon${size === 'sm' ? ' ab-icon-sm' : ''}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
}
