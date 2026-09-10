# Dán markdown: nối nốt hai màn còn lại, và ép ô contentEditable về chữ thuần

PR: chưa mở    nhánh: spine/dan-markdown-3-man    commit: điền sau khi merge
Cắt từ: origin/main @ 2b34757
Nguồn: chủ site dán markdown vào màn Bitesize, ảnh chụp cho thấy cả một trang
hiện nguyên dấu thăng và dấu sao trong một ô.

Nối tiếp `2026-09-10-spine-dan-markdown.md` (PR #98). Ghi chú ấy có câu "Chỉ
report có. Bốn template kia soạn theo khuôn riêng, chưa nối" — **câu đó sai**,
và đây là chỗ sửa.

## [SỬA LỖI] Ba màn dùng chung một component, chỉ một màn được nối

`ReportBlockFields` được gọi ở **ba** chỗ: `BitesizeEditor`, `MemoEditor`,
`ReportEditor`. Cả ba giữ thân bài là cùng một mảng phẳng `ReportBlock[]`, cùng
`blankReportBlock`, cùng `InsertRow`. PR #98 chỉ nối `onPasteBlocks` ở
`ReportEditor`, nên hai màn kia rơi về dán thường.

Cái tôi viết trong ghi chú trước — "bốn template kia soạn theo khuôn riêng" —
đúng với cards, article, longform, nhưng **sai với bitesize và memo**. Chúng
không có khuôn riêng; chúng dùng đúng bộ máy của report. Tôi kết luận từ tên
hàm thay vì đọc chỗ gọi.

Nay luật đặt chỗ nằm ở `frontend/src/admin/lib/pasteBlocks.ts`, hàm
`withPastedBlocks(blocks, at, text)` — một bản, cho cả ba gọi.

## [ĐỔI HÀNH VI] `onPasteBlocks` là prop bắt buộc

Để nó tuỳ chọn chính là cách lỗi trên xảy ra: thêm một màn thứ tư dùng
`ReportBlockFields` mà quên nối thì không có gì báo, và triệu chứng chỉ lộ ra
khi có người dán thật. Nay thiếu nó là **không biên dịch được**.

Kèm theo, nối thêm hai ô chữ trong `ReportBlockFields` mà PR #98 bỏ sót:
`quote` và `callout`. Hàm trả `null` cho một đoạn văn đơn độc nên dán chữ
thường vào hai ô ấy không đổi gì.

## [SỬA LỖI] `InlineField` nhận nguyên HTML của trang nguồn

`InlineField` là một `span contentEditable` — ô Tiêu đề, Thân bài, Chữ trong ô
ảnh của bitesize. Dán mặc định vào `contentEditable` **nhét cả thẻ lẫn style
của trang nguồn** vào ô. Chữ trông đúng trong lúc soạn rồi mang phông và màu
của Notion ra trang, và `onBlur` đọc `innerText` nên phần rác không lộ ra ở
đâu cho tới khi trang vẽ.

Nay `onPaste` chặn lại và chèn `text/plain` bằng `document.execCommand('insertText')`.

Chưa có test cho chỗ này: jsdom không dựng `document.execCommand`, và một bài
kiểm giả lập nó chỉ chứng minh cái giả lập chạy. Cần soi mắt — xem mục Kiểm
chứng.

## Bảng, cột, endpoint

Không đụng cái nào. Không migration.

## Đối chiếu bộ luật

Không thêm luật mới so với PR #98. Đề xuất 1–8 trong ghi chú ấy vẫn nguyên;
lượt này chỉ làm cho chúng đúng ở cả ba màn thay vì một.

Bộ luật hiện tại: `node tools/spec-numbers.mjs --check` in ra **3 phần · 18
nhóm · 119 luật**.

## Kiểm chứng

- `npm test`: 112 file, **1131 test xanh**. Gồm typecheck cả ba tsconfig.
- `npm run build --prefix frontend`: xanh.
- Test mới trong `Editor.paste.test.tsx`: dán một trang markdown vào bitesize
  và vào memo, cả hai ra `['heading', 'list']` thay vì một đoạn thô.
- **Chưa mở trình duyệt xem.** Hai chỗ cần soi mắt: (1) dán từ Notion vào ô
  Tiêu đề/Thân bài của bitesize có còn mang style sang không; (2) khối dán vào
  có xuống dòng thật trên màn không.

## Nợ tôi phát hiện, chưa xử lý

**CI trên `main` đỏ, không phải do hai PR này.** `tools/spec-numbers.mjs
--check` báo `SPEC.html ghi 23 migration, thật là 26`. Cùng một lỗi ở run của
#95 (2026-09-09) và của #98 (2026-09-10) — so hai run thì thấy ngay. `npm test`
trong CI xanh. `SPEC.html` thuộc lane Tài liệu.

**Bốn template chưa nối chỗ dán:** cards, article, longform, và ô ghi chú cạnh
bài. Ba cái đầu thật sự có khuôn soạn riêng, không dùng `ReportBlockFields`,
nên nối chúng là việc riêng chứ không phải quên.

## Đề xuất luật

9. Một component được nhiều màn dùng chung thì khả năng của nó là **bắt buộc**,
   không tuỳ chọn. Prop tuỳ chọn trên một component dùng chung là một cái bẫy
   im lặng: màn quên nối vẫn chạy, vẫn xanh, và chỉ sai khi có người dùng thật.
10. Trước khi viết "màn kia có khuôn riêng" trong ghi chú bàn giao, **đọc chỗ
    gọi**, đừng suy từ tên hàm. Câu sai ấy đã đi vào một ghi chú đã nộp.
11. Mọi ô `contentEditable` phải ép cái dán vào về chữ thuần. Mặc định của
    trình duyệt là nhận cả HTML lẫn style của trang nguồn, và nó không lộ ra
    cho tới khi trang vẽ.
