# Trình soạn: khối ảnh đã có ảnh không còn mất vì một phím Backspace

PR: (số PR điền khi mở)    nhánh: claude/project-thread-mok7tv
Nguồn: chủ site, 2026-09-24 13:36, sau PR #54: *"có ảnh rồi cũng vẫn delete bằng backspace được"*.

## Đã làm

- [SỬA LỖI] Trước đây: bỏ trống chú thích của một khối ảnh đã có ảnh rồi bấm thêm Backspace, hoặc giữ phím, thì mất luôn cả khối và tấm ảnh.
  - Nguyên nhân: `thingKeyDown` trong `lib/flowFocus.ts` coi một khối là trống khi mọi ô chữ đều trống.
  - Ghi chú PR #54 (`2026-09-24-xoa-khoi-bang-ban-phim.md`) viết rằng khối có img/video thì không bao giờ trống. Câu đó sai: `ImageBlockEditor` vẽ ảnh bằng CSS background (`fillStyle`/`cropStyle` trong `post-renderer/src/elements/media.tsx`), không có thẻ `<img>` nào.
  - Bây giờ `ImageBlockEditor` gắn `data-has-image` lên thẻ gốc khi có `imageUrl`.
  - `thingKeyDown` tìm `img, video, [data-has-image]`. Nếu khối có ảnh thì Backspace/Delete trong ô chú thích trống chỉ chọn khối (đưa con trỏ lên tay nắm), không xoá.
- [SỬA LỖI] `Grip` trong `components/RowShell.tsx` bỏ qua phím tự lặp (`e.repeat`) khi xoá. Giữ Backspace thì dừng ở tay nắm; muốn xoá phải nhả phím rồi bấm lại.
- Khối ảnh chưa có ảnh, bảng và các khối khác không đổi so với PR #54.

## Kiểm

- `lib/flowFocus.test.ts`, 11 ca:
  - khối có ảnh với chú thích trống: Backspace không xoá, con trỏ lên tay nắm;
  - chú thích còn chữ: Backspace chỉ xoá chữ.
- Chromium với `frontend/harness.html?t=report|memo|bitesize&b=image` (biến thể `?b=image` mới thêm vào `src/harness.tsx`). Các bước:
  1. gõ chú thích;
  2. xoá hết chữ;
  3. giữ Backspace 0,7 giây: khối ảnh còn nguyên, con trỏ ở tay nắm;
  4. bấm Backspace thêm một lần: khối ảnh bị xoá, con trỏ về dòng chữ phía trên.

## Đã đụng

- Bảng, cột, endpoint: không đụng.
- Tệp: `screens/Editor.tsx` (`ImageBlockEditor`), `lib/flowFocus.ts` (`thingKeyDown`), `components/RowShell.tsx` (`Grip`), `lib/flowFocus.test.ts`, `src/harness.tsx`.

## Đề xuất luật

- Khối nào giữ nội dung không phải chữ (ảnh nền, nhúng, v.v.) thì gắn `data-has-image` hoặc dùng `img`/`video` thật. Nếu không, bàn phím coi khối đó là trống.
