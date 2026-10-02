# Trang chia nhóm theo quy chế — bean weirdo theo topic, Ghi theo subject

- Nhánh: `feature/tang-feature-don` (cắt từ `origin/main` 8e0c27d, sau PR #112)
- PR: #113
- Migration `0029_group_by_subject.sql` **đã chạy** trên database hosted (chủ site, SQL Editor, 2026-10-02).

## Đã sửa

- **[ĐỔI HÀNH VI]** Quy chế nhóm được theo `subject` (gom mọi topic về subject gốc):
  `lib/listingRule.ts:groupPosts`, `RuleGroup`; 0029 nới `listing_rules_group_by_check`;
  Quản lý trang có lựa chọn "subject".
- **[ĐỔI HÀNH VI]** Trang module vẽ theo nhóm của quy chế: mỗi nhóm một đầu mục (tên
  subject/topic) rồi danh sách bài theo đúng bố cục band / specimen / sequence
  (`screens/ModuleScreen.tsx:GroupHead`, `Band`/`Specimen`/`Sequence` nhận `groups`).
  Quy chế không nhóm thì vẽ y như cũ. Số thứ tự đánh lại trong từng nhóm.
- **[ĐỔI HÀNH VI]** Trang Ghi vẽ theo nhóm: đầu mục ngang lưới, lưới riêng mỗi nhóm, số đếm
  ngược trong từng nhóm, ô feature nằm ở nhóm nhiều bài nhất (`screens/Notes.tsx`,
  `sections`, `featureAt`). Chip lọc dạng bài vẫn lọc trong mọi nhóm.
- **[ĐỔI HÀNH VI]** "Mới nhất trước" xếp theo ngày trên bài (`date_label`) trước, giờ đăng
  sau (`listingRule.ts:newest`). Trước: giờ đăng trước — bài nạp cùng đợt ra sai thứ tự
  (2025.11 đứng trên 2026.01). Thứ tự dự phòng của quy chế xếp tay chưa đặt bài
  (`legacy`) giữ nguyên cách xếp cũ của database, nên trang roasting, sensory, tư duy
  tư duy không đổi.
- `useModules().groupsOf(pageId)`.

## Đụng dữ liệu

Dữ liệu thật đã ghi (chủ site yêu cầu bean weirdo chia 3 topic, Ghi chia art / philo, mới
nhất trước, 2026-10-02), qua REST:
- `listing_rules` 35875a1a… (bean weirdo): `group_by` topic, `sort` newest (trước: none, manual).
- `listing_rules` f6bc4d6a… (ghi): `group_by` subject, `sort` newest (trước: none, manual).

Production (code #112) chưa vẽ nhóm nên người đọc chưa thấy khác cho tới khi nhánh này merge;
thứ tự "mới nhất" của #112 vẫn theo giờ đăng nên bean weirdo trên production có thể xếp khác
trong lúc chờ.

Trình duyệt (dev server nhánh này, dữ liệu hosted): `/module/bean-weirdo` — ROASTING
(2026.08 · 06 · 06), SENSORY (2026.08 · 03 · 2025.10), BIOCHEMISTRY (2026.09 · 01 · 01 · 2025.12 · 11);
fermentation không bài nên không hiện. `/module/roasting` giữ thứ tự cũ. `/ghi` — ENTREPRENEUR 101,
BEAN WEIRDO, ART (10 bài, ô feature ở đây), PHILO (2 bài).

## Đụng luật

- **06/07** (Ghi): không đổi câu trích hay cách mở bài; chỉ thêm đầu mục nhóm.

## Đề xuất luật

- "Mới nhất" nghĩa là ngày người đọc thấy trên bài.
