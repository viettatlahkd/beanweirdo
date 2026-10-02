import { useEffect, useState, type ReactNode } from 'react'

/**
 * The size of an element, kept current as it is resized. A callback ref, so an
 * element that appears after the first render (once data has loaded) is still
 * measured. No observer (old browsers, test DOMs) leaves it at 0 — "not
 * measured yet" to every caller.
 */
export function useSize<T extends HTMLElement>(): [(el: T | null) => void, { width: number; height: number }] {
  const [el, setEl] = useState<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setSize({ width: e.contentRect.width, height: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [setEl, size]
}

export function useWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [ref, size] = useSize<T>()
  return [ref, size.width]
}

/**
 * A live page drawn at a desktop width and scaled down to fit its frame.
 *
 * The settings beside it need the room more than the preview does, so the
 * preview shrinks rather than the page reflowing: a 500px-wide frame shows the
 * page as a reader on a laptop sees it, only smaller — not its phone layout.
 */
export function ScaledPreview({ children, width = 1280 }: { children: ReactNode; width?: number }) {
  const [box, size] = useSize<HTMLDivElement>()
  const scale = size.width > 0 ? Math.min(1, size.width / width) : 1
  return (
    <div ref={box} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          // Unmeasured: fill the frame as it is rather than draw nothing.
          height: size.height > 0 ? size.height / scale : '100%',
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>
    </div>
  )
}
