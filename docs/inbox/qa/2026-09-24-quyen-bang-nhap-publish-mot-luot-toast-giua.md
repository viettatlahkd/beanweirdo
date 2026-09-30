# Bảng nháp thiếu quyền; lưu nháp và Publish mỗi việc một lượt; toast ở giữa trang

PR: #43 · nhánh `claude/project-thread-1onmw2`

Nối tiếp PR #40, #41.

## Đã đổi

1. **[SỬA LỖI] Sửa bài đã đăng vẫn lên trang ngay.**
   Nguyên nhân: `0028_post_drafts.sql` tạo bảng mà không `grant` cho
   `service_role` (dự án không có default privileges, xem `0006`). Mọi lần API
   đụng `post_drafts` nhận `42501 permission denied for table post_drafts`;
   `isMissingDraftTable` cũ khớp chữ `post_drafts` trong message, coi đó là
   "chưa có bảng" và `handlePatch` lùi về ghi thẳng `posts`.
   Sửa: `0029_post_drafts_grant_and_rpc.sql` cấp quyền. Chủ site đã chạy
   2026-09-24 ~05:02 UTC (câu kiểm trả `grant 7`, hai hàm `ok`).
   `backend/lib/drafts.ts`: bỏ `isMissingDraftTable`, thay bằng
   `isDraftTableUnreadable` (mã 42P01, PGRST205, 42501), chỉ dùng ở đường
   **đọc** (`readDraft`, `handleList`). Đường ghi không bao giờ lùi về ghi
   thẳng một bài đã đăng nữa: `stageDraft` lỗi thì PATCH trả 500.

2. **[ĐỔI HÀNH VI] Lưu nháp và Publish mỗi việc một lượt gọi database.**
   `0029` thêm hai hàm `stage_post_draft(p_id, p_content, p_now)` và
   `fold_post_draft(p_id, p_now)`, chỉ `service_role` gọi được.
   `backend/api/posts/[id]/index.ts` → `handlePatch` gọi `stageDraft`
   (1 RPC thay cho đọc status + đọc nháp + upsert). `thumbnail_url` đi cùng
   `body` vào bản nháp.
   `backend/api/posts/[id]/status.ts`: publish/unpublish gọi `foldDraft`
   (1 RPC thay cho đọc nháp + update + delete + đọc status). Publish bài đã
   đăng dừng ở đó; bài nháp thêm một câu update trạng thái như cũ.
   Trước: Publish bài đã đăng tốn 4 lượt đi về Mỹ–Tokyo nối nhau, mỗi lượt
   autosave tốn 3. Sau: 1 và 1. Chưa đo bằng giờ thật, chỉ đếm câu lệnh.
   Nếu hàm chưa có (0029 chưa chạy): PATCH bài nháp vẫn ghi thẳng, PATCH bài
   đã đăng trả 500; Publish coi như không có nháp.

3. **[ĐỔI HÀNH VI] Toast là một thẻ ở giữa màn hình.**
   `frontend/src/design/Toaster.tsx` → `ToastProvider`: một thẻ giữa màn,
   biểu tượng trong vòng tròn tô màu, hiện mỗi lần một thẻ. `ok` tự tắt sau
   2,2 giây, `info` 3,6 giây; lỗi có nền mờ, tiêu đề "Chưa làm được", nút
   Đóng, Esc hoặc bấm ra nền (pointerdown) để tắt. Thêm `toast.busy(text)`
   trả `{ ok, fail }` — thẻ quay vòng rồi đổi thành kết quả tại chỗ.
   Thêm `IconInfo` trong `frontend/src/design/icons.tsx`.
   Trước: thẻ nhỏ góc phải dưới, tự tắt sau 4 giây.

4. **[ĐỔI HÀNH VI] Nút Publish báo đang chạy.**
   `frontend/src/admin/screens/Editor.tsx` → nút Publish: bấm là hiện ngay thẻ
   "Đang đăng…", nút khoá và đổi chữ thành "Đang đăng…" tới khi xong.

## Bảng, cột, endpoint đã đụng

- Bảng `post_drafts`: thêm quyền; hai hàm mới trong schema `public`.
- `PATCH /api/posts/:id`, `POST /api/posts/:id/status`: đổi cách gọi database,
  thân câu trả lời không đổi.
- `GET /api/posts`, `GET /api/posts/:id`: đọc `post_drafts` như trước.
