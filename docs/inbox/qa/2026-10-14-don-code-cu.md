# Dọn code cũ và tài liệu lỗi thời

PR #86 · nhánh `claude/center-layout-cleanup-ox7k4a`, mở sau
khi PR #85 (căn giữa bài) đã merge.

"Chết" ở đây xác định bằng grep và knip, không bằng màn hình. Không đụng
`ConfigTree.tsx`, tab Tác giả, `docs/inbox/**`, migration.

## Code

- [SỬA LỖI] Route cũ của màn Portfolio riêng: tôi bỏ `Where.templateId`,
  `Where.portTab`, kiểu `PortTab`, nhánh `portfolio` trong `parsePath`/`toPath`
  (`lib/routes.ts`), các màn `portfolio`, `cards`, `report`, `template` và
  `goPortfolio` trong `Screen`/`Nav` (`lib/nav.tsx`, `App.tsx`, `Sidebar.tsx`,
  `crumbs.ts`, `area.ts`). Không gì còn dẫn tới chúng. Địa chỉ cũ
  `/ad-portfolio`, `/ad-port-content`, `/ad-port-design` vẫn đọc được và mở
  Cấu hình / Cài đặt hiển thị như trước (`adminPages`, `cmsTabs`).
- [SỬA LỖI] API module không ai gọi: bỏ `POST` và `PUT /api/modules`
  (`handleCreate`, `handleReorder`), `DELETE /api/modules/:id` (`handleDelete`,
  `explainStillHeld`), `newModuleRow` (`backend/lib/modules.ts`), cùng test của
  chúng và mock `PUT` trong `cmsHarness.tsx`. `GET` và `PATCH` giữ nguyên.
  Frontend không gọi ba verb kia ở đâu (`admin/lib/apiClient.ts` chỉ có
  `listModules`, `updateModule`).
- [SỬA LỖI] Export chỉ test dùng, hoặc không ai dùng: `hasChildren`,
  `possibleParents` (`contentTree.ts`), `slugAfterStatus`, `findBySlug`
  (`postSlug.ts`), `pageSlots` (`modulePageImages.ts`), `imageCount`
  (`moduleForm.ts`), `QUOTE_CELL` (`content/notes.ts`), `EMPTY_NOTES`
  (`post-renderer/notes.ts`), kiểu `Template` (`post-renderer/types.ts`), và
  15 re-export thừa trong `post-renderer/src/index.ts`. `MAX_INDENT`,
  `liveFieldNotes` thôi export (chỉ dùng trong file).
- [SỬA LỖI] Luật CSS chết `.awc-hero-drop:hover` trong `admin/screens/Editor.tsx`
  (không phần tử nào mang class đó).
- [SỬA LỖI] `Cms.tsx: patchModule` nay gọi `forgetModules()` sau khi ghi.
  Trước đó `forgetModules` chỉ còn test gọi, nên sửa tên/màu module trong CMS
  xong thì thanh bên và trang chủ vẫn vẽ bản cũ tới khi tải lại trang (xem chú
  thích trên `forgetModules` trong `admin/lib/lists.ts`).

## Tài liệu (chủ site chọn "Xoá hết" ngày 2026-10-14)

- Xoá `docs/SPEC.html` và `tools/spec-numbers.mjs` (chỉ đếm số cho SPEC).
  Bộ kiểm số hiệu migration trùng nằm trong file đó, nên giờ không còn gì chặn
  cặp trùng mới (ghi ở D23 trong `docs/spine/SO-BAN-GIAO.md`).
- Xoá 23 ghi chú `docs/spine/{cms,data,design,docs,tree}-*.md`. Giữ
  `TRINH-SOAN.md` (`admin/lib/editHistory.ts` trích nó) và `DOI-SOAT-DESIGN.md`
  (đi cùng `tools/design-audit.mjs`, vẫn chạy với prototype v4).
- `SO-BAN-GIAO.md`: bỏ mục A (luật chờ vào `logic.ts`, file đã xoá
  2026-09-21) và mục B (SPEC lỗi thời). Mục C, D, E giữ nguyên.
- Xoá `docs/superpowers/` (kế hoạch tháng 8, tả một admin wizard không còn) và
  `backend/scripts/verify-schema.mjs` + script `test` của `backend/package.json`
  (cần Postgres local qua Docker, không ai chạy).
- Xoá prototype `Coffee Study Blog.dc.html`, `v2`, `v3`, `MERGE-NOTES.md`,
  `HANDOFF.md`, `chats/`, `content/`. Giữ `v4`, `support.js`, `longform.js`
  (v4 nạp hai file này; `Bitesize.tsx` và `design-audit.mjs` trích v4).
- Viết lại `README.md`, `backend/README.md` (cái cũ nói "backend chưa bắt đầu",
  "chưa có admin UI", bảng `templates` kiểu cũ). Sửa phần "Trang thử" trong
  `tools/e2e/README.md`: `harness.html` nay nằm sẵn trong repo.
- `CLAUDE.md`: bỏ mọi chỗ trỏ tới `logic.ts` và `SPEC.html` (bảng lane, luật bàn
  giao số 6 cũ, Đọc thêm); sửa dòng dev server cho khớp `.claude/launch.json`
  (chỉ dựng vite).

## Bảng, cột, endpoint đã đụng

Không bảng hay cột nào. Endpoint: bỏ `POST /api/modules`, `PUT /api/modules`,
`DELETE /api/modules/:id`.

## Còn lại, chưa làm

- `SO-BAN-GIAO.md` D16: trang Archive không còn lối vào nhưng code vẫn còn.
  Tôi không xoá vì `/ad-archive` vẫn là một địa chỉ đọc được.
