# Ngăn "Thông tin bài": nút Lưu, nút Đăng và dòng trạng thái

PR: (số PR ghi ở mô tả PR) · nhánh `claude/project-thread-y8z0tm`

Chủ site (2026-10-15): sửa trong ngăn xong không biết đã lưu chưa, phải F5;
muốn nút Lưu / Đăng ở cuối ngăn, cả ở danh sách lẫn màn soạn.

## Thay đổi

1. **[ĐỔI HÀNH VI]** Cuối ngăn (`PostSettings`) có một chân dính đáy: dòng
   trạng thái ("Có thay đổi, bấm Lưu." / "Đang lưu…" / "Đã lưu lúc hh:mm" /
   "Chưa lưu được: …") cùng nút **Lưu**, và nút **Publish** (bài nháp) hoặc
   **Đăng thay đổi** (bài đã đăng có nháp). Trước: không có nút, không có tin.
2. Các ô vẫn ghi khi rời ô như trước; "Lưu" rời ô đang gõ, đợi mọi lượt ghi
   (của ngăn: `slugWrites`; của màn cha: `inFlight` trong `Editor.tsx`,
   `writes` trong `ListPostSettings.tsx`) rồi mới báo. Lượt ghi hỏng thì báo lỗi
   thay vì "Đã lưu".
3. Màn soạn: logic nút Publish trên thanh đầu tách thành hàm `publish` dùng
   chung với chân ngăn. Ở danh sách, đăng xong thì đóng ngăn (danh sách tải lại).

## Bảng, cột, endpoint

Không đổi: vẫn `PATCH /api/posts/:id` và `POST /api/posts/:id/status`.

## Kiểm

Harness `cms-harness.html?screen=edit`: gõ tên mới, bấm Lưu → "Đã lưu lúc …,
chưa lên trang." và tiêu đề trên trang đổi theo.
