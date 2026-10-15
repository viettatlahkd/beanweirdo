# Cấu hình: ba tab beanweirdo | biz | bean

- **PR:** #87 · nhánh `claude/config-one-tree-539wvd`
- **Phạm vi:** `frontend/src/admin/components/ConfigTree.tsx`, `screens/Cms.tsx`,
  `admin/components/PageSettings.tsx`, `admin/components/PortEditors.tsx`, `lib/routes.ts` (chỉ chú thích).

## Đã đổi

### [ĐỔI HÀNH VI] Tab của Cấu hình
Trước: Personal Blog | Port | Practice (`ConfigTree.tsx: SITES`).
Sau: beanweirdo | biz | bean. Tab nhớ ở khoá localStorage `beanweirdo.config.tab` (khoá cũ `beanweirdo.config.site` bỏ).
- beanweirdo: Trang chủ (port home), Mục lục = thanh trên (`rootToc`, kéo ghi `site_settings.portfolio.header.links` như trước), Khung chung (ContentTab `header` + `footer`), Tag, Tác giả, Ghi 02.
- biz: Trang chủ biz = trang port slug `biz-hkd` (chủ site chỉ định, hằng `BIZ_HOME_SLUG`); Mục lục = các `nodes` site `port` còn lại dựng thành cây (`bizToc`, `moveBizPage`), lồng được, mỗi trang có "Mục con".
- bean: Trang chủ bean (landing), Mục lục (cây chủ đề + trang chọn tay), Hình trang.

### [ĐỔI HÀNH VI] Kéo trang port
Trước: kéo trong Mục lục Port đổi thứ tự thanh trên (`movePortLink`).
Sau: kéo trong Mục lục biz đổi `nodes.sort_order`/`parent_id` (`moveNodeIn`, PUT `/api/tags?vocab=nodes`); thanh trên chỉ đổi ở Mục lục của tab beanweirdo.

### [ĐỔI HÀNH VI] Tab Tác giả
Trước: tab riêng ở `Cms.tsx: TABS`. Sau: thẻ trong tab beanweirdo; `/ad-authors` (CmsTab `authors`) mở `ConfigTree openAuthors`.

### [ĐỔI HÀNH VI] Signature
Trước: thẻ con của "Phần chung". Sau: mở cùng About (ContentTab `sign`). Tên "Phần chung" bỏ ở cả hai site.

### Code bỏ
`PageSettings.tsx: PORT_PARTS` (hết người dùng). `createFromPreset` nhận thêm `parentId`.

## Bảng, cột, endpoint đã đụng
Không đổi schema. Đọc/ghi như cũ: `nodes` (`sort_order`, `parent_id` nay cũng ghi cho site `port`), `site_settings.portfolio.header`/`footer`/`about`, `authors` qua `AuthorsPanel`. Endpoint: `PUT /api/tags?vocab=nodes`, `PATCH /api/tags?vocab=nodes&id=`, `PATCH /api/site`.

## Đối chiếu bộ luật
`frontend/src/content/logic.ts` không có trong repo (kiểm 2026-10-14), chưa đối chiếu được.

## Đề xuất (ý kiến)
Trang chủ biz đang nhận ra bằng slug `biz-hkd`; đổi slug trang ấy thì tab biz mất thẻ Trang chủ. Bước dữ liệu (SQL) nên đánh dấu gốc biz trong `nodes` thay cho hằng này.
