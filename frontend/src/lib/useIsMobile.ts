import { useEffect, useState } from 'react'
import { layout } from '../design/tokens'

const QUERY = `(max-width: ${layout.mobileMax}px)`

/**
 * Ngưỡng mobile của cả site.
 *
 * Không dùng được media query trong CSS cho việc này: mọi màn công khai vẽ bằng
 * `div` với style inline, mà `@media` ở `global.css` không với tới style inline.
 * Nên tầng responsive phải chạy bằng JS.
 *
 * jsdom không có `window.matchMedia`, nên khi thiếu thì trả `false` — test hiện
 * có giữ nguyên nhánh desktop và không phải sửa dòng nào. `lib/Rise.tsx` đã thủ
 * đúng kiểu ấy với `prefers-reduced-motion` từ trước, nên đây không phải một quy
 * ước mới. Đừng shim vào `vitest.setup.ts`: file đó dùng chung ba lane.
 */
export function useIsMobile(): boolean {
  const [on, setOn] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(QUERY).matches
      : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setOn(e.matches)
    mq.addEventListener('change', onChange)
    // Bề ngang có thể đã đổi giữa lúc dựng và lúc gắn — đọc lại một lần.
    setOn(mq.matches)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return on
}
