# Tầng nội dung — cây chủ đề, tag theme, địa chỉ cố định, quyền xem

- Nhánh: `feature/tang-noi-dung` (cắt từ `origin/main` 0452d66, sau PR #110)
- PR: chưa mở
- Migration `0027_content_layer.sql` **đã chạy** trên database hosted (chủ site chạy bằng SQL Editor, 2026-10-02).
- Khung duyệt: artifact "Khung level nội dung" (ba tầng feature · nội dung · display) và "Kho bài theo tầng" bản 5 (cây và chỗ của 31 bài).

## Đã sửa

- **[ĐỔI HÀNH VI]** Bảng mới `topics`: cây chủ đề subject › topic, sâu tối đa hai tầng
  (trigger `topics_two_levels`), id theo khuôn slug. Mỗi nút có màu, lời dẫn,
  thứ tự, quyền xem.
- **[ĐỔI HÀNH VI]** Bảng mới `keywords` + `post_keywords`: tag theme, phẳng, mỗi bài
  0..n. Xoá một tag thì bài chỉ bỏ tag đó (cascade).
- **[ĐỔI HÀNH VI]** `posts.kind` và bảng `tags` **không đổi**, từ giờ mang nghĩa
  "dạng bài" (chủ site: lưu riêng, can thiệp sau). Tag theme không trộn vào đó.
- **[ĐỔI HÀNH VI]** `posts` thêm `topic_id` (FK `topics`, restrict) và `visibility`
  (`public | private`, mặc định `public`).
- **[ĐỔI HÀNH VI]** `posts.slug` từ giờ là địa chỉ cố định (trước: cột có nhưng không
  ai ghi; địa chỉ tính lại mỗi lần bằng `lib/postSlug.ts:slugsFor`). Bảng mới
  `post_slugs` giữ địa chỉ cũ để chuyển hướng (chưa có code đọc).
- **[ĐỔI HÀNH VI]** `posts_module_id_fkey`: `on delete cascade` → `restrict`. Trước:
  xoá module là xoá luôn bài của nó (`backend/api/modules/[id]/index.ts:handleDelete`
  dựa vào cascade). Sau: module còn bài thì DELETE trả lỗi từ database.
- **[ĐỔI HÀNH VI]** Chính sách đọc `posts` cho anon: thêm `visibility = 'public'` và
  `topic_is_public(topic_id)` (cấp hẹp nhất thắng: nút và subject của nó đều phải
  công khai). Bài chưa gắn chủ đề vẫn đọc được.
- Series: **không làm** (chủ site 2026-10-02: ít dùng). Chuỗi bài đánh dấu bằng tag.

## Đụng dữ liệu

Dữ liệu thật đã ghi (chủ site duyệt "chép dữ liệu đi", 2026-10-02), bằng REST với service key:

- `topics`: 17 dòng. Subject: business, entrepreneur-101, writing, bean-weirdo, art,
  philo. Topic: strat-ops, product-design (business); economic, jurisprudence
  (entrepreneur-101); business-features, writing-about-writing (writing); roasting,
  sensory, biochemistry, fermentation (bean-weirdo); book-film (art). Màu và lời dẫn
  của bean-weirdo, roasting, sensory, biochemistry chép từ module tương ứng
  (`mod1790009726612`, `roasting`, `sensory`, `biochem`).
- `keywords`: 4 dòng — ops-review, portfolio-management, poc-of-anything, kinh-te-chau-a.
- `post_keywords`: 2 dòng — "5 ngày • 1 operating review" → ops-review; "Course Menu:
  Kinh tế châu Á (pt.1)" → kinh-te-chau-a.
- `posts.topic_id`: cả 31 bài (book-film 10, biochemistry 5, sensory 3, strat-ops 3,
  roasting 3, jurisprudence 2, writing-about-writing 2, philo 2, economic 1).
- `posts.slug`: 28 bài đã đăng hoặc lưu trữ, ghi đúng địa chỉ `slugsFor` đang tính
  (route words mặc định, `site_settings.data.routes` = null). Nháp và thùng rác để null.
- `posts.status`: "big plan starts from scrap notes" `published` → `archived`
  (theo chủ site), `updated_at` = lúc ghi.
- Không đụng: `module_id`, `kind`, `pinned`, `sort_order`, `modules`, `tags`.

Kiểm sau khi ghi: anon đọc được 27 bài đã đăng và bài lưu trữ qua slug; 17 nút cây.
Trình duyệt: mục lục giữ số bài từng module (Ghi 15 → 14 vì bài lưu trữ);
`/post/ghi-p261001-h` mở đúng "Koker Trilogy"; `/post/ghi-p260923` (bài lưu trữ) vẫn mở.

**Hoàn tác** (nếu cần): `update posts set topic_id = null, slug = null`; trả
"big plan…" về `published`; `delete from post_keywords; delete from keywords;`
xoá `topics` (topic trước, subject sau).

## Đụng luật

- **05** (Module, hai trục kind/visibility): visibility giờ chặn ở database cho
  bài, không chỉ lọc danh sách module. Chưa áp `modules.visibility` vào bài — khi
  tầng feature thay module thì quyền xem lấy từ cây chủ đề.

## Đề xuất luật

- Bài thuộc đúng một nút trên cây chủ đề; cây sâu tối đa hai tầng.
- Địa chỉ bài ghi một lần lúc đăng, không đổi khi đổi module, tên module hay route words.
- `SPEC.html`: thêm `topics`, `keywords`, `post_keywords`, `post_slugs`, cột
  `posts.topic_id`, `posts.visibility`; số migration lên 27.
- Migration thuộc lane kiến trúc; bản này viết ở lane khác theo yêu cầu trực tiếp
  của chủ site — lane kiến trúc nên rà lại.
