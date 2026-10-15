# Thanh bên quản trị: nền trắng, Inter 13, gạch ngang — nhánh `claude/config-one-tree-539wvd`

PR: số PR ghi ở mô tả PR. Không đụng bảng, cột hay endpoint nào.

## [ĐỔI HÀNH VI] Màu và chữ của thanh bên quản trị

Chủ site chọn trên mock (2026-10-15): "trắng, chỉ thụt lề, bullet thành gạch ngang, size chữ nhỏ, font Inter".

- Trước: thanh bên nền tối "Than chì" (#23262B), chữ Be Vietnam Pro 13.5, site đóng/mở vẽ ▸ ▾, dòng đang chọn có vạch xanh bên trái.
- Sau (`frontend/src/admin/AdminShell.tsx`: hằng `SHELL`, `Item`):
  - nền trắng, viền phải mảnh, chữ Inter 13, dòng cao tối thiểu 28;
  - mỗi dòng mở đầu bằng gạch ngang "–": xám bình thường, xanh rêu khi là site đang mở hoặc mục đang chọn; dòng đang chọn tô nền xanh nhạt;
  - cây chỉ thụt lề (16px mỗi tầng), không có đường nối;
  - "Mở nhật ký Ghi 02" và "Đăng xuất" không có gạch (`Item bare`).
- Dòng "Quản trị › …" phía trên vùng làm việc cũng dùng Inter.
- `frontend/index.html` và `frontend/cms-harness.html` tải thêm font Inter (400/500/600) từ Google Fonts.
- Chữ trong vùng làm việc bên phải vẫn là Be Vietnam Pro.

## Đề xuất

- Không có.
