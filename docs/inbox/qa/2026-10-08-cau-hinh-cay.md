# PR #63 · nhánh `claude/project-thread-rpmkb1` — tab Cấu hình dạng cây ở `/ad-cau-hinh`

## [ĐỔI HÀNH VI] Thêm tab thứ năm "Cấu hình" vào Content management

Chủ site hỏi lại màn cấu hình cũ của fork (bấm mục ở cây bên trái, sửa chi tiết bên phải). Màn đó là tab `Cấu hình` ở `/ad-config` trước PR #61 (`screens/Cms.tsx` trên `backup/norway-main-2026-10-04`: `BoxIndex`, `CONFIG_BOXES`, `Section`). PR #61 đã xoá nó.

Tôi dựng lại bố cục đó trong một tệp mới, `admin/components/ConfigTree.tsx: ConfigTree`, theo dữ liệu hiện tại:

| Mục cũ (`CONFIG_BOXES`) | Mục mới | Bên phải vẽ gì |
|---|---|---|
| Trang chủ | Trang chủ | `pageCopy.landing` của `Cms.tsx` |
| Cây module (tạo, lồng, kéo thả) | Cây chủ đề (subject › topic, gập từng subject) | `TopicSettings` mượn từ `ContentWorkspace.tsx` |
| Trang mục lục | Trang mục lục | `pageCopy.index` |
| Tag | Tag | `FlatSettings` mượn từ `ContentWorkspace.tsx` (chỉ đổi tên) |
| Trang Ghi chép | Trang Ghi chép | `pageCopy.notes` |
| — | Hình trang (cây module theo `parent_id`, gập từng nhánh) | `moduleFields` của `Cms.tsx` |

- Cây module cũ không quay lại nguyên dạng: từ #61 trang công khai dựng từ `topics`, module chỉ còn là "hình" mà một trang mượn (`data/useModules.tsx: buildPages`, `presentation.module`). Nên ở đây module chỉ sửa được, không tạo, không xoá, không kéo lồng.
- Xoá hoặc gộp topic/tag không có ở tab này: `TopicSettings` và `FlatSettings` nhận `onRetire` tuỳ chọn, vắng thì không vẽ khối xoá. Xoá vẫn ở tab Nội dung, nơi thấy được bài sẽ bị chuyển.
- Địa chỉ: thêm từ `adTree: 'cau-hinh'` (`lib/routeWords.ts: RouteWords, DEFAULT_WORDS, WORD_LABELS, MUST_DIFFER`; `RoutesPanel.tsx: BLOCKS`), `CmsTab` thêm `'tree'` (`lib/routes.ts: adminPages, cmsTabs, pageOfTab`). `/ad-config` vẫn mở Quản lý trang như sau #61.
- Thanh tab của CMS xuống dòng khi hẹp (`Cms.tsx`, `flexWrap`) — năm tab không vừa bề ngang điện thoại.
- `cmsHarness.tsx` trả thêm `vocab=topics` và `vocab=keywords`, mặc định mở tab mới.

Bảng/endpoint đã đụng (chỉ gọi, không đổi): `GET/PATCH /api/tags?vocab=topics`, `GET/PATCH /api/tags?vocab=keywords`, `PATCH /api/modules/:id`, `PATCH /api/site`. Không thêm serverless function, không cần SQL.

Kiểm: `admin/components/ConfigTree.test.tsx` (bấm từng loại mục, lưu topic, gập nhánh, không có nút xoá), `lib/routes.test.ts` (`/ad-cau-hinh` ↔ `tab: 'tree'`). `npm test` xanh.

## Đề xuất

Tab này trùng một phần với Quản lý trang (chữ cố định, hình trang) và Nội dung (cài đặt topic, tag). Chủ site định gộp nó vào vài trang hiện có ở bước sau; khi đó một trong hai bản trùng nên bị xoá.
