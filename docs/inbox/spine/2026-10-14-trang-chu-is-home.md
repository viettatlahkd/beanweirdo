# Trang chủ của biz và bean đánh dấu trong `nodes`

- **PR:** #89 · nhánh `claude/config-one-tree-539wvd`
- **Migration:** `0034_node_home.sql` (chủ site đã chạy 2026-10-14), `0035_node_home_of.sql` (thay cột của 0034).

## Đã đổi

### [SỬA LỖI] Thẻ Trang chủ của tab biz
Trước: `ConfigTree.tsx` nhận trang chủ biz bằng hằng `BIZ_HOME_SLUG = 'biz-hkd'`, nên đổi slug là mất thẻ (đề xuất trong `docs/inbox/spine/2026-10-14-cau-hinh-ba-tab.md`).
Sau: `bizHome = port.pages.find((p) => p.home_of === 'biz')`. Hằng bị bỏ.

### [ĐỔI HÀNH VI] Trang chủ bean
Chủ site 2026-10-14: "https://beanweirdo.vercel.app/been-hkd trang chủ khối bean là cái này nhé · /bean/details -> sửa thành details".
Trước: thẻ "Trang chủ bean" của tab bean mở trang hệ thống `landing` (/bean/details).
Sau: thẻ "Trang chủ bean" mở trang khối `been-hkd` (`beanHome`, `home_of = 'bean'`). Trang `landing` thành thẻ **details** trong tab bean, và tiêu đề bên phải cũng là "details". Địa chỉ công khai không đổi.

### [ĐỔI HÀNH VI] Mở tab biz
Trước: trạng thái đầu tiên (`useState(homeOf(site))`) của tab biz là Mục lục; chỉ khi bấm tab mới mở trang chủ.
Sau: `homeOf` trả trang chủ của site khi có, cả lúc mở lẫn lúc bấm tab. Mục lục của biz bỏ mọi trang có `home_of` (`bizToc`).

### Schema
- 0034: `nodes.is_home boolean` và chỉ mục `nodes_one_home_per_site`. Cách này chỉ cho mỗi `site` một trang chủ, nhưng `biz-hkd` và `been-hkd` cùng nằm ở site `port`.
- 0035: thêm `nodes.home_of text check in ('biz','bean')` và chỉ mục duy nhất `nodes_home_of_key`, đặt `biz-hkd` → biz và `been-hkd` → bean, rồi xoá `is_home` cùng chỉ mục của nó.
- Kiểu `Node` (`packages/api-contract/src/nodes.ts`) có thêm `home_of`. API không đổi: GET `/api/tags?vocab=nodes` dùng `select('*')`, còn PATCH chưa ghi được cột này (`backend/lib/vocab.ts: nodeColumns`).

## Bảng, cột, endpoint đã đụng
`nodes.is_home` (thêm rồi xoá), `nodes.home_of` (thêm, ghi hai dòng). Đọc qua `GET /api/tags?vocab=nodes`.

## Đối chiếu bộ luật
`frontend/src/content/logic.ts` không có trong repo, nên chưa đối chiếu được.

## Đề xuất (ý kiến)
Trang con của `been-hkd` (nếu sau này có) hiện vẫn rơi vào Mục lục biz, vì `bizToc` lấy mọi trang site `port`. Bước dời site (`port` → biz/bean) nên giải quyết chỗ này.
