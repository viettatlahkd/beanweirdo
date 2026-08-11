import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

const TRANSITION = 'opacity .7s ease, transform .85s cubic-bezier(.2,.7,.3,1)'

let shared: IntersectionObserver | null = null
const callbacks = new WeakMap<Element, () => void>()

function observer() {
  if (!shared) {
    shared = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          callbacks.get(entry.target)?.()
          shared!.unobserve(entry.target)
          callbacks.delete(entry.target)
        }
      },
      { threshold: 0.12 },
    )
  }
  return shared
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type RiseProps = {
  /** where the tile slides in from, e.g. `['-34px', '0px']` */
  from: [string, string]
  /** stagger, so a band assembles piece by piece instead of appearing at once */
  delay?: string
  style?: CSSProperties
  children?: ReactNode
}

/**
 * Scroll-triggered slide-in for the module image bands. Each tile drifts in from
 * its own direction with a stagger of 0–260ms, so the band assembles rather than
 * fading up as one block. Fires once — re-scrolling past it does nothing.
 */
export function Rise({ from, delay = '0ms', style, children }: RiseProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reducedMotion()) {
      setShown(true)
      return
    }
    const io = observer()
    callbacks.set(el, () => setShown(true))
    io.observe(el)
    return () => {
      io.unobserve(el)
      callbacks.delete(el)
    }
  }, [])

  return (
    <div
      ref={ref}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translate(${from[0]}, ${from[1]})`,
        transition: TRANSITION,
        transitionDelay: `${delay}, ${delay}`,
      }}
    >
      {children}
    </div>
  )
}
