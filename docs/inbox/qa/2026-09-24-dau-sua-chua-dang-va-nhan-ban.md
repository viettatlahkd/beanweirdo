# Dấu "Có sửa chưa đăng" trên thẻ bài, nhân bản lấy bản nháp

PR: #41 · nhánh `claude/project-thread-1onmw2`

Nối tiếp PR #40 (bảng `post_drafts`, ghi chú `2026-09-24-sua-bai-da-dang-chi-luu-nhap.md`).

## Đã đổi

1. **[ĐỔI HÀNH VI] Danh sách bài báo bài nào có sửa chưa đăng.**
   `backend/api/posts/index.ts` → `handleList`: đọc thêm `post_drafts.post_id`,
   mỗi bài trong `posts` của câu trả lời có `has_draft`. Bảng chưa có (0028 chưa
   chạy) thì mọi bài `has_draft: false`, không lỗi.
   `frontend/src/admin/components/StatusBadge.tsx` → `StatusBadge` nhận
   `pending`; bài `published` có `pending` thì nhãn là "Có sửa chưa đăng" (nền
   `garden.honeyTint`, chữ `garden.cinnamon`), di chuột hiện lời nhắc bấm
   "Đăng thay đổi". `PostCard` truyền `post.has_draft`.
   `frontend/src/screens/Cms.tsx` → `patchPost`: API trả `has_draft` thì đánh
   dấu bài ấy ngay trong danh sách, không đợi tải lại.
   Trước: bài đã đăng mà có sửa chưa đăng vẫn hiện "Đã đăng".
   Sau: hiện "Có sửa chưa đăng" cho tới khi bấm Đăng thay đổi.

2. **[ĐỔI HÀNH VI] Nhân bản bài đã đăng lấy bản nháp.**
   `backend/api/posts/index.ts` → `handleCreate`, nhánh `fromPostId`: gọi
   `readDraft` (`backend/lib/drafts.ts`), đè `body`, `lead`, `pull_quote`,
   `further_reading` của bản nháp lên bản đang đăng trước khi chép.
   `withoutImages` vẫn áp như PR #33. Tên bài của bản sao vẫn là tên gõ trong
   hộp nhân bản.
   Trước: bản sao lấy chữ đang trên trang.
   Sau: bản sao lấy chữ sửa gần nhất.

## Bảng, cột, endpoint đã đụng

- `GET /api/posts`: đọc thêm `post_drafts.post_id`; thêm khoá `has_draft`.
- `POST /api/posts` (`fromPostId`): đọc thêm `post_drafts.data`.
- Không migration.
