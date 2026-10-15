# Dấu `*` và `>` đã lưu thành chữ trong bài long-form

- **PR:** #39
- **Nhánh:** `claude/project-thread-7yatkf`
- **Lane:** QA hot-fix
- **Ngày:** 2026-09-24
- Nối tiếp PR #36 (`2026-09-24-dam-nghieng-tach-roi.md`).

Chủ site gửi ảnh bài "5 ngày 1 ops review" sau khi #36 lên: trang đăng vẫn hiện
`*` quanh chữ đậm và `> ` ở đầu dòng, trong khi mặt soạn vẽ đúng.

## [SỬA LỖI] Trang đăng đọc lại dấu đã bị lưu thành chữ

**Nguyên nhân:** trước #36, `longformText.ts` → `textToRuns` cắt `**x**` của mặt
soạn thành run `"*"`, run đậm `"x"`, run `"*"` — và bài được **lưu** như thế
vào `posts.body`. #36 sửa đường đọc/ghi từ nay, nhưng không đụng dữ liệu đã
lưu. Mặt soạn ghép runs lại thành `***x***` nên vẽ đúng; `Longform.tsx` vẽ
thẳng từ runs nên hiện nguyên dấu.

**Sau:** `packages/post-renderer/src/longformBlocks.ts` → `normalizeBlocks` (cửa
chung của trang đăng và CMS) đọc lại runs của `p`, `li`, `h1`–`h4` qua
`runsToText` → `textToRuns` (`readMarks`), **chỉ khi** kết quả ăn mất dấu thật;
dòng như `FD*` giữ nguyên runs gốc. Không chạy migration: dữ liệu được sửa lúc
đọc, và ghi đúng lần sau chủ site lưu bài.

Theo cách mặt soạn đang vẽ, `*` + đậm + `*` đọc ra là **đậm và nghiêng**.

## [ĐỔI HÀNH VI] Long-form có trích dẫn

**Trước:** long-form không có trích dẫn. Gõ `> ` trong mặt soạn thì Lexical vẽ
trích dẫn, nhưng `longformFlow.ts` → `lineToBlock` lưu thành đoạn thường có chữ
`> ` ở đầu. Tệ hơn, Lexical cho trích dẫn nuốt dòng ngay sau nó, nên lần lưu kế
tiếp biến cả đoạn văn phía dưới thành `> đoạn`.

**Sau:**
- `types.ts` → `LongformBlock.quote?: boolean`, một cờ trên `p`.
- `longformFlow.ts`: `> x` ↔ `{ k: 'p', quote: true }`; `runToMarkdown` chèn một
  dòng trống sau khối trích dẫn cuối cùng để Lexical không nuốt đoạn sau.
- `longformBlocks.ts` → `liftQuote`: đoạn đã lưu mở đầu bằng `> ` thành trích dẫn.
- `Longform.tsx`: đoạn `quote` có gạch lề trái 2px màu `palette.accent`, cỡ chữ
  giữ như đoạn thường.

## Đã đụng

Cột `posts.body` (chỉ đọc, dạng JSON của long-form thêm khoá `quote`). Không
endpoint, không migration.

## Kiểm

`npm test` xanh. Test dựng đúng dữ liệu trong ảnh: `longformBlocks.test.ts`
("dấu bị lưu thành chữ"), `Longform.test.tsx`, `longformMarks.test.ts` (trích dẫn
qua Lexical thật). Chưa thấy trang thật — cần chủ site mở lại bài.
