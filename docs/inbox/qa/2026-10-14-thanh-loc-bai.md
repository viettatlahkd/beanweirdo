# Thanh lọc bài ở giữa màn Nội dung

Nhánh `claude/content-search-bar-bmjhmd` (cắt từ `main` sau PR #81) · số PR ở tiêu đề PR.

Chủ site (2026-10-14): muốn lọc bài theo mọi metadata (tag, tác giả, tên bài, chủ đề và chủ đề cha), thanh lọc ra giữa và to như thanh tìm kiếm Google.

## [ĐỔI HÀNH VI] Thanh lọc thay ô "Tìm bài"
- Trước: ô `Tìm bài` nhỏ ở góc phải bảng bài, chỉ khớp `en`/`vi`; bộ lọc bên trái mỗi nhóm giữ một giá trị, hiện thành chip trên hàng đếm bài.
- Sau: `PostSearch` (`frontend/src/admin/components/PostSearch.tsx`) nằm giữa, trên cả hai cột, cao 50px, bo tròn.
  - Gõ chữ: lọc ngay theo tên bài, mô tả, tên chủ đề **và mọi chủ đề cha**, tên tag, tên tác giả, template, trạng thái, ngày (`haystack` trong `ContentWorkspace`). Không phân biệt hoa thường, dấu (`fold`). Nhiều từ: bài phải chứa đủ các từ.
  - Gợi ý thả xuống theo chữ đang gõ: chủ đề (kèm "trong …" là đường cha), tag, tác giả, template, trạng thái, mỗi dòng có số bài. `#` chỉ gợi ý tag, `@` chỉ gợi ý tác giả. Chọn gợi ý (chuột, hoặc mũi tên + Enter) thành chip lọc chính xác. Backspace ở ô trống bỏ chip cuối, Esc đóng gợi ý rồi xoá chữ, nút × xoá hết.
  - Chip cùng loại thì **hoặc** (chủ đề A hoặc B); khác loại thì **và** (chủ đề A và tag X) — `kindsOn` trong `ContentWorkspace`.
  - Lọc theo chủ đề cha gồm cả bài ở chủ đề con (`inTopic`, như trước).
- Cột trái và các pill trong bảng giờ thêm/bỏ chip trong cùng thanh này (`toggle`, `add`); bấm hai mục cùng nhóm thì giữ cả hai thay vì mục sau thay mục trước. Hàng chip cũ trên bảng đã xoá.
- Lọc ở máy khách trên danh sách đã tải (`listPosts('all')` không phân trang).

## [ĐỔI HÀNH VI] Danh sách bài mang tác giả
- `GET /api/posts` thêm `authors: string[]` (id tác giả theo `position`) cho mỗi bài, đọc thêm một lần bảng `post_authors` song song với `post_keywords` (`byPost` trong `backend/api/posts/index.ts`). `PostSummary.authors` trong `frontend/src/admin/lib/apiClient.ts`.
- Màn Nội dung gọi thêm `listAuthors()` (`/api/tags?vocab=authors`) để có tên.

## Bảng, cột, endpoint
- `post_authors.post_id, author_id, position` (đọc thêm). `post_keywords` (đọc, như cũ).
- `GET /api/posts` (thêm trường `authors`), `GET /api/tags?vocab=authors` (đọc).

## Kiểm tra
- `npm test` xanh. Xem tay trên `frontend/cms-harness.html?tab=posts`: gợi ý, chip, đồng bộ với cột trái. Chưa xem trên site thật (sau cổng đăng nhập).
