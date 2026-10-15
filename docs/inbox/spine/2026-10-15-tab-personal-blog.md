# Tab personal blog, blog ra /personal-blog

- **PR:** #99 · nhánh `claude/config-one-tree-539wvd`
- **Migration:** không có.

Chủ site 2026-10-15: "tách riêng phần mục lục ra 1 cái tab ngang hàng với bean và biz tên là personal blog … cấu trúc tương tự các trang kia bao gồm trang chủ, mục lục,… đều có thể scale up đủ crud". Sau đó: "đổi địa chỉ công khai của trang /bean/details -> thành /personal-blog … ngang hàng bean rồi mà".

## Đã đổi

### [ĐỔI HÀNH VI] Cấu hình có bốn tab
Trước: beanweirdo | biz | bean. Tab bean có Trang chủ bean, Mục lục (cây subject), details, Hình trang.
Sau: beanweirdo | biz | bean | personal blog (`ConfigTree.tsx: SITES`, `SITE_LABELS`).
- personal blog (`blogSite`): Trang chủ = trang `landing` (trước là thẻ "details"), Mục lục = cây subject (`topicToc`), Hình trang. Tab mở trên Trang chủ (`homeOf`). Breadcrumb của subject, Hình trang và trang hệ thống ghi "personal blog".
- bean (`beanSite`): Trang chủ bean và một Mục lục riêng (`beanToc`, group `bean-pages`) gồm các trang khối nằm dưới trang chủ bean. Thêm, xoá, kéo thả, lồng như Mục lục biz. "Thêm trang" ở tầng trên cùng tạo trang có `parent_id` = trang chủ bean (`addPortPage(beanHome)`); kéo lên tầng trên cùng cũng đặt cha là trang chủ bean (`moveBeanPage`).
- biz: Mục lục biz (`bizToc`) chỉ còn những trang không nằm dưới trang chủ bean. Trước đây nó lấy mọi trang site `port`.
- Trang khối nào cũng xác định site qua `routes.ts: portSiteOf` (đi ngược cha tới trang có `home_of`; không gặp thì là biz).
- Trang chủ của một site không còn mục "Mục con" ở chi tiết; con của nó là Mục lục của site.
- Ghi chú thẻ Tag, Tác giả: "dùng chung cho mọi site". Mục "Trang của tag trên bean" đổi thành "… trên personal blog".

### [ĐỔI HÀNH VI] Địa chỉ công khai của blog
Trước: `/bean/details`, `/bean/muc-luc`, `/bean/ghi`, `/bean/module/…`, `/bean/tag/…`, `/bean/post/…`.
Sau: `/personal-blog`, `/personal-blog/muc-luc`, `/personal-blog/ghi`, `/personal-blog/module/…`, `/personal-blog/tag/…`, `/personal-blog/post/…` (`routes.ts: toPath`, hằng `BLOG`). `personal-blog` là chữ cố định như `biz`, không nằm trong `RouteWords`.
Địa chỉ `/bean/…` cũ vẫn đọc được (`readPath`, `readBlog` với `underBean`) và `useRoute` viết lại sang `/personal-blog/…`.

### [ĐỔI HÀNH VI] Trang của bean ở /bean/<slug>
Trước: mọi trang khối không phải trang chủ ở `/biz/<slug>`. `/bean/<chữ lạ>` ra "không có trang này".
Sau:
- `portPagePath(page, pages)` cho trang dưới trang chủ bean ra `/bean/<slug>`.
- `readPath` đọc `/bean/<slug>` là trang khối (`Where.site = 'bean'` kèm `slug`), sau khi thử địa chỉ blog cũ.
- `PortfolioPage.tsx: PortfolioPage` chuyển trang mở sai site về địa chỉ của nó (một trang bean mở ở `/biz/<slug>` thì sang `/bean/<slug>`).
- `data.ts: usePublicPort` ưu tiên tìm theo slug khi có slug, chỉ tìm theo `home_of` khi chỉ có site.
- Các chỗ gọi `portPagePath` truyền danh sách trang để biết tổ tiên: `content.ts: navLinks`, `data.ts: homeCards`, `PortfolioPage.tsx: PortfolioAbout`, `ConfigTree.tsx`.

### [ĐỔI HÀNH VI] Nút "details →" trên trang chủ bean
Trước: dẫn tới `/bean/details`. Sau: dẫn tới `/personal-blog` (`data.ts: onwardOf`). Chữ trên nút vẫn là từ `details`. Nhãn của từ ấy trong Đường dẫn đổi từ "Trang chủ blog" thành "Nút sang blog ở trang chủ bean" (`routeWords.ts: WORD_LABELS`).

### [ĐỔI HÀNH VI] Slug cấm cho trang khối
`backend/lib/vocab.ts: RESERVED_SLUGS` thêm `details`, `biz`, `bean`, `personal-blog`. Chỉ chặn khi ghi slug mới; dòng có sẵn không bị đụng.

## Bảng, cột, endpoint đã đụng
- Đọc thêm `nodes.parent_id` ở trang công khai (anon, `supabase.from('nodes')` trong `usePortChrome`, `usePublicPort`). Cột đã được `select('*')` từ trước.
- Ghi `nodes.parent_id` khi thêm hoặc kéo trang trong Mục lục bean, qua `POST /api/tags?vocab=nodes` và `PATCH` sẵn có. Không ghi gì vào dữ liệu thật trong PR này.

## Ghi chú
- Chưa kiểm bằng trình duyệt: phiên này không mở được trang thật.
- Mục lục bean hiện trống: chưa có trang nào nằm dưới `been-hkd`.
- Một trang bean có tổ tiên đang là nháp sẽ bị coi là của biz ở trang công khai, vì RLS không trả trang nháp cho `usePortChrome`.
- Docs lane: `README.md` và docs/SPEC còn ghi blog ở `/bean/…`.
