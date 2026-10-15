# Lấy layout, Quản lý trang và Cài đặt hiển thị của bên gốc

- Nhánh: `claude/sync-upstream-main-kuy90r` (cắt lại từ `main` 940bed2). Số PR: xem PR mở từ nhánh này, ngay sau #60.
- Không có migration mới: 0027, 0028, 0029 đã chạy trên database dùng chung (bên gốc chạy). Không ghi dữ liệu thật.
- Cây file sau PR này bằng đúng commit e99513c, tức bản gộp đầu tiên của PR #60 (lấy bên gốc làm nền và giữ các phần của fork). Khác duy nhất: ghi chú bàn giao.

Chủ site ngày 2026-10-04, sau khi thấy trang chủ khác bản của hkd: "lấy cả A và B nhé nhưng phải merge vào với logic bên mình cái nào mà khác mới hẳn thì append vào luôn", rồi "lấy cả layout các thứ nữa".

## [ĐỔI HÀNH VI] Trang công khai lấy bài theo quy chế

- Danh sách trang dựng bằng `data/useModules.tsx:buildPages`, đọc các bảng `topics`, `keywords`, `pages`, `page_overrides`, `listing_rules` và `post_keywords`.
- Mỗi trang lấy bài qua `lib/listingRule.ts:resolveRule`.
- Trang chủ, Mục lục, trang module, Ghi và thanh bên đọc bài qua `postsOf` / `usePagePosts`. Trước PR này chúng lọc theo `posts.module_id`.
- Khi bảng `pages` rỗng, `buildPages` vẫn trả module như cũ.
- Phần giữ của fork: thứ tự `lib/moduleOrder.ts:bySiteOrder`, việc `modulesChanged`/`watchModules` báo làm mới, và bố cục 8 ô của Ghi 01 (`screens/Notes.tsx`).

## [ĐỔI HÀNH VI] CMS bốn tab

`screens/Cms.tsx` có bốn tab:

- **Nội dung** (`ContentWorkspace`). Thay `PostsPanel`, nhưng vẫn giữ ba thứ của fork:
  - hộp chuyển module (`MovePostDialog`);
  - hộp gán tác giả (`PostAuthorsDialog`);
  - nhãn có bản nháp (`StatusBadge pending={has_draft}`).
- **Quản lý trang** (`PagesManager`), kèm phần port.
- **Cài đặt hiển thị** (`DisplaySettings`): màu và font của blog lưu ở `site_settings.design` và áp bằng biến CSS (`design/blogDesign.ts`), design của port, và tab Đường dẫn.
- **Tác giả** (`AuthorsPanel` của fork).

Tab Cấu hình của fork bị bỏ, cùng cây module kéo thả (`lib/moduleMove.ts`, `moduleEntries.ts`) và các test `Cms.module*`. Lý do: khi đã có `pages`, `modules` không còn quyết định trang công khai. Cây chủ đề trong tab Nội dung kéo thả được, cả đổi thứ tự lẫn đổi cha, nhưng chỉ hai tầng.

Màn Portfolio riêng (`admin/screens/Portfolio.tsx`) của PR #60 bị bỏ. Phần sửa port nay nằm trong Quản lý trang và Cài đặt hiển thị (`admin/components/PortEditors.tsx`), như bên gốc.

## [ĐỔI HÀNH VI] Bỏ dạng bài, tag theme thay thế

- `posts.kind` không còn hiện ra. Template là thứ cho biết bài là gì (`lib/templateNames.ts`).
- Chip lọc ở Ghi theo `keywords` (`lib/notesFilter.ts`).
- `backend/lib/tags.ts` bị xoá. `slug` chuyển sang `backend/lib/vocab.ts`.

## Backend

- `/api/tags?vocab=topics|keywords` dùng `lib/vocab.ts`.
- `?vocab=layout|rules|pages|overrides` dùng `lib/layout.ts`.
- `?vocab=authors` dùng `lib/authorsApi.ts`.
- `api/posts/[id]/index.ts`: giữ bản nháp của fork (`lib/drafts.ts`), thêm slug, keywords và `forget_slugs` của bên gốc.
- `api/posts/[id]/status.ts`: khi đăng, ghi slug nếu bài chưa có.
- `api/posts/index.ts`: danh sách bài kèm `keywords`; tạo bài nhận `topic_id`.
- Vẫn đủ 12 function.

## Kiểm

`npm test` (lint, knip, typecheck, vitest): 144 file và 1534 test, tất cả đều xanh. Chưa xem được trên trình duyệt; chủ site kiểm trên Vercel.

## Đề xuất

Cây chủ đề của bên gốc chỉ có hai tầng và chưa có kiểu thả vào giữa hay thả cạnh như cây module cũ của fork. Nếu chủ site cần, có thể đưa kiểu kéo thả ấy sang cây chủ đề.
