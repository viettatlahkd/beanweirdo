import { useEffect, useState } from 'react'
import { layout } from '../design/tokens'

const QUERY = `(max-width: ${layout.mobileMax}px)`

/**
 * Ngưỡng mobile của cả site.
 *
 * Vì sao bằng JS chứ không phải media query: phần lớn màn công khai vẽ bằng
 * `div` với style inline, mà `@media` ở `global.css` không với tới style inline.
 * Và những thứ nặng nhất — rail đổi thành thanh dưới, lề, cỡ chữ — thì CSS
 * không làm được dù có với tới.
 *
 * Không phải "mọi màn": `global.css` đã có `.bw-intro`/`.bw-modhead` cho Trang
 * chủ, và `components/StatsPanel.tsx` có hai ngưỡng của riêng nó (560, 860).
 * Nên trong repo hiện có nhiều hơn một ngưỡng cho cùng một câu hỏi, và ở khoảng
 * giữa chúng thì lưới đã xếp chồng theo CSS trong khi lề và cỡ chữ vẫn là
 * desktop theo JS. Lane design đang kéo ngưỡng của `global.css` về khớp
 * `mobileMax`; hai con số của StatsPanel là chuyện riêng của bảng ấy, chưa
 * đụng tới.
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
