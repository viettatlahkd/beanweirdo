/**
 * Một tín hiệu: "danh sách module trên máy chủ vừa đổi".
 *
 * Khu quản trị ghi module qua API quản trị (`admin/lib/apiClient`), còn thanh
 * bên và Trang chủ đọc thẳng từ Supabase qua `data/useModules`. Hai đường
 * riêng, không đường nào biết đường kia vừa ghi gì — nên kéo đổi thứ tự trong
 * CMS xong, thanh bên ngay cạnh vẫn vẽ thứ tự cũ cho tới khi tải lại cả trang.
 *
 * Tệp này nhỏ và không phụ thuộc gì, cố ý: `admin/lib/lists.ts` phát tín hiệu
 * còn `data/useModules` nghe, mà bên quản trị thì không nên kéo theo cả
 * Supabase client chỉ để gọi một hàm.
 */
const watchers = new Set<() => void>()

/** Đăng ký nghe; gọi hàm trả về để thôi nghe. */
export function watchModules(fn: () => void): () => void {
  watchers.add(fn)
  return () => {
    watchers.delete(fn)
  }
}

/** Báo cho mọi nơi đang đọc danh sách module rằng nó vừa đổi. */
export function modulesChanged(): void {
  // Chép ra trước: một watcher có thể thôi nghe ngay trong lúc chạy (React gỡ
  // component), và sửa Set đang duyệt là bỏ sót người kế tiếp.
  for (const fn of [...watchers]) fn()
}
