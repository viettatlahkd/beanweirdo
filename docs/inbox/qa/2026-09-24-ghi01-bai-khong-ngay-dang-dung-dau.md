# Bài không có ngày đăng đứng đầu module như bài ghim

Nhánh `claude/project-thread-12dfli`, PR mở sau PR #45.

## [SỬA LỖI] Xếp ngày đăng rỗng xuống cuối

- Dữ liệu thật, chủ site chạy truy vấn 2026-09-24: ở Ghi 01, "taste modality: sơn la" có
  `pinned = false`, `sort_order = null`, `published_at = null`. Hai bài còn lại có ngày đăng.
- `data/usePublishedPosts.ts` xếp `.order('published_at', { ascending: false })`. Postgres
  mặc định đưa NULL lên ĐẦU khi xếp giảm, nên bài không có ngày đăng đứng đầu trang,
  trông như bị ghim dù không ghim.
- Sửa: `nullsFirst: false` cho `published_at`, và cho nhánh `orderBy` tuỳ chọn.
  `lib/postOrder.ts:newestFirst` vốn đã xếp ngày rỗng xuống cuối (sau khi thử
  `created_at`), nên nay site và CMS khớp nhau.
- Test: `usePublishedPosts.test.ts` cập nhật hai kỳ vọng.

Ảnh hưởng: mọi màn gọi `usePublishedPosts` mà không truyền `orderBy`, không chỉ Ghi 01.

Bảng/cột: `posts.published_at` (chỉ đọc). Không đổi endpoint.

## Dữ liệu

Bài taste modality vẫn không có ngày đăng. Sau bản sửa nó xuống cuối Ghi 01. Muốn nó
đứng đúng chỗ theo ngày thì cần điền `published_at` (chủ site chạy tay, xem thread).
