# Cấu hình: tên theo ngôn ngữ CMS; port #1/#2; practice thành site riêng

- Nhánh: `feature/cau-hinh-ten` (cắt từ `main` 8539265) · PR: chưa mở · Không migration.
- Chủ site, 2026-10-15: đổi "Khung chung" sang tên chuẩn CMS và rà các tiêu đề; "Hình trang" → "Dàn trang"; biz → "port #1: biz",
  bean → "port #2: bean", có cơ chế cho port tiếp theo; Ghi 02 kéo ra khỏi beanweirdo, dưới journal, tên "practice".

## Đã sửa

- **[ĐỔI HÀNH VI]** Tên trong Cấu hình (`ConfigTree.tsx`, `PageSettings.tsx`):
  | Trước | Sau | Ở đâu |
  |---|---|---|
  | Khung chung | Đầu & chân trang | thẻ beanweirdo, tiêu đề chi tiết |
  | Thanh trên | Đầu trang | phần trong Đầu & chân trang |
  | Mục lục (beanweirdo) | Menu chính | thẻ, tiêu đề, breadcrumb; phần "Thanh trên" trong đó → "Các mục" |
  | Mục lục (biz, bean) | Danh mục con | thẻ, tiêu đề, breadcrumb (chủ site chọn tên) |
  | Mục lục (journal) | giữ | tên của trang công khai `/journal` |
  | Hình trang | Dàn trang | thẻ journal, tiêu đề, breadcrumb |
  | Chữ cố định | Nội dung tĩnh | mọi phần cùng tên |
  | Quy chế | Quy tắc liệt kê | `PageSettings.tsx` |
  Ba chuỗi "thanh trên" trong nút/ghi chú → "menu chính".
- **[ĐỔI HÀNH VI]** Thanh bên: biz → "port #1: biz", bean → "port #2: bean" (`AdminShell.tsx:PORT_SITES`, `CONFIG_SITE_LABELS`
  tính từ thứ tự trong `PORT_SITES`). Tên này cũng hiện ở breadcrumb.
- **[ĐỔI HÀNH VI]** practice là site thứ năm của Cấu hình, dưới journal (`CONFIG_SITES`). practice chính là Ghi 02 (chủ site):
  không có thẻ con, bấm là mở thẳng cấu hình Ghi 02 cũ (tên trên thanh bên, màu; xem trước `/practice`), tiêu đề "practice".
  Thẻ Ghi 02 rời khỏi beanweirdo. Dòng cuối thanh bên "Mở nhật ký Ghi 02 ↗" → "Mở practice ↗".

## Giới hạn

"Cơ chế cho port tiếp theo" mới ở mức tên: thêm một id vào `PORT_SITES` là nó thành "port #3: …". **Tạo một site port mới thì
chưa có**: `nodes.home_of` bị ràng buộc `in ('biz','bean')` (migration 0035), và địa chỉ công khai, cây Cấu hình của biz/bean
viết riêng từng site. Muốn tạo site port bất kỳ từ CMS cần: migration bỏ ràng buộc, địa chỉ công khai theo `home_of`, cây Cấu hình
dựng từ danh sách site port lấy từ dữ liệu.

## Kiểm

Trình duyệt (dữ liệu hosted, chặn mọi lệnh ghi, không lệnh nào phát ra): thanh bên "beanweirdo · port #1: biz · port #2: bean ·
journal · practice"; thẻ: beanweirdo = Trang chủ · Menu chính · Đầu & chân trang; biz/bean = Trang chủ … · Danh mục con; journal =
Trang chủ · Mục lục · Dàn trang; practice không có thẻ con, mở thẳng cấu hình (breadcrumb "… › practice", xem trước `/practice`).
