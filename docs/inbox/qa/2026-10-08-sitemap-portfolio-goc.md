# PR #62 · nhánh `claude/project-thread-hv94zq` — sắp xếp lại sitemap

## [ĐỔI HÀNH VI] Portfolio lên gốc, blog vào `/bean/…`

Tôi đổi địa chỉ công khai (`lib/routes.ts`: `parsePath`, `readPath`, `readBlog`, `readPort`, `toPath`):

| Trước | Sau |
|---|---|
| `/` → trang chủ blog (`landing`) | `/` → trang chủ port (`portfolioHome`) |
| `/portfolio`, `/portfolio/about`, `/portfolio/<slug>` | `/`, `/about`, `/<slug>` |
| `/muc-luc`, `/ghi`, `/module/x`, `/tag/x`, `/post/x` | cùng các đường đó dưới `/bean/` |
| — | `/bean/details` → trang chủ blog |

- Địa chỉ cũ vẫn đọc được (`OLD_PORTFOLIO`, `readBlog(…, nested=false)`), `useRoute` viết lại bằng `replaceState`. Riêng `/` trần đổi nghĩa.
- Một chữ lạ ở gốc giờ là slug trang port (hiện "không có trang này"), trước đây rơi về trang chủ blog.
- `RouteWords`: bỏ `portfolio`, thêm `bean` và `details` (`lib/routeWords.ts: DEFAULT_WORDS, MUST_DIFFER`).
- Trang port có slug bằng `activeWords().bean` hiện nút "details →" dưới hero (`portfolio/data.ts: onwardOf`, `PortfolioView` prop `onward`).
- `backend/api/portfolio.ts: pageColumns` từ chối slug trong `RESERVED_SLUGS` và mọi slug bắt đầu bằng `ad-`.

Bảng/endpoint đã đụng: `PATCH/POST /api/portfolio` (chỉ thêm kiểm slug). Không đổi bảng, không cần SQL.

## Đề xuất

Specs ở `docs/SPEC.html` còn ghi `/portfolio/<slug>` và trang chủ ở `/` — cần lane tài liệu sửa theo bảng trên.
