# Địa chỉ của hai site con: /biz và /bean

- **PR:** #93 · nhánh `claude/config-one-tree-539wvd`
- **Migration:** không có. Dùng cột `nodes.home_of` của 0035.

## Đã đổi

### [ĐỔI HÀNH VI] Trang chủ của biz và bean
Trước: trang khối /biz-hkd và /been-hkd nằm ở gốc, như mọi trang port. Còn `/bean` một mình được đọc là trang port có slug `bean` (`routes.ts: readPort`).
Sau:
- `/biz` mở trang có `home_of = 'biz'`.
- `/bean` mở trang có `home_of = 'bean'` (`routes.ts: readPath`, `Where.site`; `data.ts: usePublicPort(slug, site)` đọc `nodes` theo `home_of`).
- Mở trang chủ bằng slug của nó (/biz-hkd, /biz/been-hkd) thì được chuyển sang /biz hoặc /bean (`PortfolioPage.tsx: PortfolioPage`, `replaceState`).

### [ĐỔI HÀNH VI] Trang của biz
Trước: `/<slug>`.
Sau: `/biz/<slug>` (`routes.ts: toPath`, case `portfolioPage`). `/<slug>` cũ vẫn đọc được, và `useRoute` viết lại thành `/biz/<slug>`.

Mọi link tới trang port đi qua `portPagePath` (`routes.ts`). Các chỗ dùng nó:
- thanh trên (`content.ts: navLinks`);
- các khối của trang chủ gốc (`data.ts: homeCards`);
- danh sách trang ở About (`PortfolioPage.tsx: PortfolioAbout`);
- địa chỉ hiện trong Cấu hình (`ConfigTree.tsx`).

### [ĐỔI HÀNH VI] Lối xuống blog
Trước: `data.ts: onwardOf(slug)` chỉ hiện "details →" trên trang port có slug trùng từ `bean`.
Sau: `onwardOf(page)` hiện nó trên trang có `home_of = 'bean'`.

### Không đổi
`/bean/details`, `/bean/muc-luc`, `/bean/ghi`, `/bean/module/…`, `/bean/tag/…`, `/bean/post/…`. `/about` vẫn ở gốc.

## Bảng, cột, endpoint đã đụng
Đọc thêm `nodes.home_of` từ trang công khai (anon, `supabase.from('nodes')`). Không ghi gì.

## Ghi chú
- Từ `biz` cố định trong code (hằng `BIZ` trong `routes.ts`), giống `about`. Chưa thêm nó vào bộ từ địa chỉ chủ site sửa được (`RouteWords`). Từ `bean` thì vẫn là của chủ site.
- `backend/lib/vocab.ts: RESERVED_SLUGS` giữ nguyên, chỉ sửa chú thích: slug vẫn không được trùng chữ ở gốc, vì `/<slug>` cũ vẫn được đọc.
- Chưa kiểm bằng trình duyệt: phiên này không có credential Supabase để dựng trang thật.
