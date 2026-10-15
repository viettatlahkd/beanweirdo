# PR #66 · nhánh `claude/project-thread-rpmkb1` — Cấu hình: kéo giãn cột cây, ba khu Port / Bean blog / Practice

## [ĐỔI HÀNH VI] Cột cây kéo giãn được theo chiều ngang

Chủ site (2026-10-08): "cho mấy cái này resize kéo trái phải để cho to ra … chỉ kéo thả ở 1 mức thôi". Tôi hiểu "1 mức" là chỉ kéo ngang, không kéo dọc.

Trước: cột cây cố định 264px.
Sau: giữa cột cây và phần sửa có tay kéo (`ConfigTree.tsx: treeSplit = useSplit('cfg-tree', 264, 'left', 200, 520)`), rộng 200–520px, nhớ trong localStorage `pf-split-cfg-tree`. Ở chế độ 2 cột tay kéo cao suốt hai hàng. Một cột (dưới 860px) thì không có tay kéo.
`PortEditors.tsx: useSplit` trả thêm `size` (độ rộng hiện tại, px) để ghép vào `gridTemplateColumns`.

## [ĐỔI HÀNH VI] Ba khu có tiêu đề riêng, gập được

Chủ site hỏi sao trang Port "có mục lục, điều hướng, lưu trữ, cây chủ đề" — thật ra các mục đó thuộc Bean blog, nhưng nhãn khu cũ (`SiteLabel`, chữ nhỏ mờ) làm cả cây trông như một danh sách.

Trước: ba nhãn chữ nhỏ trên một danh sách phẳng.
Sau: `ConfigTree.tsx: Site` — tiêu đề serif to, gạch dưới, đường dẫn bên phải (`/`, `/bean/…`, practice), bấm để gập/mở (nhớ như mọi chỗ gập khác, khoá `site:port`, `site:blog`, `site:practice`), các mục bên trong thụt vào sau một vạch trái. Mỗi khu là một `<section aria-label>`; ↑↓ đi qua cả tiêu đề, ←→ gập/mở.

Bảng/endpoint đã đụng: không. Không cần SQL.

Bộ luật: `frontend/src/content/logic.ts` không có trong repo (xem ghi chú PR #65), không đối chiếu được theo `nhóm.số`.

Kiểm: `admin/components/ConfigTree.test.tsx` — "sets each site apart under its own heading, which folds". `npm test` xanh. Đã xem `cms-harness.html` trên Chromium (kéo rộng cột, gập Port).

## Đề xuất

Danh sách mục trong cây (Claude Doc "Các mục trong cây Cấu hình") đánh dấu Lưu trữ (bảng trống vì `pageCopy.archive` là null) và Hình trang (trùng) — chờ chủ site quyết, chưa đổi trong PR này.
