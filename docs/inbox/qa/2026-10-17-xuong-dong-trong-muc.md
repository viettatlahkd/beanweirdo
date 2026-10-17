# Shift+Enter trong mục danh sách (long-form) thành đoạn văn riêng

Nhánh `fix/xuong-dong-trong-muc`, cắt từ `origin/main`. Chưa có PR.

## Thay đổi

- **[SỬA LỖI]** Bài long-form: trong một mục gạch đầu dòng, Shift+Enter rồi gõ tiếp → lưu xong phần sau thành đoạn văn riêng
  dưới danh sách (cách dòng lớn), trình soạn dựng lại y như thế. Nguyên nhân: Lexical ghi phần sau dấu ngắt dòng của mục ra dòng
  kế, sát lề, không có dòng trống (`$listExport`); `markdownToRun` (`frontend/src/admin/lib/longformFlow.ts`) coi mọi dòng là một
  khối nên dòng đó thành `{ k: 'p' }`. Hiện ra từ `69f8b06` (2026-09-24, `runToMarkdown` nối li→p bằng dòng trống), trước đó Lexical
  gộp ngược đoạn vào mục khi đọc lại nên trông như còn trong mục (dữ liệu vẫn là li + p).
- Sửa: `markdownToRun` gộp một dòng chữ thường sát lề nằm **ngay sau** dòng mục (không có dòng trống giữa) vào mục đó, nối bằng
  `'\n'` trong runs. Một khối mới sau danh sách luôn cách một dòng trống (Lexical và `runToMarkdown` đều vậy) nên vẫn là đoạn.
- Test: `longformMarks.test.ts` thêm một vòng qua Lexical thật: mục có `'\n'` + đoạn sau → giữ nguyên.

## Chưa làm — thuộc lane Kiến trúc (`packages/post-renderer`)

- `Longform.tsx`, khối `li`: chữ vẽ thành `<span>` không có `white-space: pre-line`, nên `'\n'` trong mục hiện thành dấu cách trên
  trang công khai. Cần thêm `whiteSpace: 'pre-line'` vào div chữ của `li`.
- Đường `elements` (article/report/memo/bitesize): `elements/paste.ts` `markdownToBlocks` (nhánh danh sách, "một dòng sát lề mà
  không có dấu đầu dòng là đoạn văn mới") có cùng lỗi; `elements/list.tsx` `Row` cũng không vẽ `'\n'`.

## Dữ liệu cũ

- Bài "Course Menu: Kinh tế châu Á (pt.1)" (`50bb98c7-…`, long-form) đang lưu "GĐ 1+2:" / "GĐ 3+4:" / "GĐ 5 - Trung Quốc:" là `li`,
  mỗi mục kèm một `p` ngay sau. Sửa này không đổi dữ liệu đó; cần sửa tay trong trình soạn hoặc một lần ghi dữ liệu (chưa làm).
