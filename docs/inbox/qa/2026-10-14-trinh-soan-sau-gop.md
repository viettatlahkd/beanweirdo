# Trình soạn sau đợt gộp upstream: kiểm lại, gắn PR #55, "/" sau Shift+Enter

PR: (số PR ghi ở mô tả PR) · nhánh `claude/restore-editor-nuxwou`

## Đã kiểm

- Chủ site báo trình soạn "mất hết" sau đợt gộp PR #60/#61. Tôi so `origin/main`
  với `origin/backup/norway-main-2026-10-04`: `LiveText.tsx`, `liveMarkdown.ts`,
  `mdBlocks.ts`, `flowFocus.ts`, `liveKeys.ts` giống hệt. `Editor.tsx` và
  `RowShell.tsx` chỉ khác ở nút (PR #80) và `PostPlacement`.
- Chạy hai bản cạnh nhau trong Chromium (harness và màn `/ad-post/edit=…` với
  API giả): menu `/` và các phím tắt markdown cho cùng kết quả ở cả sáu khuôn.

## Thay đổi

1. **[SỬA LỖI]** Gắn lại commit của PR #55 (mở từ 2026-09-24, chưa từng merge):
   khối ảnh đã có ảnh, chú thích trống — Backspace lần đầu chỉ chọn khối
   (`thingKeyDown`, `data-has-image` trên `ImageBlockEditor`), tay nắm bỏ qua phím
   tự lặp (`Grip`).
2. **[ĐỔI HÀNH VI]** `/` ở dòng cuối của một đoạn, sau Shift+Enter, nay mở menu
   chèn. Trước: chỉ mở khi cả đoạn chỉ có `/lệnh`. Sau: đọc riêng dòng con trỏ
   đang đứng (`linesOf` trong `flowFocus.ts`, `followCaret` trong `Editor.tsx`);
   chọn xong thì chỉ cắt dòng `/lệnh` và dấu xuống dòng trước nó
   (`takeBlock(…, tail)` trong `LiveText.tsx`), khối mới chèn ngay sau đoạn.
   Tái hiện: gõ `abc`, Shift+Enter, `/bang`, Enter → bảng nằm sau đoạn `abc`.

## Không đổi

- `` `code` `` và `~~gạch ngang~~` vẫn hiện nguyên chữ: `SITE_TRANSFORMERS` cố ý
  bỏ chúng vì renderer chưa có cách vẽ.

Không đụng bảng, cột hay endpoint nào.
