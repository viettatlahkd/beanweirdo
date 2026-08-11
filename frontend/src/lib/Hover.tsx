import {
  createElement,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react'

type HoverProps = {
  /** base styles, always applied */
  style?: CSSProperties
  /** merged on top of `style` while the pointer is over the element */
  hoverStyle?: CSSProperties
  /** element to render — defaults to a div */
  as?: ElementType
  children?: ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, 'style'> & {
    lang?: string
    title?: string
  }

/**
 * The prototype expressed hover states with a `style-hover` attribute handled by
 * the Design-Claude runtime. Inline styles can't carry a `:hover`, so we mirror
 * that behaviour with pointer state and a style merge — same result, same
 * specificity story (everything stays inline, nothing leaks between screens).
 */
export function Hover({ style, hoverStyle, as, children, ...rest }: HoverProps) {
  const [on, setOn] = useState(false)

  const enter = useCallback(() => setOn(true), [])
  const leave = useCallback(() => setOn(false), [])

  const merged = useMemo(
    () => (on && hoverStyle ? { ...style, ...hoverStyle } : style),
    [on, style, hoverStyle],
  )

  return createElement(
    as ?? 'div',
    {
      ...rest,
      style: merged,
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        enter()
        rest.onMouseEnter?.(e)
      },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        leave()
        rest.onMouseLeave?.(e)
      },
    },
    children,
  )
}

/**
 * Same idea, but the caller owns the markup. Returns the hover flag plus the
 * handlers to spread — used where the hovered element also drives sibling state
 * (the sidebar's width, the Notes grid's dimming).
 */
export function useHover() {
  const [on, setOn] = useState(false)
  const bind = useMemo(
    () => ({ onMouseEnter: () => setOn(true), onMouseLeave: () => setOn(false) }),
    [],
  )
  return { on, bind }
}
