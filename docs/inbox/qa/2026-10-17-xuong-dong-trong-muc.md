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

- **[ĐỔI HÀNH VI]** Gõ tắt mặc định trong trình soạn: `=>` thành `→` ngay khi gõ `>` (`TYPED` / `TYPED_REPLACEMENTS` trong
  `admin/lib/liveMarkdown.ts`, một text-match transformer chỉ có `regExp`/`trigger`/`replace`: không có `importRegExp` nên chữ cũ
  đã lưu không đổi khi mở lại, không có `export` nên `→` ghi ra như chữ thường). Thêm cặp mới: thêm vào `TYPED`.
  Trình duyệt (bài Report, chặn lệnh ghi): gõ "x=" rồi ">" → "x→". Lệnh dán/chèn cả cụm một lần không đổi (Lexical chỉ chạy
  gõ tắt khi gõ từng ký tự).

- **[SỬA LỖI]** Trình soạn long-form: tiêu đề (h1–h4) bị gộp vào dải chữ liền (`FLOWING` trong `admin/lib/longformFlow.ts`
  có `h1`–`h4`). Hậu quả, tái hiện trên bài `50bb98c7-…`: (1) tiêu đề trong dải vẽ bằng kiểu chữ ô soạn, nhỏ, không có nút gập ▸;
  (2) "thu gọn" gập mục sở hữu khối đầu dải thì giấu cả dải, kéo theo các tiêu đề trong đó ("Không gian…", "Bàn đặt…" biến mất),
  trong khi trang đăng vẫn hiện đủ. Bản đăng và bản nháp đều có 12 tiêu đề giống nhau — dữ liệu không sai, chỉ cách bày ra để sửa.
- Sửa: `FLOWING = ['p', 'li']`, tiêu đề đứng riêng như trang tự vẽ. Ô sửa chữ của tiêu đề (`renderText` trong `LongformEditor`,
  `admin/screens/Editor.tsx`) dùng `LiveText` để chữ nghiêng hiện nghiêng thay vì dấu `*`; chữ một dòng, chỉ ghi khi khác chữ cũ.
  `admin.css`: ô `LiveText` trong `h1–h4` kế thừa cỡ/kiểu chữ của tiêu đề, đứng cùng dòng với nút gập.
  `onBackspaceAtStart` / `onDeleteAtEnd` không gộp đoạn vào tiêu đề kề bên (trước đây cả hai nằm chung dải nên không cần).
- Trình duyệt (bài `50bb98c7-…`): 11 tiêu đề trong khung nhìn vẽ 42/27/20px như bản đăng; "thu gọn" giữ mọi h1/h2, "mở hết" ra đủ.

## Chưa làm — thuộc lane Kiến trúc (`packages/post-renderer`)

- `Longform.tsx`, khối `li`: chữ vẽ thành `<span>` không có `white-space: pre-line`, nên `'\n'` trong mục hiện thành dấu cách trên
  trang công khai. Cần thêm `whiteSpace: 'pre-line'` vào div chữ của `li`.
- Đường `elements` (article/report/memo/bitesize): `elements/paste.ts` `markdownToBlocks` (nhánh danh sách, "một dòng sát lề mà
  không có dấu đầu dòng là đoạn văn mới") có cùng lỗi; `elements/list.tsx` `Row` cũng không vẽ `'\n'`.

- `Longform.tsx`: nút "thu gọn / đang mở hết" và mục lục nổi nằm trong `head === undefined`, trang `/p/` truyền `head` nên
  trang công khai không có chúng (từ PR #104, `f76b35a`). Trình soạn có, trang đăng không — chủ site báo là không liền mạch.

## Dữ liệu cũ

- Bài "Course Menu: Kinh tế châu Á (pt.1)" (`50bb98c7-…`, long-form) đang lưu "GĐ 1+2:" / "GĐ 3+4:" / "GĐ 5 - Trung Quốc:" là `li`,
  mỗi mục kèm một `p` ngay sau. Sửa này không đổi dữ liệu đó; cần sửa tay trong trình soạn hoặc một lần ghi dữ liệu (chưa làm).
- Khi kiểm, một lệnh PATCH thật tới `/api/posts/50bb98c7-…` lọt qua (bản nháp `post_drafts`, 2026-10-17 08:03 UTC). Đối chiếu với
  bản nháp đọc lúc 06:16 UTC: `data` giống hệt từng khối, chỉ `updated_at` đổi.
