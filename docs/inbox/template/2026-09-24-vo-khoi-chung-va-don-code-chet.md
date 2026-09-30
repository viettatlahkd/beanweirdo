# Trình soạn: một vỏ khối cho mọi khuôn, test luật cho mọi khối [+], dọn code chết

PR: #52    nhánh: claude/project-thread-mok7tv
Nguồn: chủ site, 2026-09-24, sau PR #49: chốt các thao tác bàn phím thành khung chung để khối thêm vào [+] sau này vẫn giữ luật, và xoá hết code sai hay không còn dùng.

## Đã làm

- [SỬA LỖI] Luật bàn phím của khối nằm ở hai bản sao: `ReportThing` và `BlockGrip` trong `Editor.tsx`, cùng phần vỏ và tay nắm viết lại trong `RowShell`. Tôi gộp chúng thành `FlowThing` và `Grip` trong `components/RowShell.tsx`. Hành vi không đổi: đã đo lại trong Chromium và qua `Editor.contract.test.tsx`.
- [SỬA LỖI] Tôi thêm `Editor.contract.test.tsx`. Nó đọc `menuNames('', 'things')` và chạy mọi mục ở sáu khuôn (report, memo, bitesize, cards, article, longform). Mỗi khối phải:
  - nằm trong `[data-flow="thing"]` và dưới `[data-flow-root]`;
  - có chỗ cho bàn phím đứng;
  - mở được dòng chữ phía sau bằng Cmd+Enter.

  Tôi thử bỏ `data-flow` khỏi vỏ thì 40 ca đỏ.
- [SỬA LỖI] Tôi xoá những đường không còn chạy từ PR #49:
  - `blockKeys.ts:enterBlock`, `backspaceBlock`, `neighbour`, `blockKey`. Chỗ gọi đã chỉ đưa phím cách vào `blockKey`; nay gọi thẳng `spaceBlock`.
  - `onArrowOut` của `EditableField` và `ReportBlockFields`. Mọi chỗ gọi đều truyền `() => false`, nên hàm `arrows` không bao giờ làm gì.
- [SỬA LỖI] Tôi xoá những thứ không ai dùng:
  - Tệp: `frontend/src/content/designSystem.ts` và `backend/scripts/check-migrations.mjs`.
  - CSS: `.admin-tpl-card` trong `admin.css`; `.awc-list-edit/-flag/-line/-tools` và `.awc-note-slot` trong `EditorStyles`.
  - Hàm và hằng: `readingModules` và `sidebarModules` (Sidebar nay gọi `indexModules`), `POST_KINDS`, `resetSupabaseClientForTests`, `getTemplate`, `updateTemplate`, `forgetTemplates`, `followWithParagraph`, `borderWidth`, `iconSize`, `glyph`, `IconEdit`, `IconCopy`, `hoursTheme`, `notesTheme`, `chart`, `topNames`, `byKind`, `todayLogs`, `maxMins`, `samePath`, `AsideLine`.
  - Nhánh đếm `logic.ts` trong `tools/spec-numbers.mjs`.
- Khoảng 140 export chỉ dùng trong chính tệp của nó nay thôi export. Các element trong `post-renderer/src/elements/*` gọi `registerElement(...)` mà không gán vào hằng nào.
- `knip` vào `npm run lint`. Tệp, export hay phụ thuộc không ai dùng sẽ làm CI đỏ. Script chạy tay được khai trong `knip.json`.

## Đã đụng

- Bảng, cột, endpoint: không đụng. Không đọc thêm cột nào.
- Tệp khung: `components/RowShell.tsx`, `screens/Editor.tsx`, `lib/blockKeys.ts`, `package.json` (thêm devDependency `knip`), `knip.json`, `CLAUDE.md` (hai đoạn về knip và `FlowThing`).

## Còn lại

- `tools/spec-numbers.mjs --check` vẫn báo SPEC.html ghi 27 migration trong khi thật ra là 31. Lỗi này có từ trước. Đó là tệp của lane tài liệu, tôi không sửa.

## Đề xuất luật

- Khối mới trong kho element phải vẽ bên trong `FlowThing`. Nếu thiếu thì `Editor.contract.test.tsx` đỏ, và đó là tín hiệu đúng.
