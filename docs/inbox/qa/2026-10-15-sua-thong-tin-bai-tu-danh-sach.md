# Sửa thông tin bài ngay ở danh sách, và hộp "Bài mới" một khung

PR: (số PR ghi ở mô tả PR) · nhánh `claude/project-thread-n3le4b`

Chủ site (2026-10-15): bấm vào dòng thông tin của một bài thì mở một "wizard
chung" để sửa ngay ở danh sách; và hộp "+ Bài mới" đang có hai khung lồng nhau.

## Thay đổi

1. **[ĐỔI HÀNH VI]** Dòng thông tin dưới mỗi bài ở tab Nội dung (tác giả · chủ
   đề · ngày · phút đọc · template · #tag) nay là một nút: bấm vào mở ngăn
   "Thông tin bài" trượt từ phải, đúng ngăn của màn soạn (`PostSettings`), cho
   bài đó (`ListPostSettings`, mới). Trước: bấm từng chữ trong dòng thì thêm bộ
   lọc theo chữ đó. Sau: không lọc nữa; lọc vẫn có ở cột trái và thanh tìm.
   Rê chuột lên dòng hiện khung nhạt và chữ "Sửa".
2. **[ĐỔI HÀNH VI]** Menu ⋮ của bài: mục "Tác giả" (hộp thoại chỉ chọn tác giả)
   thành "Thông tin bài", mở cùng ngăn ở trên. `PostAuthorsDialog.tsx` bị xoá
   vì ngăn đã có ô Tác giả.
3. **[ĐỔI HÀNH VI]** Ngăn mở từ danh sách ghi qua `updatePost` y như màn soạn
   (`applyPatch`, `onSlug`, `onForget` trong `Editor.tsx`), nên bài đã đăng
   theo cùng luật bản nháp. Đóng ngăn (nút ×, Esc, bấm ra nền) thì danh sách
   tải lại.
4. **[SỬA LỖI]** Hộp "Bài mới": `MetadataStep` tự vẽ một khung viền bo góc
   bên trong hộp thoại vốn đã là khung, thành hai hộp lồng nhau. Bỏ khung của
   `MetadataStep`; nhãn ô đổi từ chữ in hoa xám nhỏ sang nhãn giống ngăn Thông
   tin bài.
5. **[ĐỔI HÀNH VI]** Hộp "Bài mới": thứ tự ô thành Tiêu đề · Mô tả · Chủ đề ·
   Template · Màu mượn từ · Màu bài (trước: Module đứng đầu, Tiêu đề gần cuối);
   con trỏ đặt sẵn ở ô Tiêu đề (`NewPostDialog`); ô "Module" đổi tên thành
   "Màu mượn từ" như ở ngăn Thông tin bài; nút "Soạn bài →" sang phải.

Thêm: `IconPencil` trong `design/icons.tsx`. Trang thử `cmsHarness.tsx` có
`?screen=new` mở hộp Bài mới, và trả hai template giả.

## Bảng, cột, endpoint đã đụng

- `GET /api/posts/:id` (đọc khi mở ngăn), `PATCH /api/posts/:id` (các ô của
  ngăn) — cùng các trường màn soạn vẫn ghi. Không đổi backend, không cần SQL.
