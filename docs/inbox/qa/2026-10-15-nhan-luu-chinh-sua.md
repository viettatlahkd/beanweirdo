# Nhãn "Có sửa chưa đăng" → "Lưu chỉnh sửa", và tab "Lưu chỉnh sửa"

- Nhánh: `fix/nhan-luu-chinh-sua` (cắt từ `main` c95be68) · PR: chưa mở · Không migration.

## Đã sửa

- **[ĐỔI HÀNH VI]** Nội dung › danh sách bài: nhãn của bài đã đăng có chỉnh sửa chưa đăng đổi chữ từ "Có sửa chưa đăng"
  thành "Lưu chỉnh sửa" (`ContentWorkspace.tsx:PENDING_PILL`). Màu, điều kiện hiện nhãn giữ nguyên. Chủ site yêu cầu
  2026-10-15. Các ghi chú cũ nhắc chữ cũ (2026-09-24, 2026-10-14) giữ nguyên theo luật không sửa file đã nộp.

- **[ĐỔI HÀNH VI]** Hàng tab trạng thái thêm "Lưu chỉnh sửa" sau "Đã đăng": bài `published` có `has_draft`
  (`ContentWorkspace.tsx:PENDING`, `isPending`, `TABS`). Không phải trạng thái trong DB — là một token `status` id
  `pending` của ô tìm, nên bấm tab hiện chip "Trạng thái · Lưu chỉnh sửa", gõ "lưu chỉnh sửa" trong ô tìm cũng ra
  (`haystack`, gợi ý trong `suggestions`). Bài loại này vẫn được đếm trong "Đã đăng".

## Kiểm

Trình duyệt `/ad-post` (dữ liệu hosted, không ghi gì): 2 bài mang nhãn, cả hai hiện "Lưu chỉnh sửa", không còn chữ cũ.
Tab: Tất cả 33 · Nháp 3 · Đã đăng 29 · Lưu chỉnh sửa 2 · Lưu trữ 1 · Thùng rác 1; bấm tab → "2 bài" (Course Menu pt.1,
jurisprudence), chip ô tìm "Trạng thái Lưu chỉnh sửa".

## Cùng PR — thanh bên quản trị hẹp lại

- **[ĐỔI HÀNH VI]** Thanh bên quản trị 248px → 196px (`AdminShell.tsx:SIDE_W`); khu nội dung rộng thêm 52px. Đo trên trình
  duyệt: mục dài nhất ("Mở nhật ký Ghi 02 ↗") kết thúc ở 148px; mở cây beanweirdo, biz, bean, journal — mục con dài nhất
  "Trang chủ bean" ở 153px; không mục nào bị cắt hay xuống dòng. Chủ site, 2026-10-15: "giảm khoảng trống bên lề phải".
