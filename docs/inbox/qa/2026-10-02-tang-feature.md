# Tầng feature 3a + 3b — quy chế nối lớp trang với lớp nội dung

- Nhánh: `feature/tang-feature` (cắt từ `origin/main` b960470, sau PR #111)
- PR: #112
- Migration `0028_feature_layer.sql` **đã chạy** trên database hosted (chủ site chạy bằng SQL Editor, 2026-10-02).
- Thiết kế duyệt: artifact "Tầng feature" bản 2 (cơ chế quy chế). Ba câu chủ site chốt:
  tầng subject/topic/tag tự có trang; thanh bên theo luật + xếp tay đè lên; bài mới
  vào đầu danh sách xếp tay.

## Đã sửa

- **[ĐỔI HÀNH VI]** Bảng mới (0028): `listing_rules` (quy chế: tầng, nút, `from_page`,
  gồm nút con, any/all, loại trừ, lọc dạng bài/khuôn, nhóm, xếp, bài mới đầu/cuối,
  thứ tự tay, ghim, giới hạn, `display`), `pages` (trang dựng tay, mẫu theo tầng,
  điều hướng), `page_overrides` (cài đặt đè của một nút; xoá nút thì dòng đè đi theo,
  trigger `drop_page_override`). Anon đọc được; `pages` riêng tư thì không.
- **[ĐỔI HÀNH VI]** `frontend/src/lib/listingRule.ts:resolveRule` — một hàm kéo bài cho
  mọi chỗ. Xếp `manual` với bài chưa được đặt: theo thứ tự cũ của bảng posts
  (`pinned`, `sort_order`, mới nhất) — để kéo thả và ghim trong CMS hiện tại vẫn có
  tác dụng tới 3c.
- **[ĐỔI HÀNH VI]** `data/useModules.tsx` dựng trang từ tầng feature (`buildPages`):
  mỗi subject/topic/tag một trang theo mẫu tầng; trang dựng tay; module chưa trang
  nào nhận (Ghi 02) vẫn là trang của chính nó. Hình trang = mẫu → nút → module
  được liên kết (`presentation.module`, đọc trực tiếp nên CMS module vẫn chỉnh
  được) → cài đặt riêng. Bảng trang trống thì dựng y như cũ từ `modules`.
  `findPage` tìm theo id hoặc địa chỉ cũ (`aliases`).
- **[ĐỔI HÀNH VI]** Các màn đọc bài qua quy chế thay vì `posts.module_id`:
  `Landing`, `IndexScreen`, `Sidebar` (số bài), `ModuleScreen`, `Notes`, `Article`
  (bài cùng trang), port (`portfolio/data.ts:usePortSources` gắn `pages` cho mỗi bài;
  `blocks.ts:resolvePosts` nguồn `module` lấy theo trang). `Archive` (admin) giữ nguyên.
- **[ĐỔI HÀNH VI]** `landingModules`/`indexModules` theo cờ điều hướng (`onHome`,
  `inSidebar`, thứ tự nav); dòng module trơn vẫn theo luật 05 cũ.
- `moduleTarget.openModule` đi theo `page.screen` (Ghi → notes, Ghi 02 → hours).

## Đụng dữ liệu

Dữ liệu thật đã ghi (chủ site: "đã chạy 0028 xong, chép dữ liệu đi", 2026-10-02):

- `listing_rules`: 9 dòng — 3 mẫu (subject, topic: topic + `from_page` + mới nhất;
  tag: keyword + `from_page` + mới nhất); tư duy tư duy (topic business,
  entrepreneur-101, writing); ghi (toàn bộ, khuôn bitesize + memo); bean-weirdo,
  sensory, roasting, biochemistry (topic tương ứng). Bảy quy chế ngoài mẫu xếp
  `manual`, chưa đặt bài nào.
- `pages`: `tpl-subject`, `tpl-topic`, `tpl-keyword`, `tu-duy-tu-duy` (alias
  `mod1789737119986`), `ghi` (alias `ghi01`), `nav` (tư duy tư duy, bean-weirdo,
  sensory, roasting, biochemistry, ghi [không lên trang chủ]; business,
  entrepreneur-101, writing, art, philo ẩn khỏi thanh bên và trang chủ).
- `page_overrides`: bean-weirdo (module `mod1790009726612`, alias như vậy), sensory,
  roasting, biochemistry (module `biochem`, alias `biochem`).
- Không đụng: `modules`, `posts`, `portfolio_pages`.

Người đọc thấy đổi (đúng như bản chạy thử trước khi ghi): a bean weirdo 0 → 11 bài,
sensory 2 → 3 (thêm "taste modality: sơn la"), tư duy tư duy 3 → 4 (thêm
"governance: a reading list"). Thanh bên, trang chủ giữ thứ tự cũ. Port: khối nguồn
`mod1790009726612` 0 → 3 bài, khối slider `mod1789737119986` 3 → 4.

Kiểm trên trình duyệt (dev server nhánh này, dữ liệu hosted): Mục lục, thanh bên,
trang chủ (27 · 4 · 11 · 3 · 3 · 5), `/module/bean-weirdo`, `/module/mod1790009726612`
(địa chỉ cũ), `/module/sensory`, `/module/biochemistry` (đúng thứ tự tay cũ),
`/module/philo`, `/module/tag-ops-review`, `/ghi` (14 bài, chip như cũ).

**Hoàn tác:** `delete from page_overrides; delete from pages; delete from listing_rules;`
— site tự quay về dựng trang từ `modules`.

## Chưa làm, đã biết

- Trang tag ở `/module/tag-<id>`; địa chỉ `/tag/<id>` cần thêm một từ địa chỉ — để 3c.
- Địa chỉ cũ `/module/mod…` mở đúng trang nhưng thanh địa chỉ không đổi sang địa chỉ mới.
- Cảnh báo React "two children with the same key" ở Mục lục có từ trước: ba ảnh đầu
  trang dùng chú thích làm key (`IndexScreen.tsx`, `key={p.caption}`) và chú thích trùng nhau.

## 3c — CMS (đẩy vào cùng PR #112)

- **[ĐỔI HÀNH VI]** Content management đổi từ ba tab (Quản lý bài · Sơ đồ trang ·
  Nội dung trang) thành bốn: **Quản lý bài · Phân loại · Quản lý trang · Cài đặt
  hiển thị** (`Cms.tsx:TABS`, `routes.ts:CmsTab`). Địa chỉ: `/ad-post`, `/ad-taxonomy`,
  `/ad-sitemap`, `/ad-display`; `/ad-page-content` cũ mở Quản lý trang. Từ địa chỉ mới
  `adTaxonomy`, `adDisplay`, `tag` (`routeWords.ts`, `RoutesPanel` BLOCKS).
- **[ĐỔI HÀNH VI]** Phân loại: Chủ đề, Tag, Dạng bài (chuyển từ Nội dung trang).
- **[ĐỔI HÀNH VI]** Quản lý trang (`admin/components/PagesManager.tsx`):
  điều hướng (kéo thả thứ tự, cờ thanh bên / trang chủ; subject chưa xếp tự hiện cuối
  danh sách), trang (Trang chủ, Mục lục, Lưu trữ, trang dựng tay, "+ trang mới"),
  trang theo tầng (ba mẫu, các nút có cài đặt riêng, "+ cài đặt riêng cho…" — chép quy
  chế của mẫu). Trình sửa trang: quy chế (`RuleEditor`), thứ tự tay + ghim
  (`HandOrder`, ghi `manual_order`/`pinned`), hình trang (các ô module được nối —
  `Cms.tsx:moduleFields`), chữ cố định (`Cms.tsx:pageCopy`), xem trước là chính trang
  công khai trong iframe, tải lại sau mỗi lần lưu.
- **[ĐỔI HÀNH VI]** Bỏ khỏi CMS: cây Sơ đồ trang, danh sách module kéo thả, "+ module mới",
  xoá module, danh sách "Bài trong module" (kéo thả ghi `posts.sort_order`). Thứ tự giờ
  sửa ở Quản lý trang › trang › Thứ tự.
- **[ĐỔI HÀNH VI]** Cài đặt hiển thị: Đường dẫn (chuyển từ Sơ đồ trang), chữ khu quản trị,
  "Trả về nội dung gốc".
- **[ĐỔI HÀNH VI]** API (`backend/lib/layout.ts`, qua `/api/tags?vocab=layout|rules|pages|overrides`):
  đọc tầng feature, tạo/sửa quy chế, tạo/sửa/xoá trang dựng tay, ghi/xoá cài đặt đè.
- **[ĐỔI HÀNH VI]** Trang tag ở `/tag/<id>` (trước: `/module/tag-<id>`).
- **[ĐỔI HÀNH VI]** Mở trang bằng địa chỉ cũ (id module) thì thanh địa chỉ đổi sang địa chỉ
  mới (`App.tsx:Routed`); `/module/biochemistry` ↔ `biochem` không lặp.
- **[ĐỔI HÀNH VI]** Khung sửa bài: danh sách "Địa chỉ cũ" dưới ô Địa chỉ, bỏ được từng cái
  (`PATCH /api/posts/:id` `forget_slugs`; GET trả `old_slugs`).

Kiểm 3c: `npm test` 1288 xanh (tắt dev server), `vite build` xanh. Trình duyệt: bốn tab;
Quản lý trang đọc đúng điều hướng (5 subject mới bỏ chọn thanh bên), 4 trang có cài đặt
riêng; trình sửa biochemistry 101 hiện quy chế, 5 bài thứ tự tay, ô module, xem trước;
bấm thêm nút / đổi cách xếp / ghim — **chặn lệnh ghi trong trình duyệt**, đọc payload,
không ghi gì. `/tag/ops-review`, `/module/mod1789737119986` → `/module/tu-duy-tu-duy`.
Vòng thử ghi trên dữ liệu thật (chủ site: "chạy thử rồi đẩy vào 112", 2026-10-02):
  - trang dựng tay `trang-thu`: tạo (201) → quy chế đổi sang tag ops-review (200) → `sort: 'random'`
    bị từ chối (400) → đổi tên (200) → xoá (200, quy chế đi theo). Xoá mẫu `tpl-topic` → 400.
  - cài đặt riêng cho fermentation: tạo quy chế + PUT override → DELETE (quy chế đi theo).
  - ghim Water ở biochemistry: trang công khai lên đầu "Water > Varieties… > Beans… > Lipid…";
    bỏ ghim.
  - bật philo lên thanh bên: Mục lục thêm "philo · 2 bài"; trả về ẩn.
  - PUT `?vocab=topics` với đúng thứ tự cũ (6 subject 1…6).
  - Sau vòng thử: 6 trang, 4 cài đặt đè, 9 quy chế, không ghim, không thứ tự tay, thứ tự
    subject như cũ. Đổi `updated_at` của quy chế biochemistry và trang `nav`.
- **[SỬA LỖI]** (tìm ra trong vòng thử) `backend/lib/cors.ts:applyCorsHeaders` không cho
  `PUT`, nên trình duyệt chặn mọi lệnh PUT: sắp lại bài, sắp lại module (CMS cũ, có từ
  2026-08-17, commit 18268dc), sắp lại chủ đề (PR #111, đang trên production), ghi cài đặt
  đè (3c). Thêm `PUT`; test `cors.test.ts`.

Chưa làm: nút ghim ở Quản lý bài vẫn ghi `posts.pinned` (chỉ còn ảnh hưởng bài chưa xếp
trong quy chế xếp tay) — bỏ ở 3d cùng các cột cũ.

## Đụng luật

- **05** (Module: sidebar module thường trước, đặc biệt sau; trang chủ chỉ module
  thường): khi đã có `nav`, thứ tự và cờ do điều hướng quyết định, không do loại
  module. Mâu thuẫn trực tiếp với cách diễn đạt hiện tại của luật 05.

## Đề xuất luật

- Thứ tự tay thuộc về quy chế, không thuộc về bài.
- Mỗi subject, topic, tag có trang theo mẫu tầng; thanh bên tự thêm subject mới.
- `SPEC.html`: thêm ba bảng 0028, số migration lên 28; luật 05 viết lại theo điều hướng.
