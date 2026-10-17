# Shift+Enter trong mục danh sách (long-form) thành đoạn văn riêng

Nhánh `fix/xuong-dong-trong-muc`, cắt từ `origin/main`. PR #122.

## Thay đổi

- **[SỬA LỖI]** Bài long-form: trong một mục gạch đầu dòng, Shift+Enter rồi gõ tiếp → lưu xong phần sau thành đoạn văn riêng
  dưới danh sách (cách dòng lớn), trình soạn dựng lại y như thế. Nguyên nhân: Lexical ghi phần sau dấu ngắt dòng của mục ra dòng
  kế, sát lề, không có dòng trống (`$listExport`); `markdownToRun` (`frontend/src/admin/lib/longformFlow.ts`) coi mọi dòng là một
  khối nên dòng đó thành `{ k: 'p' }`. Hiện ra từ `69f8b06` (2026-09-24, `runToMarkdown` nối li→p bằng dòng trống), trước đó Lexical
  gộp ngược đoạn vào mục khi đọc lại nên trông như còn trong mục (dữ liệu vẫn là li + p).
- Sửa: `markdownToRun` gộp một dòng chữ thường sát lề nằm **ngay sau** dòng mục (không có dòng trống giữa) vào mục đó, nối bằng
  `'\n'` trong runs. Một khối mới sau danh sách luôn cách một dòng trống (Lexical và `runToMarkdown` đều vậy) nên vẫn là đoạn.
- Test: `longformMarks.test.ts` thêm một vòng qua Lexical thật: mục có `'\n'` + đoạn sau → giữ nguyên.

- **[ĐỔI HÀNH VI]** Gõ tắt mặc định trong trình soạn: `->` thành `→` ngay khi gõ `>` (`TYPED` / `TYPED_REPLACEMENTS` trong
  `admin/lib/liveMarkdown.ts`, một text-match transformer chỉ có `regExp`/`trigger`/`replace`: không có `importRegExp` nên chữ cũ
  đã lưu không đổi khi mở lại, không có `export` nên `→` ghi ra như chữ thường). Thêm cặp mới: thêm vào `TYPED`.
  Trình duyệt (bài Report, chặn lệnh ghi): gõ "x-" rồi ">" → "x→". Lệnh dán/chèn cả cụm một lần không đổi (Lexical chỉ chạy
  gõ tắt khi gõ từng ký tự).

- **[SỬA LỖI]** Trình soạn long-form: tiêu đề (h1–h4) bị gộp vào dải chữ liền (`FLOWING` trong `admin/lib/longformFlow.ts`
  có `h1`–`h4`). Hậu quả, tái hiện trên bài `50bb98c7-…`: (1) tiêu đề trong dải vẽ bằng kiểu chữ ô soạn, nhỏ, không có nút gập ▸;
  (2) "thu gọn" gập mục sở hữu khối đầu dải thì giấu cả dải, kéo theo các tiêu đề trong đó ("Không gian…", "Bàn đặt…" biến mất),
  trong khi trang đăng vẫn hiện đủ. Bản đăng và bản nháp đều có 12 tiêu đề giống nhau — dữ liệu không sai, chỉ cách bày ra để sửa.
- Sửa: `FLOWING = ['p', 'li']`, tiêu đề đứng riêng như trang tự vẽ. Ô sửa chữ của tiêu đề (`renderText` trong `LongformEditor`,
  `admin/screens/Editor.tsx`) dùng `LiveText` để chữ nghiêng hiện nghiêng thay vì dấu `*`; chữ một dòng, chỉ ghi khi khác chữ cũ.
  `admin.css`: ô `LiveText` trong `h1–h4` kế thừa cỡ/kiểu chữ của tiêu đề, đứng cùng dòng với nút gập.
  `onBackspaceAtStart` / `onDeleteAtEnd` không gộp đoạn vào tiêu đề kề bên (trước đây cả hai nằm chung dải nên không cần).
- **[SỬA LỖI]** Ô tiêu đề (`LiveText`) đọc chữ như markdown, nên gõ `### ` ở đầu thành dấu `#` lưu vào chữ: bản nháp bài
  `50bb98c7-…` (2026-10-17 08:28 UTC, phiên của chủ site) có khối h3 thứ 81 lưu `"### Đánh giá tổng quan theo  các tiêu chí…"`.
  Sửa: `#`…`####` + dấu cách ở đầu tiêu đề đặt cấp h1–h4 và bị bỏ khỏi chữ. Mở rồi bấm ra khỏi tiêu đề đang lưu sai sẽ ghi lại
  bản sạch. Trình duyệt, chặn lệnh ghi: gõ `### ` ở đầu một h2 → khối thành `h3`, chữ không có `#`; gõ `###` giữa câu → giữ là chữ.
