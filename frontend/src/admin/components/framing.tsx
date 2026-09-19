/**
 * Một khung cắt ảnh dùng chung cho mọi chỗ đăng ảnh trong màn sửa.
 *
 * Trước đây chỉ ảnh bìa mở khung căn ảnh: `setHero` tải tệp lên rồi bật
 * `FocusPicker`. Những chỗ đăng ảnh còn lại — nút ở góc mỗi ô ảnh cố định, ô
 * ảnh phụ của bitesize, khối ảnh trong thân bài — tải xong là đặt thẳng, nên
 * cùng một thao tác cho ra hai trải nghiệm khác nhau tuỳ đang đứng ở ô nào.
 * Chủ site: *"tất cả các chỗ đăng ảnh thống nhất là đều hiện cái toast"*.
 *
 * Chỗ đăng ảnh không tự dựng hộp thoại: nó `await frame(...)` và nhận lại địa
 * chỉ ảnh đã kèm điểm căn. Một hộp thoại cho cả màn, nên không bao giờ có hai
 * cái chồng nhau, và thêm một chỗ đăng ảnh mới thì không phải bê theo state
 * nào cả.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { FocusPicker } from './FocusPicker'
import { looksLikeVideo } from '../../lib/mediaShape'

export type FrameRequest = {
  url: string
  /** Dòng chữ nhỏ trên đầu hộp thoại: ô nào của bài đang được căn. */
  name: string
  /** Chiều ngang ÷ chiều dọc của ô ảnh. */
  ratio: number
  /** Những khung khác cùng tấm ảnh này sẽ rơi vào. */
  previews?: { label: string; ratio: number }[]
}

/**
 * Trả về địa chỉ ảnh đã đặt điểm căn, hoặc đúng địa chỉ đưa vào nếu người dùng
 * bấm Huỷ — huỷ là huỷ việc căn, không phải huỷ tấm ảnh vừa tải lên.
 */
export type FrameFn = (req: FrameRequest) => Promise<string>

/*
 * Không có provider thì trả nguyên địa chỉ. Đây là đường dành cho bài kiểm và
 * cho những màn chưa bọc provider — hộp thoại vắng mặt chứ ảnh không mất.
 */
const FramingContext = createContext<FrameFn>(async (req) => req.url)

export function useFraming(): FrameFn {
  return useContext(FramingContext)
}

type Pending = FrameRequest & { settle: (url: string) => void }

export function FramingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  /*
   * Giữ lời hứa đang treo ở ref chứ không đọc từ `pending` trong callback:
   * `onSave` và `onCancel` đóng gói theo lần render tạo ra chúng, mà hộp thoại
   * sống qua nhiều lần render.
   */
  const live = useRef<Pending | null>(null)

  const frame = useCallback<FrameFn>((req) => {
    /*
     * Khung căn ảnh vẽ tệp ra bằng `background-image`, mà clip thì không vẽ
     * kiểu ấy được: mở nó cho một clip là bày ra một ô đen trơn. Và căn tâm
     * ảnh cũng chẳng có nghĩa gì với một hình đang chạy.
     */
    if (looksLikeVideo(req.url)) return Promise.resolve(req.url)
    return new Promise<string>((resolve) => {
      const next: Pending = { ...req, settle: resolve }
      live.current = next
      setPending(next)
    })
  }, [])

  const close = useCallback((url: string) => {
    live.current?.settle(url)
    live.current = null
    setPending(null)
  }, [])

  return (
    <FramingContext.Provider value={frame}>
      {children}
      {pending && (
        <FocusPicker
          url={pending.url}
          name={pending.name}
          ratio={pending.ratio}
          previews={pending.previews}
          onCancel={() => close(pending.url)}
          onSave={(url) => close(url)}
        />
      )}
    </FramingContext.Provider>
  )
}
