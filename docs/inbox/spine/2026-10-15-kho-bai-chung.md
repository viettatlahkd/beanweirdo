# Kho bài chung, tick trang chủ, trang bài /p/

- **PR:** #103 · nhánh `claude/config-one-tree-539wvd`
- **Migration:** `0038_post_shown_on.sql`. Chủ site chạy **trước** khi merge: code mới đọc cột `posts.shown_on`, thiếu cột thì danh sách bài lỗi.

Chủ site 2026-10-15: một kho bài cho biz, bean và personal blog; mỗi bài có cờ cho từng site, "true ở đâu thì appear ở trang chủ cái đó"; tick chỉ có nghĩa là hiện ở trang chủ nào (chọn phương án a). Trang bài trung lập theo mock "B + cột trái của C", header chung với port; "oke rồi làm đi".

## Đã đổi

### [ĐỔI HÀNH VI] Cột `posts.shown_on`
Trước: không có. Sau: `text[] not null default '{blog}'`, chỉ nhận `biz`, `bean`, `blog` (constraint `posts_shown_on_known`). Bài cũ đều là `{blog}`.
- Kiểu `PostSite` trong `packages/api-contract/src/posts.ts`.
- `backend/lib/posts.ts`: `POST_COLUMNS`, `POST_SUMMARY_COLUMNS`, `toPostSummary` (thiếu thì `['blog']`), hằng `POST_SITES`.
- `PATCH /api/posts/:id` nhận `shown_on` (`backend/api/posts/[id]/index.ts`), sắp lại theo thứ tự `POST_SITES`, giá trị lạ trả 400. Áp dụng ngay, không qua bản nháp (giống module, ghim).

### [ĐỔI HÀNH VI] Admin
- Thông tin bài (`PostSettings.tsx`): mục "Hiện ở trang chủ" với ba công tắc biz · bean · personal blog. Tắt hết thì có dòng "Bài không hiện ở trang chủ nào."
- Nội dung: bộ lọc thêm loại "Hiện ở" (`PostSearch.tsx: FACET_LABEL`, `ContentWorkspace.tsx: wears`, `postsOf`).
- Khối trang port: nguồn bài mới "Bài tick trang này" (`blocks.ts: Source` mode `site`, `resolvePosts`; `PortEditors.tsx: SourceFields`). Chọn nguồn này thì site mặc định là site của trang đang sửa (`portSiteOf`). Khối cũ giữ nguyên nguồn cũ cho tới khi chủ site đổi.

### [ĐỔI HÀNH VI] Trang chủ personal blog lọc theo tick
`Landing.tsx: Landing` chỉ liệt kê bài có `blog` trong `shown_on`. Trang chủ đề, Mục lục blog vẫn liệt kê mọi bài xếp vào đó (`useModules: postsOf` không đổi).

### [ĐỔI HÀNH VI] Trang bài ở /p/<slug>
Trước: `/personal-blog/post/<slug>`, trong khung blog có sidebar, đầu bài là breadcrumb + byline.
Sau:
- `routes.ts`: hằng `POST = 'p'`; `toPath` cho bài ra `/p/<slug>[?from=…]`; `readPath` đọc `/p/<slug>`. `/personal-blog/post/…`, `/bean/post/…`, `/post/…` vẫn đọc được và `useRoute` viết lại sang `/p/…`. `originOf` bỏ qua `from` lạ.
- `nav.tsx: Origin` thêm `biz`, `bean`, `blog`. Link bài trên trang port mang `?from=<site>` (`data.ts: usePostHref(from)`, `PortfolioPage.tsx`, `PortEditors.tsx: Builder`).
- `App.tsx`: màn `article` vẽ `PostPage` toàn chiều rộng, không sidebar blog.
- `screens/PostPage.tsx: PostPage`: header và footer của port (`PortfolioView.tsx: PortBars`, tách từ `PortFrame`). Đến từ biz/bean thì dùng bảng màu và sáng link của trang chủ đó.
- `screens/PostRail.tsx: PostRail`: cột trái gồm khối "← Quay lại / site / trang chủ" (`backOf` theo `from`) và "Trong bài này" lấy từ các h2/h3 đã vẽ. Trên điện thoại cột ẩn, còn một dòng quay lại trên bài.
- `components/Byline.tsx`: `Byline` thay bằng `PostProps` (bảng Tác giả, Chủ đề, Tag, Hiện ở, Ngày, Đọc), dùng ở cả `Article.tsx` và `admin/screens/Preview.tsx`. Breadcrumb blog không còn trên trang bài.
- Thân bài vẫn do sáu khuôn của `post-renderer` vẽ, không đổi. Bảng thuộc tính nằm ở ô breadcrumb của khuôn, tức là **trên** tên bài, không dưới tên bài như mock.

### [ĐỔI HÀNH VI] Slug cấm
`backend/lib/vocab.ts: RESERVED_SLUGS` thêm `p`.

## Bảng, cột, endpoint đã đụng
- `posts.shown_on`: thêm (0038); đọc anon ở `usePublishedPosts` (`LIST_COLUMNS`) và `useModules`/`usePost` (`select('*')`); đọc/ghi qua `GET`/`PATCH /api/posts/:id` và danh sách bài admin.
- `nodes` (site `port`): `PostPage` đọc qua `usePortChrome` sẵn có. `site_settings.portfolio`: đọc như trang port.
- Không ghi gì vào dữ liệu thật.

## Ghi chú
- Đã xem bằng trình duyệt với dữ liệu giả (Playwright, chặn Supabase), khuôn article, máy tính và điện thoại. Chưa xem với dữ liệu thật và năm khuôn còn lại.
- Docs lane: README còn ghi bài ở `/personal-blog/post/…`.
- Thẻ hỏi về link cũ chưa được trả lời; đang giữ chuyển tiếp như đã báo.