- Trình duyệt, chặn lệnh ghi: bấm vào tiêu đề rồi bấm ra → không có lệnh ghi; gõ "x-" rồi ">" trong tiêu đề → "x→", hoàn tác về chữ cũ rồi bấm ra → không có lệnh ghi.
- Trình duyệt (bài `50bb98c7-…`): 11 tiêu đề trong khung nhìn vẽ 42/27/20px như bản đăng; "thu gọn" giữ mọi h1/h2, "mở hết" ra đủ.

- **[ĐỔI HÀNH VI]** `admin/AdminShell.tsx`: nút « ở đầu sidebar thu sidebar thành dải 40px có nút » để mở lại (`FoldButton`,
  `RAIL_W`); trạng thái nhớ trong `localStorage` `beanweirdo.admin.side`. Điện thoại không có nút (sidebar xếp trên nội dung).
  Trình duyệt: co → tải lại vẫn co → » mở lại.

## Lane Kiến trúc (`packages/post-renderer`) — chủ site cho phép sửa (2026-10-17)

- **[ĐỔI HÀNH VI]** `Longform.tsx`: nút "thu gọn / đang mở hết" nay hiện cả khi app truyền `head`, tức trên trang công khai
  `/p/…` và màn Xem trước. Trước: cả nút gập lẫn mục lục nổi nằm trong `head === undefined` (từ PR #104, `f76b35a`), nên chỉ
  trình soạn có. Mục lục nổi vẫn ẩn khi có `head` như cũ (trang có dải mục lục riêng). Trình duyệt, `/p/course-menu-kinh-te-chau-a-pt-1`:
  12 tiêu đề → "thu gọn" còn 10 (h1/h2), thân bài ẩn → "xem tất cả" lại 12; mobile 375px nút nằm góc dưới phải.
- **[ĐỔI HÀNH VI]** `Longform.tsx` `prepare`: gập theo mọi cấp tiêu đề, không chỉ h1/h2. Trước: chỉ h1 (trừ tên bài) và h2 gập
  được; h3/h4 bị coi như thân bài nên "thu gọn" ẩn chúng. Nay mỗi khối mang `owners` (các tiêu đề bao nó, ngoài vào trong), h1–h4
  đều có nút ▸/▾, gập chỉ ẩn thân bài, **không bao giờ ẩn tiêu đề**; mở một tiêu đề nằm dưới mục đang gập thì mở luôn mục trên.
  Bài `50bb98c7-…`, trang `/p/…` và trình soạn: "thu gọn" còn đúng 11 tiêu đề (4 h1 + 5 h2 + 2 h3), khớp danh sách "Trong bài
  này" của trang.
- **[SỬA LỖI]** `Longform.tsx`, khối `li`: div chữ thêm `whiteSpace: 'pre-line'`, `'\n'` trong mục (Shift+Enter) hiện thành
  xuống dòng thay vì dấu cách.
- **[SỬA LỖI]** Đường `elements` (article/report/memo/bitesize): `elements/paste.ts` `markdownToBlocks` không còn dừng danh sách ở
  một dòng sát lề không dấu đầu dòng; dòng ấy, ngay dưới một mục, là phần sau dấu xuống dòng của mục (đọc như CommonMark "lazy
  continuation"). `pastedToItems` nhận `{ lazy: true }` chỉ từ đường này; dán chữ thường vào một dòng danh sách vẫn mỗi dòng một mục.
  Đoạn văn sau danh sách luôn cách một dòng trống (Lexical và `bodyToMarkdown` đều vậy) nên vẫn là đoạn.
  `elements/list.tsx` `Row`: dòng chữ chính thêm `whiteSpace: 'pre-line'`.
  Test: `elements/write.test.ts` "dòng sau Shift+Enter trong một mục vẫn ở trong mục đó" (đọc, rồi đi một vòng ghi–đọc giữ nguyên).

## Dữ liệu cũ

- Bài "Course Menu: Kinh tế châu Á (pt.1)" (`50bb98c7-…`, long-form) đang lưu "GĐ 1+2:" / "GĐ 3+4:" / "GĐ 5 - Trung Quốc:" là `li`,
  mỗi mục kèm một `p` ngay sau. Sửa này không đổi dữ liệu đó; cần sửa tay trong trình soạn hoặc một lần ghi dữ liệu (chưa làm).
- Khi kiểm, một lệnh PATCH thật tới `/api/posts/50bb98c7-…` lọt qua (bản nháp `post_drafts`, 2026-10-17 08:03 UTC). Đối chiếu với
  bản nháp đọc lúc 06:16 UTC: `data` giống hệt từng khối, chỉ `updated_at` đổi.
