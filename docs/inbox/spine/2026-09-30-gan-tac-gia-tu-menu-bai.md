# Gán tác giả từ menu ba chấm của từng bài

PR: #58    nhánh: claude/project-thread-tkjhw7
Nguồn: chủ site, 2026-09-30: "có logic add tác giả vào những bài cũ chưa có tác giả không?", rồi "trong cái dấu ba chấm ở cuối mỗi bài ấy cho gán tác giả vào đi chứ cần gì làm trong trang tác giả, trang tác giả chỉ là để xem pro5 thôi".

## Đã làm

- [ĐỔI HÀNH VI] Menu ba chấm của mỗi thẻ bài ở tab Bài viết có thêm "Gán tác giả…" (`PostCard.tsx`, `PostsPanel.tsx`). Nó mở hộp thoại `PostAuthorsDialog.tsx`, trong đó là đúng ô chọn `AuthorPicker` của màn sửa bài. Mỗi lần đổi là ghi ngay qua `PUT /api/posts/:id/authors`, nút Xong chỉ đóng hộp thoại. Trước: chỉ chọn được trong màn sửa bài.
- Không có lệnh gán hàng loạt. Tôi đã làm một bản ở tab Tác giả rồi bỏ trước khi mở PR, theo câu thứ hai của chủ site.

## Đã đụng

- Không bảng, cột hay endpoint mới. Hộp thoại đọc `GET /api/posts/:id` để lấy `authors` hiện tại.

## Kiểm

- `npm test` xanh. Không thêm test.
