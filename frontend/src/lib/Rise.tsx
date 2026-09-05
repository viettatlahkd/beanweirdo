import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

const TRANSITION = 'opacity .7s ease, transform .85s cubic-bezier(.2,.7,.3,1)'

let shared: IntersectionObserver | null = null
const callbacks = new WeakMap<Element, (on: boolean) => void>()

/*
 * Hai ngưỡng chứ không phải một, và không unobserve.
 *
 * Chủ site: kéo xuống thì ảnh có hiệu ứng, kéo ngược lên thì trang đứng im,
 * "buồn". Nên ô ảnh phải diễn lại được. Muốn diễn lại thì phải trả nó về trạng
 * thái ẩn khi ra khỏi màn — nhưng nếu hiện và ẩn cùng chung một mốc thì ô nằm
 * đúng mép màn sẽ nhấp nháy theo từng pixel cuộn. Nên tách hai mốc: hiện khi lộ
 * 12%, chỉ ẩn khi đã ra hẳn khỏi màn. Giữa hai mốc ấy nó giữ nguyên trạng thái
 * đang có.
 */
function observer() {
  if (!shared) {
    shared = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const cb = callbacks.get(entry.target)
          if (!cb) continue
          if (entry.intersectionRatio >= 0.12) cb(true)
          else if (!entry.isIntersecting) cb(false)
        }
      },
      { threshold: [0, 0.12] },
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
 * fading up as one block. It plays again every time the tile comes back into
 * view, in either direction — see the note on `observer()`.
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
    callbacks.set(el, setShown)
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
