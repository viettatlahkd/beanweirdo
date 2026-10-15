# Tab Nội dung: một khung, menu ⋮ gọn, ngăn thông tin mở nhanh

PR: (số PR ghi ở mô tả PR) · nhánh `claude/project-thread-n3le4b`

Chủ site (2026-10-15) không thích việc trang bị chia thành hai khung riêng,
một khung ngắn và một khung dài.

## Thay đổi

1. **[ĐỔI HÀNH VI]** Trong `ContentWorkspace`, cột lọc bên trái (`rail`) và
   danh sách bài (`list`) không còn mỗi bên một khung viền và nền riêng, cách
   nhau 14px. Giờ cả hai nằm trong một khung (`.cw-ws`), ngăn cách bằng một
   đường kẻ dọc, nên hai cột luôn kết thúc ở cùng một độ cao. Phần trong của
   cột lọc dính trên đầu màn khi cuộn danh sách dài (`position: sticky`). Khung
   ngoài dùng `overflow: clip` vì `hidden` sẽ làm sticky không chạy.

2. **[ĐỔI HÀNH VI]** Menu ⋮ của bài: "Sửa thông tin" lên đầu và mở ngăn Thông
   tin bài. Bỏ "Chuyển module", vì ô "Màu mượn từ" trong ngăn đã làm việc đó.
   `MovePostDialog.tsx` và test của nó bị xoá. Menu còn: Sửa thông tin · Nhân
   bản · Ghim/Bỏ ghim · các mục trạng thái. Chữ "Sửa" hiện khi rê chuột ở cuối
   dòng thông tin (thêm ở PR trước) bị bỏ, kéo theo `IconPencil`.
3. **[SỬA LỖI]** Ngăn Thông tin bài mở chậm: nó chỉ gọi `GET /api/posts/:id`
   sau khi bấm. Giờ `prefetchPost` (`ListPostSettings.tsx`) đọc trước khi rê
   chuột hoặc focus vào dòng thông tin hay nút ⋮. Bản đọc trước được giữ 30
   giây (`FRESH_MS`) và bị bỏ ngay khi ngăn mở, để lần sau đọc lại bản mới.

## Bảng, cột, endpoint đã đụng

- `GET /api/posts/:id`: nay được gọi lúc rê chuột, không chỉ lúc bấm. Không
  ghi gì, không cần SQL.
