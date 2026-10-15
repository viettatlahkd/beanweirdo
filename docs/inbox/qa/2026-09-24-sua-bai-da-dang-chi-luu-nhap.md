# Sửa bài đã đăng chỉ lưu nháp, bấm Publish mới lên trang

PR: #40 · nhánh `claude/project-thread-1onmw2`

## Đã đổi

1. **[ĐỔI HÀNH VI] Bài đã đăng giữ một bản nháp riêng.**
   Trước: màn sửa ghi thẳng vào `posts` khi rời ô, nên sửa bài đã đăng là lên
   trang ngay. Sau: với bài `status = 'published'`, các cột nội dung
   (`backend/lib/drafts.ts` → `DRAFT_FIELDS`: en, vi, body, theme_color,
   hero_image_url, hero_caption, plate_images, lead, pull_quote,
   further_reading, date_label) đi vào bảng mới `post_drafts`
   (`backend/api/posts/[id]/index.ts` → `handlePatch`, qua `writeDraft`).
   Cột xếp đặt (`module_id`, `sort_order`, `pinned`) vẫn áp ngay.
   Bài chưa đăng ghi thẳng như cũ.
   Chủ site, 2026-09-24: "nếu không bấm publish thì coi như chỉ là auto lưu nháp".

2. **[ĐỔI HÀNH VI] Publish trên bài đã đăng là "đăng các thay đổi".**
   `backend/api/posts/[id]/status.ts`: `publish` và `unpublish` gọi `foldDraft`
   trước — chép `post_drafts.data` vào `posts`, tính lại `thumbnail_url` nếu có
   `body`, xoá hàng nháp. Publish trên bài đã đăng trả 200 kèm `applied`, và
   **không** đổi `published_at`.

3. **[ĐỔI HÀNH VI] Màn sửa và bản xem trước thấy bản nháp.**
   `GET /api/posts/:id` (`handleGet`) đè bản nháp lên hàng `posts` và thêm
   `has_draft`. Trang công khai đọc `posts` bằng khoá anon nên không thấy.

4. **[ĐỔI HÀNH VI] Nút ở chân màn sửa.** `Editor.tsx` → `EditorContent`:
   nhãn "Publish" / "Đăng thay đổi" / "Đã đăng"; đợi mọi lượt lưu đang chạy
   (`save`, `inFlight`) rồi mới đăng; luôn hiện toast. Dòng trạng thái nói rõ
   bài đã đăng thì sửa chỉ lưu nháp.

5. **[ĐỔI HÀNH VI] Sửa nhanh ở danh sách CMS** (`Cms.tsx` → `patchPost`): bài
   đã đăng thì hiện toast nhắc mở bài và bấm "Đăng thay đổi".

## Cần chủ site chạy

`backend/supabase/migrations/0028_post_drafts.sql` trong SQL Editor. Chưa
chạy thì API tự lùi về cách cũ (`isMissingDraftTable`), không vỡ.

## Chưa làm

- Thẻ bài trong danh sách chưa có dấu "có thay đổi chưa đăng".
- Nhân bản bài (`fromPostId`) chép bản đang đăng, không chép bản nháp.

## Bảng, cột, endpoint đã đụng

- Bảng mới `post_drafts (post_id uuid, data jsonb, updated_at)`, RLS bật, không policy.
- `GET` và `PATCH /api/posts/:id`; `POST /api/posts/:id/status` (publish, unpublish).
- `posts`: đọc thêm `status` ở PATCH; ghi các cột nội dung và `thumbnail_url` lúc Publish.
