# Trình soạn: xoá khối ảnh, khối bảng bằng bàn phím

PR: #54    nhánh: claude/project-thread-mok7tv
Nguồn: chủ site, 2026-09-24: "không delete được khối ảnh, bảng … keyboard".

## Đã sửa

- [SỬA LỖI] Khối ảnh chưa có ảnh không xoá được bằng Backspace/Delete. `flowFocus.ts:thingKeyDown` coi ô chọn tệp (`input[type=file]`) là ô "có chữ", nên khối không bao giờ trống. Giờ ô chọn tệp không được tính. Khối nào đã có `img` hoặc `video` thì vẫn không bao giờ bị coi là trống, nên xoá hết chú thích không kéo tấm ảnh đi theo. Bằng chứng: `flowFocus.test.ts`, hai ca "khối ảnh …".
- [SỬA LỖI] Article không xoá được khối (bảng, ảnh…) khi đó là thứ duy nhất trong bài. `ArticleEditor` gọi `removeAt(…, true)`, và cờ ấy giữ lại phần cuối cùng. Giờ cờ chỉ giữ phần chữ, còn khối thì xoá được. Bài rỗng vẫn có dải chữ để gõ.
- [SỬA LỖI] Xoá khối bằng tay nắm làm con trỏ rơi về `body`. `flowFocus.ts:removeThing` đưa con trỏ về cuối ô ngay trên khối, hoặc về ô đầu nếu khối đứng đầu bài. Report hỏi trước khi xoá khối có ghi chú, nên khi hộp hỏi mở ra thì hàm này không dời con trỏ.
- [ĐỔI HÀNH VI] Trước đây một khối còn chữ (ví dụ bảng đầy ô) chỉ xoá được khi người dùng Tab ngược lên tay nắm. Giờ `Esc` ở bất cứ đâu trong khối sẽ chọn cả khối: con trỏ lên tay nắm, quanh khối hiện một khung sáng (`[data-flow="thing"]:has(.awc-grip:focus-visible)` trong `EditorStyles`). Từ đó `Delete` xoá khối, mũi tên dời khối, `Enter` hoặc `Esc` quay vào trong khối (`RowShell.tsx:Grip`).
- [ĐỔI HÀNH VI] `Delete`/`Backspace` khi con trỏ đứng trên một nút của khối (nút "tải ảnh lên", "đặt link") sẽ xoá khối. Trong ô chữ còn chữ thì hai phím này vẫn chỉ xoá chữ.

## Đã đụng

Không đụng bảng, cột hay endpoint nào. Tệp đã sửa: `lib/flowFocus.ts`, `components/RowShell.tsx`, `screens/Editor.tsx` (`ArticleEditor`, `EditorStyles`), `Editor.contract.test.tsx` (thêm Esc → Delete cho mọi khối ở sáu khuôn), `flowFocus.test.ts`.
