# PR #65 · nhánh `claude/project-thread-rpmkb1` — gộp Quản lý trang vào Cấu hình

## [ĐỔI HÀNH VI] Một tab Cấu hình thay cho hai tab Quản lý trang và Cấu hình

Chủ site (2026-10-08): hai tab trùng nhau, cây chủ đề có ở cả ba tab (Quản lý trang, Cấu hình, Nội dung) và bấm cùng một mục thì mỗi tab mở một thứ khác, nên không biết đang tương tác với cái gì. Chủ site giữ giao diện của Cấu hình, chốt ba điều: cây bên trái chỉ để chọn, sửa ở bên phải; xem trước luôn bật, không có nút tắt; tab Nội dung chỉ còn lọc, gộp và xoá.

Trước: CMS có năm tab — Nội dung · Quản lý trang (`/ad-sitemap`) · Cấu hình (`/ad-cau-hinh`) · Cài đặt hiển thị · Tác giả. Quản lý trang mở phần sửa ngay dưới hàng vừa bấm ở cột trái.
Sau: bốn tab — Nội dung · Cấu hình (`/ad-cau-hinh`) · Cài đặt hiển thị · Tác giả.

- Màn: `admin/components/ConfigTree.tsx: ConfigTree`. Ba cột: cây (thẻ và hàng) · phần sửa · xem trước trang công khai (iframe, tải lại sau mỗi lần lưu). Hẹp hơn 1180px thì xem trước xuống dưới phần sửa; hẹp hơn 860px thì một cột.
- Cây đi theo sơ đồ site, mỗi thứ một lần: Port (Trang chủ port, Các trang port, Phần chung của port) · Bean blog (Trang chủ blog, Mục lục, Lưu trữ, Điều hướng, Cây chủ đề, Tag, Trang chọn tay, Mẫu, Hình trang) · Practice (Ghi 02).
- Luật tương tác trong `ConfigTree.tsx`:
  - bấm thẻ hay hàng chỉ mở mục đó ở bên phải (`pick`), kể cả thẻ nhóm như Cây chủ đề (mở trang nhóm, ví dụ thêm subject);
  - gập bằng mũi tên riêng (`FoldButton`);
  - kéo chỉ từ tay nắm ⋮⋮ (`Leaf`, `.cfg-grip`, hiện khi rê chuột), hàng không `draggable`;
  - khi đang kéo, cột số bài của hàng đích đổi thành "trước / sau / vào trong <tên>" (`WHERE_WORDS`);
  - sau khi thả có dòng "Đã chuyển … · Hoàn tác" (`undo`), hoàn tác trả lại cha cũ và thứ tự cũ;
  - số bên phải ghi "N bài";
  - chỉ một mục được tô (`same`);
  - ↑↓ đi giữa các hàng (`walk`), ←→ gập/mở (`foldKey`).
- Không còn ô nhập nào ở cột trái. Thêm subject, thêm mục con, thêm tag, thêm trang chọn tay, thêm trang port đều ở bên phải (`AddField`, có nút bấm rõ ràng).
- Một topic mở ra trên một chỗ: tên, quyền xem, màu, lời dẫn, "Nằm trong" (`ContentWorkspace.tsx: TopicSettings`), "Mục con", rồi "Trang" — theo mẫu nào hay cài đặt riêng (`PageSettings.tsx: NodePage`). Tag tương tự (`FlatSettings` + `NodePage`).
- Đầu phần sửa có đường dẫn ("Bean blog › Cây chủ đề › bean weirdo") và địa chỉ công khai.
- Phần sửa trang của Quản lý trang chuyển sang `admin/components/PageSettings.tsx` (đổi tên từ `PagesManager.tsx`): `PageEditor`, `NodePage`, `NavEditor`, `describePage`. Cây cũ của Quản lý trang (`PagesManager`, sửa ngay dưới hàng) bị xoá.
- Địa chỉ: `lib/routes.ts` — `CmsTab` bỏ `'tree'`; `/ad-cau-hinh`, `/ad-sitemap`, `/ad-config`, `/ad-page-content` đều mở tab `pages`, chỉ `/ad-cau-hinh` được sinh ra (`pageOfTab`). `lib/routeWords.ts: WORD_LABELS` — `adSitemap` thành "Sitemap (địa chỉ cũ)".

## [ĐỔI HÀNH VI] Tab Nội dung chỉ còn lọc, gộp và xoá

- `ContentWorkspace.tsx`: bỏ thêm subject/topic/tag, bỏ kéo thả cây, bỏ đổi tên và màu. Nút ⋯ mở `TopicRetire` / `FlatRetire`: tên (chỉ đọc), dòng "Đổi tên, màu và chỗ trong cây ở tab Cấu hình", rồi khối chuyển bài và xoá như cũ (`retireTopic`, `retireKeyword` không đổi).
- `TopicSettings` bỏ `kids`, `onRetire`, `onClose` và ô "Địa chỉ" (đầu phần sửa của Cấu hình đã có). `FlatSettings` chỉ còn đổi tên.
- `SectionHead.tsx` bỏ `add`, `big`, `meta`, `indent` — sau khi Quản lý trang và nút "+" của Nội dung đi, không còn ai dùng.

Bảng/endpoint đã đụng (chỉ gọi, không đổi): `GET /api/tags?vocab=layout`, `vocab=topics` (GET, POST, PATCH, PUT), `vocab=keywords` (GET, POST, PATCH), `GET /api/tags`, `POST` trang, quy chế và override như Quản lý trang cũ, `GET /api/portfolio`, `DELETE` trang port. Không thêm serverless function, không cần SQL.

Bộ luật: `frontend/src/content/logic.ts` mà CLAUDE.md nhắc không còn trong repo (`git ls-files` không ra), nên không đối chiếu được theo `nhóm.số`.

Kiểm: `admin/components/ConfigTree.test.tsx` (mở mặc định và xem trước, bấm chỉ chọn và cột trái không có ô nhập, thẻ nhóm mở bên phải và chỉ mũi tên gập, thêm subject và mục con, kéo chỉ từ tay nắm + nhãn chỗ thả + hoàn tác, cài đặt riêng của topic, phím mũi tên), `lib/routes.test.ts`, `RoutesPanel.test.tsx`, `Cms.liveValues.test.tsx`. `npm test` xanh. Đã xem `cms-harness.html` trên Chromium ở 1440, 1024 và 390px.

## Đề xuất

`CLAUDE.md` còn trỏ tới `frontend/src/content/logic.ts` (bộ luật đánh số) — tệp ấy không còn; lane tài liệu nên sửa câu đó hoặc khôi phục tệp.
