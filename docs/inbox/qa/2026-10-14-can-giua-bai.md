# Bài và trang soạn căn giữa trên màn rộng

Nhánh `claude/center-layout-cleanup-ox7k4a` (cắt từ `main` sau PR #84) · số PR ở tiêu đề PR.

Chủ site (2026-10-14, ảnh bài "Detachment, 2011, Tony Kaye"): nội dung dồn trái, cả mảng phải trắng, dòng trích to bất thường; muốn phần nội dung nằm giữa khi màn còn chỗ trống, ở mọi bài và trang soạn.

## [SỬA LỖI] Nội dung bài dồn sát trái trên màn rộng
- Tái hiện: mở bài khuôn bitesize, report, memo, cards hoặc article ở cửa sổ 1600px. Chữ dừng ở cột 660px sát lề trái, phần còn lại trắng. Longform thì đã căn giữa từ trước (B42).
- Nguyên nhân: mỗi element chữ tự giới hạn `maxWidth: 660` và đứng sát trái (`elements/text.tsx`: `paragraph`, `quote`, `callout`); khung ngoài của các khuôn có giới hạn bề ngang nhưng không có `margin: auto`.
- Sửa:
  - `tokens.ts`: thêm `layout.reading = 760` (cột đọc chung, đúng bằng cột longform vốn có) và hàm `frame(width)` (giới hạn bề ngang + căn giữa).
  - `elements/text.tsx`: `paragraph`, `quote`, `callout` giới hạn ở `layout.reading` thay cho 660, để lấp đầy cột chứ không chừa một khe bên phải.
  - `Bitesize`: tờ giấy trắng rộng một cột đọc (+ lề ô ảnh phụ khi có ô ảnh phụ) và căn giữa. Lề phải 200px dành cho ô ảnh phụ chỉ chừa khi có ô ấy.
  - `Report` (`ReportBody`, hàm `columnWidth`): cột 760px, cộng cột ghi chú 260px khi có ghi chú, căn giữa; chữ trong dải màu đầu trang thẳng mép với cột.
  - `Cards`: dải màu, thanh chip và lưới thẻ cùng một khung 1208px (`CONTENT_W`) căn giữa.
  - `Article`: khối thân bài `layout.measure` căn giữa; chữ trong dải màu thẳng mép với nó. Tấm ảnh hero vẫn sát mép phải dải màu như cũ.
  - `Longform`: breadcrumb trong dải màu thẳng mép với cột chữ.
  - Trang soạn (`admin/screens/Editor.tsx`, hàm `Editor`): cả trang tối đa 1320px + lề, căn giữa. Không đụng gì bên trong `EditorCanvas`.

## [SỬA LỖI] Khối Tiêu đề chạy một dòng dài hết bề ngang
- Nguyên nhân: element `heading` (`elements/text.tsx`) không có giới hạn bề ngang nào, trong khi đoạn văn bị giới hạn 660px — nên một câu đặt làm Tiêu đề chạy thành một dòng 1000px+.
- Sửa: `heading` cũng giới hạn ở `layout.reading`.
- Suy luận, chưa kiểm được trên dữ liệu thật: dòng "I'm young and I'm old…" trong ảnh không có dấu ngoặc treo bên trái của khối Trích dẫn, nên nhiều khả năng nó là khối **Tiêu đề** cấp 2 (26px). Cỡ chữ Tiêu đề không đổi trong PR này.

## [ĐỔI HÀNH VI] Memo: bảng thông số xuống dưới tiêu đề
- Trước: tiêu đề và bảng thông số đứng hai cột (cột thông số 300px bên phải), thân bài 760px đứng sát trái bên dưới (`Memo`).
- Sau: mọi bề ngang đều là một cột 760px căn giữa: tiêu đề, rồi bảng thông số, rồi ảnh, rồi thân bài — như bố cục mobile vốn có (B49).
- Ảnh đầu memo cũng rộng 760px thay cho hết bề ngang.

## Đối chiếu bộ luật
- `frontend/src/content/logic.ts` không còn trong repo (CLAUDE.md vẫn trỏ tới nó), nên không đối chiếu được theo `nhóm.số`.

## Bảng, cột, endpoint
- Không đụng bảng, cột hay endpoint nào. Chỉ đổi cách vẽ.

## Kiểm tra
- `npx vitest run packages/post-renderer`, typecheck, eslint xanh.
- Chromium (vite ở máy, dữ liệu mẫu, không dùng Supabase): sáu khuôn ở 1600px và 1180px, trang soạn bitesize/report/memo ở 1600px, chụp trước/sau.

## [ĐỔI HÀNH VI] Article: dải màu chạy hết bề ngang, ảnh hero vào khung
- Chủ site duyệt ảnh trước/sau (2026-10-14): dải màu đầu bài phải chạy từ trái sang phải, tiêu đề thẳng lề cột giữa bên dưới.
- Trước: tấm ảnh hero dính mép phải trang, che phần cuối dải màu (`Article`, `data-testid="article-hero-plate"`).
- Sau: dải màu chạy hết bề ngang; ảnh hero nằm trong khung căn giữa, mép phải thẳng với cột phụ bên dưới, vẫn cao bằng dải màu. Mobile không đổi.
