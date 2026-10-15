# Gộp main của repo gốc vào fork — lấy fork làm nền

- PR: #60, nhánh `claude/sync-upstream-main-kuy90r`
- Nền: `main` của fork (a5d3d67). Nguồn bổ sung: `main` của viettatlahkd/beanweirdo (8fff08f), đã đẩy lên fork thành nhánh `upstream-main`.
- Sao lưu trước khi gộp: `backup/norway-main-2026-10-04` (a5d3d67), `backup/hkd-main-2026-10-04` (8fff08f).
- Không có migration mới. Không ghi dữ liệu thật.

Chủ site quyết ngày 2026-10-04: giữ cấu trúc fork, chỉ bổ sung phần của bên gốc. Bản trước của PR #60 làm ngược lại (lấy bên gốc làm nền) và đã bị thay hẳn.

## Đã lấy từ bên gốc (cherry-pick, gộp trong một commit)

### [ĐỔI HÀNH VI] Portfolio

Cherry-pick chuỗi commit Portfolio df7a486 … fb0fcb8 của bên gốc.

- API: `backend/api/portfolio.ts` (GET/POST/PATCH/DELETE `/api/portfolio`, `?part=design`). Bảng `portfolio_pages` và `portfolio_design`; chữ cố định của port (header, footer, about) nằm ở khoá `portfolio` của site settings, đọc ghi qua `/api/site`. Hai bảng theo `backend/supabase/migrations/0025_portfolio.sql` và `0026_portfolio_archived.sql`. Hai migration này đã chạy trên database dùng chung, nên tôi chỉ thêm file vào repo.
- Trang công khai: `/portfolio`, `/portfolio/about` và `/portfolio/<slug>` (`screens/PortfolioPage.tsx`, thư mục `frontend/src/portfolio/`).
- Khu quản trị: màn riêng `Portfolio` (`admin/screens/Portfolio.tsx`), có mục ở nhóm Admin của thanh bên (`content/navItems.ts`, key `portfolio`). Màn có ba tab, mở ở ba địa chỉ:
  - `/ad-portfolio`
  - `/ad-portfolio-content`
  - `/ad-portfolio-design`
- Bên gốc sau đó gộp màn này vào CMS bốn tab (commit 70d3df0). Tôi không lấy commit đó, vì CMS của fork vẫn giữ nguyên ba tab Bài viết · Tác giả · Cấu hình.

### [SỬA LỖI] Bốn lỗi bài viết (0452d66)

- `lib/notesFilter.ts:noteFilterBar` lọc theo id của tag, còn chip hiện tên. `screens/Notes.tsx` hiện `f.label`.
- `DELETE /api/tags` với `to: null` khi còn bài hoặc ghi chép đang đeo tag: trả 400 trước mọi lệnh ghi. Ô "chuyển sang" trong `Cms.tsx:TagsPanel` bỏ lựa chọn "(bỏ trống)".
- Link bài trong portfolio lấy địa chỉ qua `portfolio/data.ts:usePostHref`.
- Breadcrumb module (`lib/crumbs.ts:buildCrumbs`) và eyebrow của `screens/Article.tsx` đi qua `moduleTarget.openModule`.

## [SỬA LỖI] Backend về đúng 12 function

Thêm Portfolio thì backend lên 15 function, vượt trần 12 của gói Vercel Hobby. Tôi gộp ba endpoint tác giả vào hai endpoint sẵn có. Handler và payload trong `api-contract` không đổi; chỉ đổi URL:

| Trước | Sau |
|---|---|
| `/api/authors`, `/api/authors/:id` | `/api/tags?vocab=authors[&id=…]` |
| `/api/posts/:id/authors` | `/api/posts/:id?part=authors` |

- Handler chuyển sang `backend/lib/authorsApi.ts` (`handleAuthors`, `handlePostAuthors`).
- Phía frontend, các hàm tác giả trong `admin/lib/apiClient.ts` đổi URL theo bảng trên.

## Không lấy (bảng của chúng vẫn nằm trong database, không ai đọc)

- Tầng nội dung (0027): cây chủ đề `topics`, tag theme `keywords` / `post_keywords`, `posts.slug` / `post_slugs`, `posts.visibility`. Trên trang công khai, những thứ này chỉ có tác dụng qua tầng feature.
- Tầng feature (0028, 0029): `listing_rules`, `pages`, `page_overrides`, CMS bốn tab, Quản lý trang. Chúng thay hẳn cây module kéo thả của tab Cấu hình.
- Bỏ "dạng bài" (2f68f2b). Fork vẫn dùng `posts.kind`.
- Design system của blog trong Cài đặt hiển thị (70d3df0). Nó đổi token màu sang biến CSS cho cả site.

## Kiểm

`npm run lint` (gồm knip), `npm run typecheck`, `vitest run`: 151 file và 1597 test, tất cả đều xanh. `vite build` xanh. Chưa xem được trên trình duyệt, vì khu quản trị nằm sau cổng đăng nhập; chủ site kiểm trên Vercel.
