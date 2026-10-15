# Một bảng `nodes` cho trang của mọi site (blog + port)

Nhánh `claude/project-thread-oa1vgt` · PR mở ngày 2026-10-13 (số PR ghi ở tiêu đề PR). Đây là bước 2; bước 1 là PR #71 (`2026-10-13-khuon-chi-tiet-chung.md`).

Chủ site yêu cầu (2026-10-13): blog và port lưu chung một bảng có cột phân loại, code cũng một đường, "để sau còn scale". Trạng thái chung do chủ site chọn trên thẻ quyết định: đã đăng / nháp / lưu trữ.

## Database: `backend/supabase/migrations/0032_nodes.sql` — **chưa chạy**, chủ site dán vào SQL Editor
- Đổi tên `topics` thành `nodes`. Khoá ngoại `posts.topic_id`, trigger `topics_drop_override` (0028), index giữ nguyên theo bảng.
- Cột mới: `site` ('blog' | 'port'), `slug` (duy nhất trong một site; blog cũ lấy bằng `id`), `blocks` jsonb, `look` (Giao diện, trước là `portfolio_pages.palette`), `status` ('draft' | 'published' | 'archived').
- Bỏ cột `visibility`. Chủ đề `public` → `published`, `private` → `draft`.
- Chép mọi dòng `portfolio_pages` vào `nodes` với `site = 'port'`, giữ nguyên `id` (uuid dạng chữ), nên `page:<id>` trong `site_settings.data.portfolio.header.links` và `home.features` vẫn trỏ đúng. `portfolio_pages` giữ nguyên, không còn code nào ghi.
- Trigger `topics_no_cycle` → `nodes_no_cycle`: thêm luật mục cha phải cùng site.
- `topic_is_public` viết lại trên `nodes.status` (giữ tên vì chính sách đọc `posts` gọi nó). Chính sách đọc `nodes` = `topic_is_public(id)`.
- View `topics` (chỉ đọc, `security_invoker`) có đúng các cột cũ, `visibility` tính từ `status`, để bản code cũ còn chạy trong lúc chờ deploy. Ghi qua view sẽ lỗi.
- Đã chạy thử trên Postgres 16 dựng từ migration 0001–0031: dữ liệu chép đúng, chặn được mục cha khác site và vòng, `anon` chỉ thấy mục đã đăng.

## [ĐỔI HÀNH VI] Trạng thái chủ đề blog có ba giá trị
- Trước: công khai / riêng tư. Sau: đã đăng / nháp / lưu trữ, giống trang port (`STATUS_CHOICES` chuyển từ `PortEditors.tsx` sang `NodeFields.tsx`).
- Người xem thấy y như cũ: chỉ mục đã đăng mới công khai. Mục "lưu trữ" là mới với blog.
- Trang chọn tay (`pages`, 0028) vẫn là công khai / riêng tư (`VISIBILITY`); bảng `pages` không đổi trong PR này.

## [ĐỔI HÀNH VI] Một API cho mọi node
- `GET|POST|PUT|PATCH|DELETE /api/tags?vocab=nodes` (`backend/lib/vocab.ts` `handleNodes`, `nodeColumns`) thay cho `?vocab=topics` và cho phần trang của `/api/portfolio`. `GET` nhận `&site=`.
- `/api/portfolio` chỉ còn design token (`GET`, `PATCH ?part=design`).
- `POST`: `id` = slug nếu chưa site nào dùng, không thì `<site>-<slug>`. Tên dành riêng của gốc (`RESERVED_SLUGS`, trước ở `portfolio.ts` `pageColumns`) chỉ chặn với port.
- Kiểu chung: `packages/api-contract/src/nodes.ts` (`Node`, `NodeStatus`, `Site`). Frontend: `listNodes`, `createNode`, `updateNode`, `reorderNodes`, `deleteNode`, `getPortDesign` trong `apiClient.ts`. Bỏ `Topic`, `listTopics`, `createTopic`, `updateTopic`, `reorderTopics`, `deleteTopic`, `PortPageRecord`, `getPortfolio`, `createPortPage`, `updatePortPage`, `deletePortPage`.
- Trang port mới tạo vẫn là nháp (gửi `status: 'draft'`; mặc định của cột là `published` cho blog).

## Trang công khai
- `frontend/src/portfolio/data.ts` đọc `nodes` (`site = 'port'`) thay cho `portfolio_pages`; `palette` → `look`, `sortOrder` → `sort_order`.
- `frontend/src/data/useModules.tsx` đọc `nodes` (`site = 'blog'`) thay cho `topics`; quyền xem của trang suy từ `status`.

## Thứ tự chạy
1. Chủ site chạy `0032_nodes.sql`, dán kết quả câu kiểm tra cuối file.
2. Merge PR này. Giữa hai bước, đừng sửa trang port hay chủ đề trong admin (code cũ ghi vào `portfolio_pages`/view `topics`).
3. Sau khi chủ site xác nhận site chạy đúng: migration sau xoá view `topics` và bảng `portfolio_pages`.

## Bảng, cột, endpoint đã đụng
- `topics` (đổi tên), `nodes` (mới, như trên), `portfolio_pages` (chỉ đọc khi chép), `posts` (chính sách đọc qua `topic_is_public`, không đổi định nghĩa).
- `/api/tags?vocab=nodes` (mới), `/api/tags?vocab=topics` (bỏ), `/api/portfolio` (bỏ phần trang).

## Đề xuất (ý kiến)
- Bước tiếp: `pages` (trang chọn tay) và phần port trong `site_settings` (trang chủ, About) cũng thành node, để Trạng thái và khuôn trang là một ở mọi chỗ.
