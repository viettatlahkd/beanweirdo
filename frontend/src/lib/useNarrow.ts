import { useEffect, useState, type RefObject } from 'react'
import { layout } from '../design/tokens'

/**
 * Khối này có đang hẹp không — đo chính nó, không đo cửa sổ.
 *
 * `useIsMobile` hỏi cửa sổ, và đó là câu hỏi đúng cho cả trang. Nhưng một bài
 * mở ra trong lưới Ghi 01 chỉ chiếm ba phần tư bề ngang: trên màn 905 thì nó
 * còn 561, tức hẹp hơn ngưỡng 899 trong khi cửa sổ thì không. Hỏi cửa sổ ở đó
 * là hỏi sai chỗ — và cái giá thấy ngay: memo có một cột thông số rộng CỨNG
 * 300px, nên cột tiêu đề bên cạnh còn 93px và tiêu đề 78px xuống dòng từng chữ
 * cái một.
 *
 * Không có `ResizeObserver` (jsdom) thì trả về false: bố cục rộng là bố cục
 * mặc định, và bài kiểm nào cần hẹp thì tự dựng lấy.
 */
export function useNarrow(ref: RefObject<HTMLElement | null>, max = layout.mobileMax): boolean {
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(([entry]) => {
      setNarrow(entry.contentRect.width > 0 && entry.contentRect.width <= max)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, max])

  return narrow
}
