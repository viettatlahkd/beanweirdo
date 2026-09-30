# Đậm và nghiêng: thừa dấu sao, và đậm tự nghiêng theo

- **PR:** #36
- **Nhánh:** `claude/project-thread-7yatkf`
- **Lane:** QA hot-fix
- **Ngày:** 2026-09-24

Chủ site báo hai lỗi, xem chung ở bài "5 ngày 1 ops review":
1. hiện thừa `**` khi chữ vừa đậm vừa nghiêng (khi đăng thì thừa, trong màn
   soạn thì không);
2. cứ tô đậm là tự nghiêng theo.

Phiên này không đọc được bài ấy (database và `*.vercel.app` đều bị chặn), nên
không biết nó thuộc khuôn nào. Ba chỗ dưới đây đều cho ra đúng triệu chứng đã
báo, và đều đã sửa.

---

## [SỬA LỖI] Long-form đọc ngược ký hiệu của mặt soạn

**Trước:** `packages/post-renderer/src/longformText.ts` → `runsToText` viết đậm
là `*x*` và nghiêng là `_x_`. Mặt soạn (`frontend/src/admin/lib/liveMarkdown.ts`
→ `SITE_TRANSFORMERS`) đọc `*x*` là **nghiêng** và `_x_` là gạch chân. Hệ quả:
- chữ đậm mở ra trong mặt soạn thành chữ nghiêng — lỗi 2;
- `Cmd+B` ghi ra `**x**`, `textToRuns` cũ cắt thành `*` + đậm + `*` — hiện
  nguyên dấu sao trên trang — lỗi 1.

**Sau:** long-form dùng đúng ký hiệu của mặt soạn: `*nghiêng*`, `**đậm**`,
`***cả hai***`. `_x_` và `__x__` vẫn đọc được (nghiêng, đậm) cho chữ dán vào.
Cách **lưu** không đổi — vẫn là `w`/`s` trong `posts.body` — nên bài đã đăng
không cần chuyển dữ liệu.

Tái hiện: `frontend/src/admin/lib/longformMarks.test.ts` đưa khối long-form qua
Lexical thật (`createEditor` + `$convertFromMarkdownString(SITE_TRANSFORMERS)`)
rồi hỏi định dạng từng nút chữ. Trên `main` cũ: "đậm" ra `bold:false,
italic:true`.

## [SỬA LỖI] Nghiêng lồng trong đậm để lọt dấu sao

**Trước:** `packages/post-renderer/src/elements/runs.ts` → `textToRuns` cắt dòng
bằng regex `\*\*[^*\n]+\*\*`, không cho dấu sao nào nằm trong cặp. Lexical ghi
một chữ nghiêng giữa câu đậm thành `**đậm *cả hai* đậm**`, nên câu ấy vỡ thành
dấu sao lẻ. Áp cho mọi khuôn đọc chữ qua `Inline`/`Runs` (report, memo,
bitesize, element text/list).

**Sau:** file mới `packages/post-renderer/src/elements/stars.ts` —
`parseStars` đọc dấu sao bằng ngăn xếp nên lồng được, `writeStars` mở một dấu
một lần qua nhiều đoạn (không ra `*****`) và đẩy khoảng trắng ra ngoài dấu.
`runs.ts` và `longformText.ts` cùng dùng nó. Link, địa chỉ trần, `_số đo_`
vẫn đọc như cũ, trên phần chữ `parseStars` trả về.

Một khác biệt nhỏ: đoạn đậm có khoảng trắng ở đuôi (`"đậm "`) đi qua mặt soạn
một lần thì khoảng trắng ấy thành chữ thường. Trông không khác.

## [SỬA LỖI] Thân bài article vẽ nguyên chuỗi

**Trước:** `packages/post-renderer/src/Article.tsx` → `Article` vẽ `s.p` thẳng
ra, nên mọi `**x**`, `*x*` gõ trong mặt soạn hiện nguyên dấu trên trang đăng —
khớp với "khi đăng mới thừa, khi dàn không thừa".

**Sau:** `s.p` đi qua `Inline`, màu `inherit` để giữ màu thân bài (các khuôn
khác tô màu nhấn bằng `palette.ink`; article thì không, để không đổi hình
dạng bài đã đăng hơn mức cần).

---

## Đã đụng

- Bảng/cột/endpoint: **không** — chỉ đổi cách đọc/viết chữ phía client.
- `frontend/src/harness.tsx`: thêm đậm/nghiêng lồng vào mẫu long-form và
  article để trang thử bày được ca này.
- Test cũ đổi kỳ vọng: `longformBlocks.test.ts` (`thường **đậm** và
  *nghiêng*`), `Longform.test.tsx` (`phần **đậm**`) — hai test ấy khoá chính
  ký hiệu cũ gây lỗi.

## Kiểm

- `npm test` xanh (1456 test), `vite build` xanh.
- Chromium qua `harness.html?t=longform|article`: mặt soạn dựng
  `STRONG.awc-live-bold` cho đậm, `STRONG.awc-live-bold.awc-live-em` cho cả
  hai, `EM.awc-live-em` cho nghiêng; rời ô hai lần, không hiện dấu sao nào.
  Chưa nhìn trang đăng thật — cần chủ site mở bài "5 ngày 1 ops review".

## Đề xuất

Còn một bộ đọc markdown thứ ba không chung `stars.ts`: `markdownToBlocks` /
`bodyToMarkdown` của post-renderer chỉ tách khối, không đọc dấu trong dòng, nên
không bị ảnh hưởng. Nếu sau này có thêm khuôn tự đọc dấu sao, nên đi qua
`parseStars` thay vì viết regex riêng.
