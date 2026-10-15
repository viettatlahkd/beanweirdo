# PR #38 · nhánh `claude/project-thread-2j8wz9` — Ctrl+Z sau khi chèn khối nhân đôi đoạn

## [SỬA LỖI] Chèn khối giữa dải chữ rồi Ctrl+Z trong ô chữ
- Tái hiện: `harness.html?t=article`, đặt con trỏ trong một phần giữa dải, bấm `+` ở máng, chọn Ảnh, bấm vào dải chữ cũ, Ctrl+Z, bấm ra ngoài. Trước sửa: `4 | 5 | [ảnh] | 6 | 7` thành `4 | 5 | 6 | 7 | [ảnh] | 6 | 7`.
- Nguyên nhân: `insertSectionThing` (`admin/lib/articleFlow.ts`) cắt dải; `SyncOutside` (`admin/components/LiveText.tsx`) viết lại mặt soạn thành nửa trước, nhưng `HistoryPlugin` vẫn giữ cả dải cũ. Ctrl+Z dựng lại cả dải; `CommitOnBlur` ghi nó bằng `writeSectionRun` vào khoảng chỉ còn nửa trước.
- Sửa: `SyncOutside` phát `CLEAR_HISTORY_COMMAND` sau mỗi lần viết lại từ bên ngoài. Áp cho mọi khuôn dùng `LiveText`.
- Dữ liệu: bài AI Twin thứ nhất vẫn mang bản lặp; bản sửa không dọn dữ liệu cũ.

## Còn thấy, chưa sửa
- Sau khi chèn, con trỏ ở lại mặt soạn cũ và nhảy về đầu dải: gõ tiếp là chữ rơi vào đầu tiêu đề đầu tiên (thử trên harness).

## Bảng, cột, endpoint
- Không đụng. Chỉ `posts.body` qua đường ghi sẵn có.
