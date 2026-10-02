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

## Đụng luật

- **05** (Module: sidebar module thường trước, đặc biệt sau; trang chủ chỉ module
  thường): khi đã có `nav`, thứ tự và cờ do điều hướng quyết định, không do loại
  module. Mâu thuẫn trực tiếp với cách diễn đạt hiện tại của luật 05.

## Đề xuất luật

- Thứ tự tay thuộc về quy chế, không thuộc về bài.
- Mỗi subject, topic, tag có trang theo mẫu tầng; thanh bên tự thêm subject mới.
- `SPEC.html`: thêm ba bảng 0028, số migration lên 28; luật 05 viết lại theo điều hướng.
