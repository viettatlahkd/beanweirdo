# Cấu hình: một khuôn chi tiết chung, đủ thêm / sửa / xoá

Nhánh `claude/project-thread-oa1vgt` · PR mở ngày 2026-10-13 (số PR ghi ở tiêu đề PR). Bước 1 của hai bước; bước 2 (gộp `topics` và `portfolio_pages` vào một bảng có cột `site`) là PR sau.

## [ĐỔI HÀNH VI] Mọi màn bên phải của Cấu hình vẽ bằng một khuôn
- Trước: mỗi loại mục tự bày (`ConfigTree.tsx` `switch (picked.kind)` gọi `TopicSettings`/`FlatSettings` của `ContentWorkspace.tsx`, `Builder`, `ContentTab`, `AddField`), ô có viền, chỗ thêm và chỗ xoá mỗi màn một nơi.
- Sau: `admin/components/Detail.tsx` — `DetailHead` (đường dẫn, tên, link "xem trang", trạng thái, nút ⋮), `Section`, `Row` (nhãn trái, giá trị phải, kẻ mảnh), `Choice` (lựa chọn bằng chữ gạch chân), `LineInput`, `ItemList` (danh sách đánh số, dòng cuối "+ Thêm …" mở một dòng nhập và nút Lưu). `DETAIL_CSS` (gắn ở `.cfg-detail`) bỏ viền mọi ô nhập bên trong, kể cả của editor cũ.
- Màn nhóm (Mục lục blog, Mục lục port, Tag, Trang chọn tay, Phần chung) liệt kê mục con của nó và có "+ Thêm …". Mục lục port trước chỉ có ba nút, nay thêm trang bằng tên + chọn mẫu bibi / bibe / trống (`createFromPreset(key, title, …)`, slug sinh từ tên bằng `toSlug` trong `PortEditors.tsx`). Trang chọn tay thêm bằng tên (trước: gõ địa chỉ), id = `toSlug(tên)`.
- Tên trường đổi cho hai site đọc giống nhau: "Quyền xem" → "Trạng thái"; checkbox "hiện ở thanh bên"/"hiện ở trang chủ blog" (`NavFlags`) → "Hiện trên menu"/"Hiện ở trang chủ" (hiện · ẩn); "Bảng màu" của trang port → "Giao diện"; "Hình trang" trong trang blog → mục "Giao diện".

## [ĐỔI HÀNH VI] Xoá chỉ ở nút ⋮ của từng mục
- Chủ đề và tag: xoá (kèm chuyển bài sang mục khác, gộp tag) chuyển từ tab Nội dung sang ⋮ của mục trong Cấu hình. Logic chuyển từ `ContentWorkspace.tsx` (`retireTopic`, `retireKeyword`, `forward`) sang `admin/lib/retire.ts`, không đổi cách làm; còn Hoàn tác. Nội dung bỏ cột phải và nút ⋯ trên từng dòng chủ đề/tag.
- Chủ đề còn mục con: ⋮ › Xoá… báo phải chuyển mục con trước (trước ở Nội dung cũng vậy).
- Trang chọn tay: trước nút "xoá trang" tự ẩn khi trang còn alias hoặc mượn module; sau dòng Xoá vẫn hiện, mờ, kèm lý do (`pageDeleteBlocker` trong `PageSettings.tsx`).
- Trang port: "xoá trang" chuyển từ giữa form `Builder` lên ⋮.
- Trang hệ thống (Trang chủ blog, Trang chủ port, About, Practice), phần chung, hình trang, màn nhóm: ⋮ có dòng Xoá mờ kèm lý do.

## [ĐỔI HÀNH VI] Trang port có hai công tắc như subject blog
- `portFlags` trong `ConfigTree.tsx`: "Hiện trên menu" ghi cờ `hidden` của link `page:<id>` trong `site_settings.data.portfolio.header.links`; "Hiện ở trang chủ" thêm/bỏ trang khỏi `site_settings.data.portfolio.home.features`. Chỉ trang đã đăng.
- Trang chủ port bỏ ô chọn "+ Thêm trang" vào Trang giới thiệu (`ContentTab`); thay bằng công tắc trên từng trang. Nút × trên thẻ vẫn còn.

## Dọn code chết (không đổi hành vi)
- `Builder`: chế độ màn chia đôi riêng, `onBack`, `onDelete`, `StatusSelect` (chỉ Cấu hình dùng `Builder`, luôn có `previewSlot`).
- `ContentTab`: chế độ vẽ mọi phần một cột (`only` nay bắt buộc) và tiêu đề phần riêng (`head`).
- `ConfigTree.tsx`: `AddField`. `ContentWorkspace.tsx`: `TopicSettings`, `FlatSettings`, `TopicRetire`, `FlatRetire`, `Confirm`, `Field`, `Head`, `NameInput`.

## Bảng, cột, endpoint
- Không đổi bảng, cột hay migration.
- Endpoint gọi từ Cấu hình mới so với trước: `listPosts('all')` (`GET /api/posts`), `deleteTopic`, `deleteKeyword`, `updatePost`, `saveOverride` — đều đã có, trước gọi từ Nội dung. `deletePage`, `updatePage`, `PATCH /api/site` như cũ.

## Kiểm
- `ConfigTree.test.tsx`: sửa hai bài theo khuôn mới (thêm subject qua "+ Thêm subject" rồi Lưu; công tắc "Hiện trên menu"), thêm bốn bài (xoá chủ đề có chuyển bài, từ chối xoá khi còn mục con, Xoá mờ có lý do ở trang hệ thống, thêm trang port có tên + mẫu).
- Đã xem bằng `cms-harness.html` trong Chromium: Mục lục blog, chủ đề, panel xoá, Mục lục port với dòng thêm, trang port với ⋮ mở, Trang chủ port.

## Đề xuất (ý kiến)
- Bước 2: một bảng `nodes` (cột `site`), chủ site đã đồng ý hướng này ngày 2026-10-13.
